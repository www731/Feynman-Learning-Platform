import apiClient from './axios';

// 后端知识点数据结构(简化)
interface BackendKnowledgePoint {
  _id: string;
  title: string;
  content: string;
  tags?: string[];
  status?: string;
  reviewList?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  createdAt?: string;
  updatedAt?: string;
}

// 前端展示所需类型（复用现有类型）
import type { KnowledgePoint } from '../data/mockData';

function mapToFrontend(kp: BackendKnowledgePoint): KnowledgePoint {
  return {
    id: kp._id,
    title: kp.title,
    content: kp.content,
    tags: kp.tags || [],
    status: kp.status || 'not_started',
    reviewList: kp.reviewList || false,
    difficulty: kp.difficulty || 'medium',
    createdAt: kp.createdAt ? new Date(kp.createdAt) : new Date(),
    updatedAt: kp.updatedAt ? new Date(kp.updatedAt) : new Date(),
  };
}

export async function listKnowledgePoints(): Promise<KnowledgePoint[]> {
  const { data } = await apiClient.get<BackendKnowledgePoint[]>('/knowledge-points');
  return data.map(mapToFrontend);
}

export async function createKnowledgePoint(payload: { title: string; content: string; tags?: string[] }): Promise<KnowledgePoint> {
  const { data } = await apiClient.post<BackendKnowledgePoint>('/knowledge-points', payload);
  return mapToFrontend(data);
}

export async function updateKnowledgePoint(id: string, payload: { 
  title?: string; 
  content?: string; 
  status?: string; 
  reviewList?: boolean; 
  tags?: string[];
}): Promise<KnowledgePoint> {
  const { data } = await apiClient.put<BackendKnowledgePoint>(`/knowledge-points/${id}`, payload);
  return mapToFrontend(data);
}

export async function deleteKnowledgePoint(id: string): Promise<void> {
  await apiClient.delete(`/knowledge-points/${id}`);
}

// 根据测评结果更新知识点状态
export async function updateKnowledgePointStatus(payload: {
  knowledgeContent: string;
  isCorrect: boolean;
  score: number;
  questionDifficulty?: 'easy' | 'medium' | 'hard';
  question?: string;
  userAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
  type?: 'single-choice' | 'short-answer';
}): Promise<{
  success: boolean;
  knowledgePoint: KnowledgePoint;
  message: string;
}> {
  const { data } = await apiClient.post('/knowledge-points/update-status', payload);
  return {
    success: data.success,
    knowledgePoint: mapToFrontend(data.knowledgePoint),
    message: data.message
  };
}

// 获取复习列表
export async function getReviewList(): Promise<KnowledgePoint[]> {
  const { data } = await apiClient.get<BackendKnowledgePoint[]>('/knowledge-points/review-list');
  return data.map(mapToFrontend);
}

// 从复习列表中移除知识点
export async function removeFromReviewList(id: string): Promise<{
  success: boolean;
  knowledgePoint: KnowledgePoint;
  message: string;
}> {
  const { data } = await apiClient.put(`/knowledge-points/${id}/remove-from-review`);
  return {
    success: data.success,
    knowledgePoint: mapToFrontend(data.knowledgePoint),
    message: data.message
  };
}

// AI Evaluation response type
export interface AIEvaluationResponse {
  polishedText: string;
  evaluation: string;
  strengths: string[];
  weaknesses: string[];
  score: number;
}

export async function evaluateKnowledgePoint(originalContent: string, transcribedText: string): Promise<AIEvaluationResponse> {
  const { data } = await apiClient.post<AIEvaluationResponse>('/ai/evaluate', { originalContent, transcribedText });
  return data;
}
