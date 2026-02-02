import { useEffect, useState } from 'react';
import LoginPage from './components/LoginPage';
import MainLayout from './components/MainLayout';
import AgentPage from './components/AgentPage';
import GraphPage from './components/GraphPage';
import KnowledgeUniversePage from './components/KnowledgeUniversePage';
import KnowledgePoints from './components/KnowledgePoints';
import AudioTranscriptionComponent from './components/AudioTranscription';
import QuizPage from './components/QuizPage';
import ReviewList from './components/ReviewList';
import type { KnowledgePoint, AudioTranscription } from './data/mockData';
import { useAuth } from './contexts/AuthContext';
import { listKnowledgePoints, createKnowledgePoint, updateKnowledgePoint, deleteKnowledgePoint } from './api/knowledgePoints';

export default function App() {
  const { token, logout } = useAuth();
  const [currentView, setCurrentView] = useState<'knowledge' | 'audio' | 'quiz' | 'review' | 'agent' | 'graph' | 'universe'>('knowledge');
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  
  // 从localStorage加载音频转写记录
  const [audioTranscriptions, setAudioTranscriptions] = useState<AudioTranscription[]>(() => {
    try {
      const saved = localStorage.getItem('audioTranscriptions');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('加载音频转写记录失败:', error);
      return [];
    }
  });

  // 当audioTranscriptions变化时，保存到localStorage
  useEffect(() => {
    try {
      localStorage.setItem('audioTranscriptions', JSON.stringify(audioTranscriptions));
    } catch (error) {
      console.error('保存音频转写记录失败:', error);
    }
  }, [audioTranscriptions]);

  // 首次或token变化时，加载知识点列表
  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const list = await listKnowledgePoints();
        setKnowledgePoints(list);
      } catch (e) {
        console.error('加载知识点失败:', e);
      }
    }
    load();
  }, [token]);

  // 知识点增删改查
  const handleAddKnowledgePoint = async (point: Omit<KnowledgePoint, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created = await createKnowledgePoint({ title: point.title, content: point.content, tags: point.tags || [] });
      setKnowledgePoints([...knowledgePoints, created]);
    } catch (e) {
      console.error('创建知识点失败:', e);
    }
  };

  const handleUpdateKnowledgePoint = async (id: string, updates: Partial<KnowledgePoint>) => {
    try {
      const updated = await updateKnowledgePoint(id, { title: updates.title, content: updates.content, tags: updates.tags });
      setKnowledgePoints(
        knowledgePoints.map((point) => (point.id === id ? { ...updated } : point))
      );
    } catch (e) {
      console.error('更新知识点失败:', e);
    }
  };

  const handleDeleteKnowledgePoint = async (id: string) => {
    try {
      await deleteKnowledgePoint(id);
      setKnowledgePoints(knowledgePoints.filter((point) => point.id !== id));
    } catch (e) {
      console.error('删除知识点失败:', e);
    }
  };

  const handleReviewListChange = (items: KnowledgePoint[]) => {
    setKnowledgePoints(prev => prev.map(p => ({
      ...p,
      reviewList: items.some(it => it.id === p.id)
    })));
  };

  // 音频转写
  const handleAddTranscription = (transcription: Omit<AudioTranscription, 'id' | 'createdAt'>) => {
    const newTranscription: AudioTranscription = {
      ...transcription,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setAudioTranscriptions([...audioTranscriptions, newTranscription]);
  };

  const handleUpdateTranscription = (id: string, updates: Partial<Omit<AudioTranscription, 'id' | 'createdAt'>>) => {
    setAudioTranscriptions(prev => 
      prev.map(transcription => 
        transcription.id === id 
          ? { ...transcription, ...updates }
          : transcription
      )
    );
  };

  const handleDeleteTranscription = (id: string) => {
    setAudioTranscriptions(audioTranscriptions.filter(transcription => transcription.id !== id));
  };

  if (!token) {
    return <LoginPage />;
  }

  return (
    <MainLayout
      currentView={currentView}
      onViewChange={setCurrentView}
      onLogout={() => {
        logout();
        setCurrentView('knowledge');
      }}
    >
      {currentView === 'knowledge' ? (
        <KnowledgePoints
          knowledgePoints={knowledgePoints}
          onAdd={handleAddKnowledgePoint}
          onUpdate={handleUpdateKnowledgePoint}
          onDelete={handleDeleteKnowledgePoint}
        />
      ) : currentView === 'audio' ? (
        <AudioTranscriptionComponent
          transcriptions={audioTranscriptions}
          onAddTranscription={handleAddTranscription}
          onUpdateTranscription={handleUpdateTranscription}
          onDeleteTranscription={handleDeleteTranscription}
        />
      ) : currentView === 'quiz' ? (
        <QuizPage />
      ) : currentView === 'review' ? (
        <ReviewList onReviewListChange={handleReviewListChange} />
      ) : currentView === 'agent' ? (
        <AgentPage />
      ) : currentView === 'graph' ? (
        <GraphPage />
      ) : (
        <KnowledgeUniversePage />
      )}
    </MainLayout>
  );
}
