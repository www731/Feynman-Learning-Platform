// 1. 引入 express 这个工具包
// 讲解：这里我们使用了Node.js的CommonJS模块规范，即`require`。
// 大家未来在很多前端或新版Node.js项目中会看到`import express from 'express'`的写法，
// 那是ESM（ECMAScript Module）规范。两者功能类似，只是语法和加载机制不同。
// 我们暂时先用`require`，后续课程会接触到`import`。
const express = require('express');

// 2. 创建一个 express 应用实例
const app = express();

// 3. 定义服务器的端口号
const port = 3000;

// 4. 定义一个API接口：当有人访问根路径'/'时，我们如何回应
// req: request (收到的请求信息)
// res: response (要发出去的回应信息)
app.get('/', (req, res) => {
  // 我们回应一段文本
  res.send('Hello, Feynman Learner!');
});

// 5. 启动服务器，让它开始监听指定的端口
app.listen(port, () => {
  console.log(`Feynman Platform backend is running at http://localhost:${port}`);
});