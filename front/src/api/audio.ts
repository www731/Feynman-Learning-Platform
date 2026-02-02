import apiClient from './axios';

// 音频转写响应类型
export interface TranscriptionResponse {
  result: string;
}

// AI润色响应类型
export interface PolishResponse {
  polishedText: string;
}

// AI评教响应类型
export interface AIEvaluationResponse {
  polishedText: string;
  evaluation: string;
  strengths: string[];
  weaknesses: string[];
  score: number;
}

// 音频转写函数
export async function transcribeAudio(file: File): Promise<TranscriptionResponse> {
  const formData = new FormData();
  formData.append('audio', file);
  
  const { data } = await apiClient.post<TranscriptionResponse>('/audio/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // 60秒超时，因为音频转写可能需要较长时间
  });
  
  return data;
}

// AI润色函数
export async function polishText(text: string): Promise<PolishResponse> {
  const { data } = await apiClient.post<PolishResponse>('/ai/polish', {
    text,
  });
  
  return data;
}

// AI评教函数
export async function evaluateAudio(originalContent: string, transcribedText: string): Promise<AIEvaluationResponse> {
  const { data } = await apiClient.post<AIEvaluationResponse>('/ai/evaluate', {
    originalContent,
    transcribedText,
  });
  
  return data;
}