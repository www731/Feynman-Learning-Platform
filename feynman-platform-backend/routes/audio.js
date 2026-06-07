// routes/audio.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer(); // 使用内存存储，req.file.buffer可用
const { transcribeAudioLocal } = require('../controllers/whisperController');
const auth = require('../middleware/auth');

router.post('/transcribe', upload.single('audio'), transcribeAudioLocal);
// TODO: 添加评估功能时需要实现 baiduAiController
// router.post('/evaluate', auth, evaluateFeynmanAttempt);

module.exports = router;