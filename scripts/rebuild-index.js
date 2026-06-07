/* 全量重建向量索引（商业级）
 * 1. 清空旧 vector_store
 * 2. 拉取全量知识点
 * 3. 使用 OpenAI 嵌入重新分块、索引、落盘
 * 用法：node scripts/rebuild-index.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const KnowledgePoint = require('../models/KnowledgePoint');
const { addKnowledgePointToStore } = require('../services/vectorStoreService');

const VECTOR_STORE_PATH = path.join(__dirname, '../vector_store');

(async () => {
  try {
    console.log('[1/4] 连接 MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB 已连接');

    console.log('[2/4] 清空旧向量库...');
    if (fs.existsSync(VECTOR_STORE_PATH)) {
      fs.rmSync(VECTOR_STORE_PATH, { recursive: true, force: true });
      console.log('已删除旧 vector_store');
    }

    console.log('[3/4] 拉取全量知识点...');
    const kps = await KnowledgePoint.find({}).lean();
    console.log(`共 ${kps.length} 条记录待索引`);

    console.log('[4/4] 开始批量向量化（OpenAI 嵌入）...');
    for (let i = 0; i < kps.length; i++) {
      process.stdout.write(`\r进度 ${i + 1}/${kps.length}`);
      await addKnowledgePointToStore(kps[i]);
    }
    console.log('\n✅ 全量重建完成！');
  } catch (err) {
    console.error('重建失败:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();