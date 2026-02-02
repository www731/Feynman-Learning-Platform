import api from './axios';

// 选择题接口
export interface SingleChoiceQuestion {
  type: 'single-choice';
  difficulty: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: string;
  explanation: string;
}

// 简答题接口
export interface ShortAnswerQuestion {
  type: 'short-answer';
  difficulty: string;
  question: string;
  answer_key_points: string[];
}

// 题目联合类型
export type QuizQuestion = SingleChoiceQuestion | ShortAnswerQuestion;

// 生成题目请求接口
export interface GenerateQuestionRequest {
  knowledgePointContent: string;
  difficulty: string;
  type?: 'single-choice' | 'short-answer';
}

// 提交答案请求接口
export interface SubmitAnswerRequest {
  question: string;
  userAnswer: string;
  correctAnswer?: string;
  explanation?: string;
  answerKeyPoints?: string[];
  type?: 'single-choice' | 'short-answer';
}

// 提交答案响应接口
export interface SubmitAnswerResponse {
  isCorrect: boolean;
  score: number;
  feedback: string;
  analysis?: string;
  suggestions?: string[];
  explanation?: string;
  coveredPoints?: string[];
  missedPoints?: string[];
}

// 生成题目
export const generateQuestion = async (data: GenerateQuestionRequest): Promise<QuizQuestion> => {
  const response = await api.post('/ai/generate-question', data);
  return response.data;
};

// 提交答案并获取AI评分
export const submitAnswer = async (data: SubmitAnswerRequest): Promise<SubmitAnswerResponse> => {
  const response = await api.post('/ai/grade-answer', data);
  return response.data;
};