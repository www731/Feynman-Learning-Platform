// routes/knowledgePoints.js
const express = require('express');
const router = express.Router();
const KnowledgePoint = require('../models/KnowledgePoint');
const auth = require('../middleware/auth');
const { addKnowledgePointToStore } = require('../services/vectorStoreService');

// 创建知识点
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const kp = new KnowledgePoint({
      title,
      content,
      tags: Array.isArray(tags) ? tags : [],
      user: req.user.id || req.user.user?.id, // 兼容不同payload结构
    });
    const saved = await kp.save();
    // 异步向量化（不阻塞响应）
    try { addKnowledgePointToStore(saved); } catch (e) { console.warn('向量化提交失败:', e.message); }
    res.json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// 获取当前用户全部知识点
router.get('/', auth, async (req, res) => {
  try {
    const kps = await KnowledgePoint.find({ user: req.user.id || req.user.user?.id }).sort({ createdAt: -1 });
    res.json(kps);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// 获取复习列表 - 必须在 /:id 路由之前
router.get('/review-list', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user?.id;
    const reviewKps = await KnowledgePoint.find({ 
      user: userId, 
      reviewList: true 
    }).sort({ updatedAt: -1 });
    
    res.json(reviewKps);
  } catch (err) {
    console.error('Get review list error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// 获取单个知识点
router.get('/:id', auth, async (req, res) => {
  try {
    const kp = await KnowledgePoint.findById(req.params.id);
    if (!kp) return res.status(404).json({ msg: 'Knowledge point not found' });
    if (kp.user.toString() !== (req.user.id || req.user.user?.id)) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    res.json(kp);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// 更新知识点
router.put('/:id', auth, async (req, res) => {
  try {
    let kp = await KnowledgePoint.findById(req.params.id);
    if (!kp) return res.status(404).json({ msg: 'Knowledge point not found' });
    if (kp.user.toString() !== (req.user.id || req.user.user?.id)) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const { title, content, status, reviewList, tags } = req.body;
    const beforeContent = kp.content;
    const beforeTitle = kp.title;
    const beforeTags = Array.isArray(kp.tags) ? kp.tags.join('\u0000') : '';

    const updateSet = {};
    if (title !== undefined) updateSet.title = title;
    if (content !== undefined) updateSet.content = content;
    if (status !== undefined) updateSet.status = status;
    if (reviewList !== undefined) updateSet.reviewList = reviewList;
    if (tags !== undefined) updateSet.tags = Array.isArray(tags) ? tags : [];

    if (Object.keys(updateSet).length === 0) {
      return res.json(kp);
    }

    kp = await KnowledgePoint.findByIdAndUpdate(
      req.params.id,
      { $set: updateSet },
      { new: true, runValidators: true }
    );
    // 当内容发生变化时，触发重新向量化
    const afterTitle = kp.title;
    const afterTags = Array.isArray(kp.tags) ? kp.tags.join('\u0000') : '';
    const contentChanged = typeof content === 'string' && content !== beforeContent;
    const titleChanged = typeof title === 'string' && beforeTitle !== afterTitle;
    const tagsChanged = tags !== undefined && beforeTags !== afterTags;
    if (contentChanged || titleChanged || tagsChanged) {
      try { addKnowledgePointToStore(kp); } catch (e) { console.warn('向量化提交失败:', e.message); }
    }
    res.json(kp);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// 删除知识点
router.delete('/:id', auth, async (req, res) => {
  try {
    const kp = await KnowledgePoint.findById(req.params.id);
    if (!kp) return res.status(404).json({ msg: 'Knowledge point not found' });
    if (kp.user.toString() !== (req.user.id || req.user.user?.id)) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await kp.deleteOne();
    res.json({ msg: 'Knowledge point removed' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// 根据测评结果更新知识点状态
router.post('/update-status', auth, async (req, res) => {
  try {
    const { knowledgeContent, isCorrect, score, questionDifficulty, question, userAnswer, correctAnswer, explanation, type } = req.body;
    
    console.log('收到知识点状态更新请求:', { knowledgeContent: (knowledgeContent||'').slice(0,60), isCorrect, score, questionDifficulty });
    
    if (!knowledgeContent) {
      return res.status(400).json({ msg: 'Knowledge content is required' });
    }

    const userId = (req.user && (req.user.id || req.user.user?.id)) ? (req.user.id || req.user.user?.id) : null;
    if (!userId) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    const safeScore = typeof score === 'number' ? score : Number(score) || 0;
    const normalizeDifficulty = (d) => {
      if (!d) return undefined;
      const s = String(d).toLowerCase();
      if (['easy','medium','hard'].includes(s)) return s;
      if (['简单','易','容易'].includes(d)) return 'easy';
      if (['中等','适中'].includes(d)) return 'medium';
      if (['困难','难'].includes(d)) return 'hard';
      return undefined;
    };
    const mapped = normalizeDifficulty(questionDifficulty);
    let finalDifficulty = mapped;
    if (!finalDifficulty) {
      if (safeScore <= 20) finalDifficulty = 'hard';
      else if (safeScore <= 40) finalDifficulty = 'medium';
      else finalDifficulty = 'easy';
    }

    const shouldCreateQuestionKP = !isCorrect && question && userAnswer;
    let kp;
    if (shouldCreateQuestionKP) {
      const q = String(question);
      const t = q.slice(0, 80) + (q.length > 80 ? '...' : '');
      kp = await KnowledgePoint.findOne({
        user: userId,
        title: t,
      });

      if (!kp) {
        kp = new KnowledgePoint({
          title: t,
          content: String(userAnswer),
          tags: [q],
          user: userId,
          status: 'in_progress',
          reviewList: true,
          difficulty: finalDifficulty,
        });
      } else {
        kp.title = t;
        kp.content = String(userAnswer);
        kp.tags = [q];
      }
    } else {
      kp = await KnowledgePoint.findOne({
        user: userId,
        content: knowledgeContent,
      });

      if (!kp) {
        console.log('创建新知识点:', knowledgeContent.substring(0, 50));
        kp = new KnowledgePoint({
          title: knowledgeContent.substring(0, 50) + (knowledgeContent.length > 50 ? '...' : ''),
          content: knowledgeContent,
          user: userId,
          status: 'not_started',
          reviewList: false
        });
      } else {
        console.log('找到现有知识点:', kp.title);
      }
    }

    // 根据测评结果更新状态和难度（分数低于100均加入复习）
    if (isCorrect && safeScore === 100) {
      kp.status = 'mastered';
      kp.reviewList = false;
      kp.difficulty = 'easy';
    } else {
      kp.status = 'in_progress';
      kp.reviewList = true;
      kp.difficulty = finalDifficulty;
      if (question && userAnswer) {
        kp.wrongQuestions = kp.wrongQuestions || [];
        kp.wrongQuestions.push({
          question,
          userAnswer,
          correctAnswer,
          explanation,
          type,
          difficulty: finalDifficulty,
        });
      }
    }

    try {
      const savedKp = await kp.save();
      try { addKnowledgePointToStore(savedKp); } catch (e) { console.warn('向量化提交失败:', e.message); }
      return res.json({
        success: true,
        knowledgePoint: savedKp,
        message: isCorrect ? '知识点状态已更新' : '知识点已加入复习列表'
      });
    } catch (saveErr) {
      console.error('保存知识点失败:', saveErr?.message || saveErr);
      return res.status(500).json({ msg: 'Server Error', error: saveErr?.message || saveErr });
    }

  } catch (err) {
    console.error('Update knowledge point status error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// 从复习列表中移除知识点
router.put('/:id/remove-from-review', auth, async (req, res) => {
  try {
    const kp = await KnowledgePoint.findById(req.params.id);
    if (!kp) return res.status(404).json({ msg: 'Knowledge point not found' });
    if (kp.user.toString() !== (req.user.id || req.user.user?.id)) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    kp.reviewList = false;
    if (kp.status === 'not_started') {
      kp.status = 'in_progress';
    }
    
    const updatedKp = await kp.save();
    res.json({
      success: true,
      knowledgePoint: updatedKp,
      message: '已从复习列表中移除'
    });
  } catch (err) {
    console.error('Remove from review list error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

module.exports = router;
