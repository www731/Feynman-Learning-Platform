// controllers/baiduAiController.js
const axios = require('axios');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence } = require('@langchain/core/runnables');
const { getRetriever } = require('../services/vectorStoreService');

// DeepSeek API配置
const DEEPSEEK_API_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

// 请求头配置
function getDeepSeekHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
  };
}

// AI文本润色
exports.polishText = async (req, res) => {
  const { text } = req.body || {};

  if (!text) {
    return res.status(400).json({ msg: 'Text is required for polishing.' });
  }

  // 检查API Key是否配置
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('错误：请在.env文件中配置DEEPSEEK_API_KEY');
    return res.status(500).json({ msg: 'DeepSeek API Key not configured.' });
  }

  try {
    const headers = getDeepSeekHeaders();
    
    const response = await axios.post(`${DEEPSEEK_API_BASE_URL}/chat/completions`, {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的文本润色助手，请将用户提供的文本进行润色，使其更加流畅、专业和清晰，但不要改变原意。请直接返回润色后的文本内容，不要包含任何额外的解释或JSON格式。'
        },
        {
          role: 'user',
          content: `请润色以下文本：${text}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }, { headers });

    const polishedText = response.data.choices[0].message.content;
    
    return res.json({
      polishedText: polishedText
    });

  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error('Error calling DeepSeek API for polishing:', detail);
    return res.status(500).json({ msg: 'Server error during text polishing.' });
  }
};

// AI润色与评价
exports.evaluateFeynmanAttempt = async (req, res) => {
  const { originalContent, transcribedText } = req.body || {};

  if (!originalContent || !transcribedText) {
    return res.status(400).json({ msg: 'Original content and transcribed text are required.' });
  }

  // 检查API Key是否配置
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('错误：请在.env文件中配置DEEPSEEK_API_KEY');
    return res.status(500).json({ msg: 'DeepSeek API Key not configured.' });
  }

  try {
    const headers = getDeepSeekHeaders();
    
    const response = await axios.post(`${DEEPSEEK_API_BASE_URL}/chat/completions`, {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的教育评价助手，请根据提供的知识点和用户回答，给出评价、打分和建议。
          
请按照以下JSON格式返回结果：
{
  "polishedText": "润色后的用户回答",
  "evaluation": "对用户回答的综合评价",
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["待改进点1", "待改进点2"],
  "score": 85
}`
        },
        {
          role: 'user',
          content: `知识点：${originalContent}\n\n用户回答：${transcribedText}\n\n请根据知识点评价用户回答，并按照要求的JSON格式返回结果。`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    }, { headers });

    // 尝试解析JSON响应
    let result;
    try {
      const content = response.data.choices[0].message.content;
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError.message);
      console.log('原始响应内容:', response.data.choices[0].message.content);
      return res.status(500).json({
        msg: 'Failed to parse AI response',
        polishedText: undefined,
        evaluation: undefined,
        strengths: [],
        weaknesses: [],
        score: undefined
      });
    }

    return res.json({
      polishedText: result.polishedText,
      evaluation: result.evaluation,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      score: result.score
    });

  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error('Error calling DeepSeek API:', detail);
    return res.status(500).json({ msg: 'Server error during AI evaluation.' });
  }
};

