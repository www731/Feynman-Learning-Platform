// controllers/whisperController.js
const axios = require('axios');
const FormData = require('form-data');

// 从环境变量获取Whisper API地址，默认为本地地址
const WHISPER_API_URL = process.env.WHISPER_API_URL || 'http://localhost:5001/transcribe';

exports.transcribeAudioLocal = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No audio file uploaded.' });
  }
  
  console.log('Audio file received:', {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    bufferSize: req.file.buffer?.length
  });
  
  try {
    const form = new FormData();
    form.append('audio', req.file.buffer, {
      filename: req.file.originalname || 'audio.wav',
      contentType: req.file.mimetype || 'application/octet-stream',
    });
    
    console.log('Sending request to Whisper API with form data headers:', form.getHeaders());

    console.log('Calling Whisper API at:', WHISPER_API_URL);
    const response = await axios.post(WHISPER_API_URL, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
    });

    return res.json({ result: response.data.result });
  } catch (error) {
    console.error('Error calling local Whisper API:', error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });
    
    const status = error.response?.status || 500;
    const detail = error.response?.data || { error: 'Error during local transcription.' };
    return res.status(status).json(detail);
  }
};