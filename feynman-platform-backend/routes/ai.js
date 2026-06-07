// routes/ai.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { polishText, evaluateFeynmanAttempt, generateQuestion, gradeAnswer } = require('../controllers/deepseekAiController');
const { answerWithRAG } = require('../controllers/baiduAiController');
const { queryVectorStore, rebuildVectorStore } = require('../services/vectorStoreService');
const KnowledgePoint = require('../models/KnowledgePoint');
const fs = require('fs');
const path = require('path');

// AI文本润色（暂时移除认证用于测试）
router.post('/polish', polishText);

// AI评教功能
router.post('/evaluate', evaluateFeynmanAttempt);

// AI出题功能（暂时移除认证用于测试）
router.post('/generate-question', generateQuestion);

// AI答题评分功能（暂时移除认证用于测试）
router.post('/grade-answer', gradeAnswer);
router.post('/rag-qa', auth, answerWithRAG);

router.get('/debug-retrieve', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user?.id;
    const q = String(req.query.q || '');
    const ks = await queryVectorStore(q, 4, userId);
    const out = ks.map((d, i) => ({
      i,
      id: d.metadata?.knowledgePointId || null,
      text: d.pageContent,
    }));
    res.json({ count: out.length, items: out });
  } catch (e) {
    res.status(500).json({ msg: 'debug retrieve failed', detail: e?.message || e });
  }
});

router.get('/debug-store', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user?.id;
    const kpCount = await KnowledgePoint.countDocuments({ user: userId });
    const storeDir = path.join(__dirname, '../vector_store', String(userId));
    const argsPath = path.join(storeDir, 'args.json');
    const exists = fs.existsSync(argsPath);
    const args = exists ? JSON.parse(await fs.promises.readFile(argsPath, 'utf-8')) : null;

    res.json({
      userId,
      knowledgePointCount: kpCount,
      vectorStore: {
        path: storeDir,
        exists,
        numDimensions: args?.numDimensions || null,
        space: args?.space || null,
      },
      embeddings: {
        provider: process.env.EMBEDDINGS_PROVIDER || null,
        ollamaBaseUrl: process.env.OLLAMA_BASE_URL || null,
        ollamaModel: process.env.OLLAMA_EMBED_MODEL || null,
        enableLocalEmbeddings: process.env.ENABLE_LOCAL_EMBEDDINGS || null,
        localEmbedDim: process.env.LOCAL_EMBED_DIM || null,
      }
    });
  } catch (e) {
    res.status(500).json({ msg: 'debug store failed', detail: e?.message || e });
  }
});

router.post('/reindex', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user?.id;
    const kps = await KnowledgePoint.find({ user: userId }).sort({ updatedAt: -1 });
    const result = await rebuildVectorStore(kps, userId);
    if (!result?.ok) {
      return res.status(500).json({ msg: 'reindex failed', detail: result?.reason || 'unknown' });
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ msg: 'reindex failed', detail: e?.message || e });
  }
});

router.get('/knowledge-map', auth, async (req, res) => {
  try {
    const kps = await KnowledgePoint.find({ user: req.user.id || req.user.user?.id });
    if (!kps || kps.length === 0) return res.json({ nodes: [], links: [] });
    const nodes = kps.map(kp => ({
      id: kp._id.toString(),
      name: kp.title,
      value: (kp.content || '').slice(0, 100),
      symbolSize: 20 + Math.min(((kp.content || '').length) / 50, 30),
      status: kp.status || 'not_started',
      reviewList: !!kp.reviewList,
      createdAt: kp.createdAt,
    }));
    const links = [];
    const titleMap = new Map(kps.map(kp => [kp.title, kp._id.toString()]));
    for (const source of kps) {
      for (const targetTitle of titleMap.keys()) {
        if (source.title === targetTitle) continue;
        if ((source.content || '').includes(targetTitle)) {
          links.push({ source: source._id.toString(), target: titleMap.get(targetTitle), label: { show: true, formatter: '引用' } });
        }
      }
    }

    const tagToIds = new Map();
    for (const kp of kps) {
      const tags = Array.isArray(kp.tags) ? kp.tags : [];
      for (const tag of tags) {
        const key = String(tag || '').trim();
        if (!key) continue;
        if (!tagToIds.has(key)) tagToIds.set(key, []);
        tagToIds.get(key).push(kp._id.toString());
      }
    }

    const linkKeySet = new Set(links.map(l => `${l.source}\u0000${l.target}\u0000${l.label?.formatter || ''}`));
    for (const [tag, ids] of tagToIds.entries()) {
      const uniqIds = Array.from(new Set(ids));
      if (uniqIds.length < 2) continue;
      const hub = uniqIds[0];
      for (let i = 1; i < uniqIds.length; i++) {
        const target = uniqIds[i];
        const key = `${hub}\u0000${target}\u0000${tag}`;
        if (linkKeySet.has(key)) continue;
        linkKeySet.add(key);
        links.push({ source: hub, target, label: { show: true, formatter: tag } });
      }
    }
    res.json({ nodes, links });
  } catch (e) {
    res.status(500).json({ msg: 'knowledge map failed', detail: e?.message || e });
  }
});

module.exports = router;