// AI出题功能
exports.generateQuestion = async (req, res) => {
  const { knowledgePointContent, difficulty, type = 'single-choice' } = req.body;

  // 添加调试日志
  console.log('收到出题请求:', {
    knowledgePointContent,
    difficulty,
    type,
    fullBody: req.body
  });

  if (!knowledgePointContent || !difficulty) {
    return res.status(400).json({ msg: 'Knowledge point content and difficulty are required.' });
  }

  // 验证题目类型
  if (!['single-choice', 'short-answer'].includes(type)) {
    return res.status(400).json({ msg: 'Question type must be either "single-choice" or "short-answer".' });
  }

  // 检查API Key是否配置
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('错误：请在.env文件中配置DEEPSEEK_API_KEY');
    return res.status(500).json({ msg: 'DeepSeek API Key not configured.' });
  }

  try {
    const headers = getDeepSeekHeaders();

    let prompt;
    
    if (type === 'single-choice') {
      prompt = `你是一个专业的计算机科学出题专家。请根据以下提供的知识点内容和指定的难度，生成一个相关的单项选择题。

【知识点内容】:
"""
${knowledgePointContent}
"""

【指定难度】: ${difficulty}

请严格按照以下JSON格式返回题目，不要包含任何额外的解释或文字，确保所有字段都存在。
{
  "type": "single-choice",
  "difficulty": "${difficulty}",
  "question": "这里是题干",
  "options": {
    "A": "选项A的内容",
    "B": "选项B的内容", 
    "C": "选项C的内容",
    "D": "选项D的内容"
  },
  "answer": "C",
  "explanation": "这里是对正确答案的简短解释"
}`;
    } else {
      prompt = `你是一个专业的计算机科学出题专家。请根据以下提供的知识点内容和指定的难度，生成一个相关的简答题。

【知识点内容】:
"""
${knowledgePointContent}
"""

【指定难度】: ${difficulty}

请严格按照以下JSON格式返回题目，不要包含任何额外的解释或文字，确保所有字段都存在。
{
  "type": "short-answer",
  "difficulty": "${difficulty}",
  "question": "这里是题干，要求学生用自己的话回答",
  "answer_key_points": [
    "答案要点1：具体的知识点或概念",
    "答案要点2：另一个重要的知识点",
    "答案要点3：补充说明或注意事项"
  ]
}`;
    }
    
    const response = await axios.post(`${DEEPSEEK_API_BASE_URL}/chat/completions`, {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的出题专家，请严格按照要求的JSON格式返回题目，不要包含任何额外内容。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    }, { headers });
    
    // 增加健壮性：尝试解析JSON，如果失败则请求重试或返回错误
    try {
      const content = response.data.choices[0].message.content;
      const questionData = JSON.parse(content);
      
      // 根据题目类型验证返回的数据结构
      if (type === 'single-choice') {
        if (!questionData.question || !questionData.options || !questionData.answer || !questionData.explanation) {
          throw new Error('AI返回的选择题格式不完整');
        }
      } else if (type === 'short-answer') {
        if (!questionData.question || !questionData.answer_key_points || !Array.isArray(questionData.answer_key_points)) {
          throw new Error('AI返回的简答题格式不完整');
        }
      }
      
      res.json(questionData);
    } catch (parseError) {
      console.error("AI返回格式错误:", response.data.choices[0].message.content);
      console.error("解析错误:", parseError.message);
      res.status(500).json({ msg: "AI返回格式错误，请稍后重试" });
    }

  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error('Error calling DeepSeek API for question generation:', detail);
    res.status(500).json({ msg: 'Server error during question generation.' });
  }
};

