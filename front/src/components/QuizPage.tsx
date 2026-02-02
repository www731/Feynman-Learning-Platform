import React, { useState } from 'react';
import { generateQuestion, submitAnswer, QuizQuestion, GenerateQuestionRequest, SubmitAnswerResponse } from '../api/quiz';
import { updateKnowledgePointStatus } from '../api/knowledgePoints';

const QuizPage: React.FC = () => {
  const [knowledgeContent, setKnowledgeContent] = useState('');
  const [difficulty, setDifficulty] = useState<'简单' | '中等' | '困难'>('简单');
  const [questionType, setQuestionType] = useState<'single-choice' | 'short-answer'>('single-choice');
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [shortAnswer, setShortAnswer] = useState<string>('');
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // 生成题目
  const handleGenerateQuestion = async () => {
    if (!knowledgeContent.trim()) {
      alert('请输入知识点内容');
      return;
    }

    setLoading(true);
    try {
      const params: GenerateQuestionRequest = {
        knowledgePointContent: knowledgeContent,
        difficulty: difficulty,
        type: questionType
      };
      
      // 添加调试日志
      console.log('发送出题请求:', params);
      console.log('当前选择的题目类型:', questionType);
      
      const question = await generateQuestion(params);
      console.log('收到题目响应:', question);
      
      setCurrentQuestion(question);
      setSelectedAnswer('');
      setShortAnswer('');
      setResult(null);
      setShowResult(false);
    } catch (error) {
      console.error('生成题目失败:', error);
      alert('生成题目失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 提交答案
  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;

    const userAnswer = currentQuestion.type === 'single-choice' ? selectedAnswer : shortAnswer;
    
    if (!userAnswer.trim()) {
      alert(currentQuestion.type === 'single-choice' ? '请选择一个答案' : '请输入您的答案');
      return;
    }

    setLoading(true);
  try {
    let submitData;
    
    if (currentQuestion.type === 'single-choice') {
      submitData = {
        question: currentQuestion.question,
        userAnswer: selectedAnswer,
        correctAnswer: currentQuestion.answer,
        explanation: currentQuestion.explanation,
        type: 'single-choice' as const
      };
    } else {
      submitData = {
        question: currentQuestion.question,
        userAnswer: shortAnswer,
        answerKeyPoints: currentQuestion.answer_key_points,
        type: 'short-answer' as const
      };
    }
    
    const result = await submitAnswer(submitData);
    setResult(result);
    setShowResult(true);

    // 根据测评结果更新知识点状态
    try {
      const mappedDifficulty = difficulty === '简单' ? 'easy' : (difficulty === '中等' ? 'medium' : 'hard');
      const basePayload = {
        knowledgeContent: knowledgeContent,
        isCorrect: result.isCorrect,
        score: result.score,
        questionDifficulty: mappedDifficulty
      };
      const detailPayload = currentQuestion.type === 'single-choice'
        ? {
            question: currentQuestion.question,
            userAnswer: selectedAnswer,
            correctAnswer: currentQuestion.answer,
            explanation: currentQuestion.explanation,
            type: 'single-choice' as const
          }
        : {
            question: currentQuestion.question,
            userAnswer: shortAnswer,
            explanation: (result.explanation || result.feedback || ''),
            type: 'short-answer' as const
          };
      const updateResult = await updateKnowledgePointStatus({
        ...basePayload,
        ...(result.isCorrect ? {} : detailPayload)
      });
        
        console.log('知识点状态更新成功:', updateResult.message);
        
        if (!result.isCorrect) {
          console.log('知识点已加入复习列表');
        }
      } catch (updateError) {
        console.error('更新知识点状态失败:', updateError);
      }

    } catch (error) {
      console.error('提交答案失败:', error);
      
      // 选择题的后备逻辑
      if (currentQuestion.type === 'single-choice') {
        const isCorrect = selectedAnswer === currentQuestion.answer;
        const fallbackResult = {
          isCorrect,
          score: isCorrect ? 100 : 0,
          feedback: isCorrect ? '回答正确！' : '回答错误，请再试试。',
          analysis: `您选择了选项 ${selectedAnswer}，${isCorrect ? '回答正确！' : `正确答案是 ${currentQuestion.answer}`}`,
          suggestions: isCorrect ? ['继续保持！'] : ['建议复习相关知识点']
        };
        setResult(fallbackResult);
        setShowResult(true);

        try {
          const mappedDifficulty = difficulty === '简单' ? 'easy' : (difficulty === '中等' ? 'medium' : 'hard');
          await updateKnowledgePointStatus({
            knowledgeContent: knowledgeContent,
            isCorrect: fallbackResult.isCorrect,
            score: fallbackResult.score,
            questionDifficulty: mappedDifficulty
          });
        } catch (updateError) {
          console.error('更新知识点状态失败:', updateError);
        }
      } else {
        // 简答题无法提供后备逻辑，显示错误信息
        alert('评分失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 重新开始
  const handleRestart = () => {
    setCurrentQuestion(null);
    setSelectedAnswer('');
    setShortAnswer('');
    setResult(null);
    setShowResult(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            AI智能出题系统
          </h1>

          {/* 题目生成区域 */}
          {!currentQuestion && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  知识点内容
                </label>
                <textarea
                  value={knowledgeContent}
                  onChange={(e) => setKnowledgeContent(e.target.value)}
                  placeholder="请输入您想要测试的知识点内容，例如：React组件、JavaScript闭包、数据结构等..."
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  难度选择
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as '简单' | '中等' | '困难')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white hover:border-blue-400 transition-colors cursor-pointer"
                >
                  <option value="简单" className="bg-white text-gray-900">简单</option>
                  <option value="中等" className="bg-white text-gray-900">中等</option>
                  <option value="困难" className="bg-white text-gray-900">困难</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  题目类型
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as 'single-choice' | 'short-answer')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white hover:border-blue-400 transition-colors cursor-pointer"
                >
                  <option value="single-choice" className="bg-white text-gray-900">单项选择题</option>
                  <option value="short-answer" className="bg-white text-gray-900">简答题</option>
                </select>
              </div>

              <button
                onClick={handleGenerateQuestion}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '正在生成题目...' : '生成题目'}
              </button>
            </div>
          )}

          {/* 答题区域 */}
          {currentQuestion && !showResult && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-blue-600 font-medium">
                    难度: {currentQuestion.difficulty}
                  </span>
                  <span className="text-sm text-blue-600 font-medium">
                    题型: {currentQuestion.type === 'single-choice' ? '单项选择题' : '简答题'}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  {currentQuestion.question}
                </h2>
              </div>

              {/* 选择题答题区域 */}
              {currentQuestion.type === 'single-choice' && (
                <div className="space-y-3">
                  {Object.entries(currentQuestion.options).map(([key, value]) => (
                    <label
                      key={key}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedAnswer === key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={key}
                        checked={selectedAnswer === key}
                        onChange={(e) => setSelectedAnswer(e.target.value)}
                        className="mr-3 text-blue-600"
                      />
                      <span className="font-medium text-gray-700 mr-2">{key}.</span>
                      <span className="text-gray-700">{value}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* 简答题答题区域 */}
              {currentQuestion.type === 'short-answer' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      请用自己的话回答以下问题：
                    </label>
                    <textarea
                      value={shortAnswer}
                      onChange={(e) => setShortAnswer(e.target.value)}
                      placeholder="请在此输入您的答案..."
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                    />
                  </div>
                  
                  {/* 显示答案要点提示 */}
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">💡 答题提示：</h4>
                    <p className="text-sm text-yellow-700">
                      请尽量覆盖以下要点，但不必完全按照顺序回答。AI会根据您回答的完整性和准确性进行评分。
                    </p>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={
                    (currentQuestion.type === 'single-choice' && !selectedAnswer) ||
                    (currentQuestion.type === 'short-answer' && !shortAnswer.trim()) ||
                    loading
                  }
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '正在评分...' : '提交答案'}
                </button>
                <button
                  onClick={handleRestart}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  重新开始
                </button>
              </div>
            </div>
          )}

          {/* 结果展示区域 */}
          {showResult && result && currentQuestion && (
            <div className="space-y-6">
              <div className={`p-6 rounded-lg border-2 ${
                result.isCorrect 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-bold ${
                    result.isCorrect ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.isCorrect ? '✅ 回答正确！' : '❌ 回答错误'}
                  </h3>
                  {result.score !== undefined && (
                    <span className={`text-lg font-semibold px-3 py-1 rounded-full ${
                      result.isCorrect 
                        ? 'bg-green-200 text-green-800' 
                        : 'bg-red-200 text-red-800'
                    }`}>
                      得分: {result.score}/100
                    </span>
                  )}
                </div>

                {/* 选择题答案显示 */}
                {currentQuestion.type === 'single-choice' && (
                  <div className="space-y-4">
                    <p className="text-gray-700">
                      <span className="font-medium">您的答案：</span>
                      <span className={result.isCorrect ? 'text-green-600' : 'text-red-600'}>
                        {selectedAnswer}. {currentQuestion.options[selectedAnswer as keyof typeof currentQuestion.options]}
                      </span>
                    </p>
                    
                    {!result.isCorrect && (
                      <p className="text-gray-700">
                        <span className="font-medium">正确答案：</span>
                        <span className="text-green-600">
                          {currentQuestion.answer}. {currentQuestion.options[currentQuestion.answer as keyof typeof currentQuestion.options]}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* 简答题答案显示 */}
                {currentQuestion.type === 'short-answer' && (
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-md border">
                      <h4 className="font-medium text-gray-800 mb-2">您的答案：</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{shortAnswer}</p>
                    </div>
                  </div>
                )}

                {/* AI反馈 */}
                {(result.feedback || result.explanation) && (
                  <div className="bg-white p-4 rounded-md border">
                    <h4 className="font-medium text-gray-800 mb-2">📝 AI反馈：</h4>
                    <p className="text-gray-700 leading-relaxed">
                      {result.feedback || result.explanation}
                    </p>
                  </div>
                )}

                {/* 选择题特有的详细分析 */}
                {currentQuestion.type === 'single-choice' && result.analysis && (
                  <div className="bg-white p-4 rounded-md border">
                    <h4 className="font-medium text-gray-800 mb-2">🔍 详细分析：</h4>
                    <p className="text-gray-700 leading-relaxed">{result.analysis}</p>
                  </div>
                )}

                {/* 选择题特有的学习建议 */}
                {currentQuestion.type === 'single-choice' && result.suggestions && result.suggestions.length > 0 && (
                  <div className="bg-white p-4 rounded-md border">
                    <h4 className="font-medium text-gray-800 mb-2">💡 学习建议：</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {result.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-gray-700">{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 简答题特有的覆盖要点和遗漏要点 */}
                {currentQuestion.type === 'short-answer' && (
                  <>
                    {result.coveredPoints && result.coveredPoints.length > 0 && (
                      <div className="bg-white p-4 rounded-md border">
                        <h4 className="font-medium text-green-800 mb-2">✅ 已覆盖要点：</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {result.coveredPoints.map((point, index) => (
                            <li key={index} className="text-green-700">{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {result.missedPoints && result.missedPoints.length > 0 && (
                      <div className="bg-white p-4 rounded-md border">
                        <h4 className="font-medium text-red-800 mb-2">❌ 遗漏要点：</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {result.missedPoints.map((point, index) => (
                            <li key={index} className="text-red-700">{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 题目解析（选择题特有） */}
              {currentQuestion.type === 'single-choice' && currentQuestion.explanation && (
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">📚 题目解析：</h4>
                  <p className="text-blue-700 leading-relaxed">{currentQuestion.explanation}</p>
                </div>
              )}

              {/* 答案要点展示（简答题特有） */}
              {currentQuestion.type === 'short-answer' && currentQuestion.answer_key_points && (
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">📚 参考答案要点：</h4>
                  <ul className="list-disc list-inside space-y-2">
                    {currentQuestion.answer_key_points.map((point, index) => (
                      <li key={index} className="text-blue-700">{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={handleGenerateQuestion}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '正在生成...' : '生成新题目'}
                </button>
                <button
                  onClick={handleRestart}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  重新开始
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
