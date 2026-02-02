require('dotenv').config();
const axios = require('axios');

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_BASE_URL = 'https://api.deepseek.com/v1';

// 检查API Key是否配置
if (!DEEPSEEK_API_KEY) {
  console.error('错误：请在.env文件中配置DEEPSEEK_API_KEY');
  process.exit(1);
}

// 请求头配置
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
};

/**
 * 测试AI文本润色功能
 * @param {string} text - 需要润色的文本
 */
async function testTextPolishing(text) {
  console.log(`原始文本: ${text}`);
  
  try {
    const response = await axios.post(`${DEEPSEEK_API_BASE_URL}/chat/completions`, {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的文本润色助手，请将用户提供的文本进行润色，使其更加流畅、专业和清晰，但不要改变原意。'
        },
        {
          role: 'user',
          content: `请润色以下文本：${text}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }, { headers });

    console.log('API响应数据:', JSON.stringify(response.data, null, 2));

    // 提取润色后的文本
    const polishedText = response.data.choices && response.data.choices[0] && response.data.choices[0].message 
      ? response.data.choices[0].message.content 
      : '无法获取润色结果';
    
    console.log('✅ 润色成功!');
    console.log(`润色后文本: ${polishedText}`);
    return polishedText;
  } catch (error) {
    console.error('❌ 润色失败:', error.response ? error.response.data : error.message);
    return null;
  }
}

/**
 * 测试AI评价打分功能
 * @param {string} knowledgePoint - 知识点
 * @param {string} userAnswer - 用户回答
 */
async function testEvaluation(knowledgePoint, userAnswer) {
  console.log(`原始知识点: ${knowledgePoint}`);
  console.log(`用户回答: ${userAnswer}`);
  
  try {
    const response = await axios.post(`${DEEPSEEK_API_BASE_URL}/chat/completions`, {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的教育评价助手，请根据提供的知识点和用户回答，给出评价、打分和建议。
          
请按照以下JSON格式返回结果：
{
  "polished_answer": "润色后的用户回答",
  "evaluation": "对用户回答的综合评价",
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["待改进点1", "待改进点2"],
  "score": 85
}`
        },
        {
          role: 'user',
          content: `知识点：${knowledgePoint}\n\n用户回答：${userAnswer}\n\n请根据知识点评价用户回答，并按照要求的JSON格式返回结果。`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    }, { headers });

    console.log('API响应数据:', JSON.stringify(response.data, null, 2));

    // 尝试解析JSON响应
    let result;
    try {
      const content = response.data.choices[0].message.content;
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError.message);
      console.log('原始响应内容:', response.data.choices[0].message.content);
      return {
        polishedAnswer: undefined,
        evaluation: undefined,
        strengths: [],
        weaknesses: [],
        score: undefined
      };
    }

    console.log('✅ 评价成功!');
    console.log(`润色后文本: ${result.polished_answer || 'undefined'}`);
    console.log(`综合评价: ${result.evaluation || 'undefined'}`);
    console.log(`优点: ${result.strengths && result.strengths.length ? result.strengths.join(', ') : '无'}`);
    console.log(`待改进: ${result.weaknesses && result.weaknesses.length ? result.weaknesses.join(', ') : '无'}`);
    console.log(`综合得分: ${result.score || 'undefined'}`);
    
    return {
      polishedAnswer: result.polished_answer,
      evaluation: result.evaluation,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      score: result.score
    };
  } catch (error) {
    console.error('❌ 评价失败:', error.response ? error.response.data : error.message);
    return {
      polishedAnswer: undefined,
      evaluation: undefined,
      strengths: [],
      weaknesses: [],
      score: undefined
    };
  }
}

/**
 * 主函数：运行所有测试
 */
async function main() {
  console.log('开始测试DeepSeek API...\n');
  
  // 测试文本润色功能
  console.log('===== 测试AI文本润色功能 =====');
  const testText = '嗯，这个React Hooks就是，就是那个，它可以让你在函数组件里面使用状态和生命周期这些特性，不用写class了，挺方便的。';
  await testTextPolishing(testText);
  
  console.log('\n');
  
  // 测试评价打分功能
  console.log('===== 测试AI评价打分功能 =====');
  const knowledgePoint = 'React Hooks是React 16.8引入的新特性，它允许你在不编写class的情况下使用state和其他React特性。Hooks解决了class组件中难以理解、复用状态逻辑的问题，使函数组件拥有了更强大的能力。最常用的Hooks包括useState、useEffect、useContext等。';
  const userAnswer = 'React Hooks就是React的一个功能，它可以让你不用写class就能用状态。比如useState可以用来管理状态，useEffect可以处理副作用，这样就不用写class组件了，代码更简单。';
  await testEvaluation(knowledgePoint, userAnswer);
  
  console.log('\n===== 所有测试完成 =====');
}

// 运行主函数
main().catch(console.error);