// AI答题评分功能
exports.gradeAnswer = async (req, res) => {
  const { question, userAnswer, correctAnswer, explanation, answerKeyPoints, type = 'single-choice' } = req.body;

  if (!question || !userAnswer) {
    return res.status(400).json({ msg: 'Question and user answer are required.' });
  }

  // 根据题目类型验证必需参数
  if (type === 'single-choice' && !correctAnswer) {
    return res.status(400).json({ msg: 'Correct answer is required for single-choice questions.' });
  }

  if (type === 'short-answer' && (!answerKeyPoints || !Array.isArray(answerKeyPoints))) {
    return res.status(400).json({ msg: 'Answer key points are required for short-answer questions.' });
  }

  // 检查API Key是否配置
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('错误：请在.env文件中配置DEEPSEEK_API_KEY');
    return res.status(500).json({ msg: 'DeepSeek API Key not configured.' });
  }

  try {
    const headers = getDeepSeekHeaders();

    let prompt;

    if (type === 'single-choice') {
      prompt = `你是一个专业的教育评价助手。请根据以下信息对学生的答题进行评分和分析：

【题目】: ${question}
【正确答案】: ${correctAnswer}
【学生答案】: ${userAnswer}
【题目解释】: ${explanation || '无'}

请严格按照以下JSON格式返回评分结果：
{
  "isCorrect": true,
  "score": 100,
  "feedback": "回答正确！你很好地理解了这个概念。",
  "analysis": "详细的答题分析，包括学生答案的优缺点",
  "suggestions": ["建议1", "建议2"]
}

评分标准：
- 答案完全正确：100分
- 答案基本正确但有小错误：70-90分  
- 答案部分正确：40-60分
- 答案错误但有相关理解：20-30分
- 答案完全错误：0-10分`;
    } else {
      prompt = `你是一个客观的计算机科学阅卷老师。请根据以下题目、答案要点和学生的回答，判断学生的回答是否正确，并给出解释。

【题目】: ${question}

【答案要点】: 
${answerKeyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}

【学生的回答】: ${userAnswer}

请严格按照以下JSON格式返回你的评判结果，不要包含任何额外的解释或文字。
{
  "isCorrect": true,
  "explanation": "这里是你的评判理由，比如：回答基本正确，覆盖了主要区别。或：回答混淆了State和Props的概念。",
  "score": 85,
  "feedback": "详细的反馈，包括学生答案的优缺点",
  "coveredPoints": ["学生回答中涉及到的答案要点"],
  "missedPoints": ["学生遗漏的重要答案要点"]
}

评分标准：
- 完全覆盖所有要点且表达准确：90-100分
- 覆盖大部分要点且基本准确：70-89分
- 覆盖部分要点或有明显错误：50-69分
- 仅涉及少数要点或理解有误：30-49分
- 完全偏离主题或错误：0-29分`;
    }
    
    const response = await axios.post(`${DEEPSEEK_API_BASE_URL}/chat/completions`, {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的教育评价助手，请严格按照要求的JSON格式返回评分结果。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    }, { headers });
    
    try {
      const content = response.data.choices[0].message.content;
      const gradeResult = JSON.parse(content);
      
      // 根据题目类型验证返回的数据结构
      if (type === 'single-choice') {
        if (typeof gradeResult.isCorrect !== 'boolean' || 
            typeof gradeResult.score !== 'number' || 
            !gradeResult.feedback || 
            !gradeResult.analysis) {
          throw new Error('AI返回的选择题评分格式不完整');
        }
      } else if (type === 'short-answer') {
        if (typeof gradeResult.isCorrect !== 'boolean' || 
            typeof gradeResult.score !== 'number' || 
            !gradeResult.explanation || 
            !gradeResult.feedback) {
          throw new Error('AI返回的简答题评分格式不完整');
        }
      }
      
      res.json(gradeResult);
    } catch (parseError) {
      console.error("AI返回格式错误:", response.data.choices[0].message.content);
      console.error("解析错误:", parseError.message);
      res.status(500).json({ msg: "AI返回格式错误，请稍后重试" });
    }

  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error('Error calling DeepSeek API for answer grading:', detail);
    res.status(500).json({ msg: 'Server error during answer grading.' });
  }
};
exports.answerWithRAG = async (req, res) => {
  const { question } = req.body || {};
  if (!question) {
    return res.status(400).json({ msg: 'Question is required.' });
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(500).json({ msg: 'DeepSeek API Key not configured.' });
  }
  try {
    const userId = req.user?.id || req.user?.user?.id;
    const retriever = await getRetriever(4, userId);
    if (!retriever) {
      return res.json({ answer: '当前未启用向量检索。' });
    }
    // 检索并带上来源
    const docs = await retriever.invoke(question);
    const contexts = docs.map(d => d.pageContent);
    const citations = docs.map(d => ({
      title: d.metadata?.knowledgePointTitle || d.metadata?.knowledgePointId || '未知知识点',
      snippet: d.pageContent.slice(0, 120) + (d.pageContent.length > 120 ? '…' : '')
    }));
    console.log('RAG 检索结果：', { count: docs.length, citations });
    if (!contexts.length) {
      return res.json({ answer: '知识库中暂无相关内容。', citations: [] });
    }
    const formatDocs = (docs) => docs.map((doc, i) => `--- 文档 ${i + 1} ---\n${doc.pageContent}`).join('\n\n');
    const promptTemplate = PromptTemplate.fromTemplate(
      `<role>你是一个知识库问答机器人。</role>\n` +
      `<instruction>请根据下面提供的<context>信息来回答用户的<question>。如果上下文中没有相关信息，就明确说你不知道，不要编造答案。请让回答简洁明了。</instruction>\n\n` +
      `<context>\n{context}\n</context>\n\n` +
      `<question>\n{question}\n</question>\n\n` +
      `<answer>你的回答是：</answer>`
    );
    // 直接构造 Prompt 并请求 DeepSeek
    const contextStr = formatDocs(docs);
    const prompt = await promptTemplate.format({ context: contextStr, question });
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` };
    const response = await axios.post(`${DEEPSEEK_API_BASE_URL}/chat/completions`, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个基于私有知识库的问答助手。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    }, { headers });
    const answer = response.data.choices[0].message.content;
    return res.json({ answer, citations });
  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error('RAG问答生成阶段错误：', detail);
    // 兜底：当生成服务不可用时，返回基于检索的摘录，避免前端500
    try {
      const userId = req.user?.id || req.user?.user?.id;
      const retriever = await getRetriever(4, userId);
      if (retriever) {
        const docs = await retriever.invoke(req.body?.question || '');
        const contexts = docs.map(d => d.pageContent);
        const citations = docs.map(d => ({
          title: d.metadata?.knowledgePointTitle || d.metadata?.knowledgePointId || '未知知识点',
          snippet: d.pageContent.slice(0, 120) + (d.pageContent.length > 120 ? '…' : '')
        }));
        if (contexts.length) {
          const preview = contexts.slice(0, 2).map((c, i) => `【片段${i + 1}】` + c.slice(0, 500) + (c.length > 500 ? '…' : '')).join('\n\n');
          return res.json({
            answer: `生成服务暂时不可用。以下为知识库相关内容摘录：\n\n${preview}`,
            citations
          });
        }
      }
    } catch (e) {
      console.error('兜底检索失败：', e?.message || e);
    }
    // 进一步兜底：无检索内容或检索失败也返回200，避免前端崩溃
    return res.json({
      answer: '生成服务暂不可用，且知识库中未找到相关内容。',
      citations: [],
      detail
    });
  }
};
