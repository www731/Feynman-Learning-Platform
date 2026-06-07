const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence } = require('@langchain/core/runnables');
const { BaiduQianfanChat } = require('@langchain/baidu-qianfan');
const { getRetriever } = require('../services/vectorStoreService');
const deepseek = require('./deepseekAiController');

exports.answerWithRAG = async (req, res) => {
  const { question } = req.body || {};
  if (!question) return res.status(400).json({ msg: 'Question is required.' });
  try {
    const userId = req.user?.id || req.user?.user?.id;
    const retriever = await getRetriever(4, userId);
    if (!retriever) return res.json({ answer: '当前未启用向量检索。' });
    const promptTemplate = PromptTemplate.fromTemplate(
      `<role>你是一个知识库问答机器人。</role>\n` +
      `<instruction>请根据下面提供的<context>信息来回答用户的<question>。如果上下文中没有相关信息，就明确说你不知道，不要编造答案。请让回答简洁明了。</instruction>\n\n` +
      `<context>\n{context}\n</context>\n\n` +
      `<question>\n{question}\n</question>\n\n` +
      `<answer>你的回答是：</answer>`
    );
    const formatDocs = (docs) => docs.map((doc, i) => `--- 文档 ${i + 1} ---\n${doc.pageContent}`).join('\n\n');
    const chat = (() => {
      const key = process.env.QIANFAN_API_KEY;
      const secret = process.env.QIANFAN_SECRET_KEY;
      if (key && secret) return new BaiduQianfanChat({ model: 'ERNIE-Bot-turbo', baiduApiKey: key, baiduApiSecret: secret });
      return null;
    })();
    const citationsDocs = await retriever.invoke(question);
    const citations = citationsDocs.map(d => ({
      title: d.metadata?.knowledgePointTitle || d.metadata?.knowledgePointId || '未知知识点',
      snippet: d.pageContent.slice(0, 120) + (d.pageContent.length > 120 ? '…' : '')
    }));

    if (!citationsDocs.length) {
      return res.json({ answer: '知识库中暂无相关内容。', citations: [] });
    }

    if (!chat) {
      if (process.env.DEEPSEEK_API_KEY) return deepseek.answerWithRAG(req, res);
      const preview = citationsDocs
        .slice(0, 2)
        .map((d, i) => `【片段${i + 1}】${d.pageContent.slice(0, 500)}${d.pageContent.length > 500 ? '…' : ''}`)
        .join('\n\n');
      return res.json({
        answer: `当前未配置可用的生成模型（千帆/DeepSeek）。已为你检索到以下相关内容：\n\n${preview}`,
        citations,
      });
    }
    const ragChain = RunnableSequence.from([
      { context: retriever.pipe(formatDocs), question: (input) => input.question },
      promptTemplate,
      chat,
      new StringOutputParser(),
    ]);
    const answer = await ragChain.invoke({ question });
    return res.json({ answer, citations });
  } catch (error) {
    const detail = error.response?.data || error.message;
    try {
      const userId = req.user?.id || req.user?.user?.id;
      const retriever = await getRetriever(4, userId);
      if (!retriever) return res.status(500).json({ msg: 'RAG执行失败', detail });
      const docs = await retriever.invoke(req.body?.question || '');
      const citations = docs.map(d => ({
        title: d.metadata?.knowledgePointTitle || d.metadata?.knowledgePointId || '未知知识点',
        snippet: d.pageContent.slice(0, 120) + (d.pageContent.length > 120 ? '…' : '')
      }));
      if (!docs.length) return res.json({ answer: '知识库中暂无相关内容。', citations: [] });
      const preview = docs
        .slice(0, 2)
        .map((d, i) => `【片段${i + 1}】${d.pageContent.slice(0, 500)}${d.pageContent.length > 500 ? '…' : ''}`)
        .join('\n\n');
      return res.json({ answer: `RAG生成阶段失败，以下为检索内容摘录：\n\n${preview}`, citations, detail });
    } catch {
      return res.status(500).json({ msg: 'RAG执行失败', detail });
    }
  }
};
