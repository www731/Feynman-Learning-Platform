// 1. 引入 express 这个工具包
// 讲解：这里我们使用了Node.js的CommonJS模块规范，即`require`。
// 大家未来在很多前端或新版Node.js项目中会看到`import express from 'express'`的写法，
// 那是ESM（ECMAScript Module）规范。两者功能类似，只是语法和加载机制不同。
// 我们暂时先用`require`，后续课程会接触到`import`。
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

// 2. 创建一个 express 应用实例
const app = express();

// Add middleware (必须在路由之前)
app.use(express.json()); // For parsing application/json
app.use(cors());         // For enabling CORS

// 注册路由
app.use('/api/knowledge-points', require('./routes/knowledgePoints'));
app.use('/api/users', require('./routes/users'));
app.use('/api/audio', require('./routes/audio'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/graph', require('./routes/graph'));

// 运行态探针（确认当前进程代码版本）
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, v: 'index-v1' });
});

// 3. 定义服务器的端口号
const port = process.env.PORT || 3000;

// Connect to MongoDB with fallback
const mongoUri = process.env.MONGO_URI;
const mongoOpts = { serverSelectionTimeoutMS: 5000 };
(async () => {
  try {
    await mongoose.connect(mongoUri, mongoOpts);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    const localUri = 'mongodb://localhost:27017/feynman';
    if (mongoUri !== localUri) {
      try {
        console.warn('尝试本地MongoDB连接:', localUri);
        await mongoose.connect(localUri, mongoOpts);
        console.log('MongoDB connected successfully (local)');
      } catch (e2) {
        console.error('本地MongoDB连接失败:', e2);
      }
    }
  }
})();

// 用户注册 API
// 用户登录 API
app.get('/', (req, res) => {
  // 我们回应一段文本
  res.send('Hello, Feynman Learner!');
});

// 新增一个API接口：当访问'/user'路径时，返回JSON数据
app.get('/user', (req, res) => {
  // 返回一个JSON对象
  res.json({
    "name": "Feynman Student",
    "major": "Computer Science"
  });
});

// 5. 启动服务器，让它开始监听指定的端口
app.listen(port, () => {
  console.log(`Feynman Platform backend is running at http://localhost:${port}`);
});
