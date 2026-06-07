// 简易向量化验证脚本：直接调用 addKnowledgePointToStore
require('dotenv').config();
const { addKnowledgePointToStore } = require('../services/vectorStoreService');

(async () => {
  try {
    const kp = { _id: 'test-kp-id', content: '向量化功能验证：这是一个用于测试的知识点内容。' };
    await addKnowledgePointToStore(kp);
    console.log('测试脚本已完成向量化流程调用。');
  } catch (err) {
    console.error('测试脚本执行失败：', err);
    process.exit(1);
  }
})();