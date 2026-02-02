import React, { useState, useEffect } from 'react';
import { getReviewList, removeFromReviewList } from '../api/knowledgePoints';
import type { KnowledgePoint } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';

interface ReviewListProps {
  onReviewListChange?: (items: KnowledgePoint[]) => void;
}

const ReviewList: React.FC<ReviewListProps> = ({ onReviewListChange }) => {
  const [reviewItems, setReviewItems] = useState<KnowledgePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const { token } = useAuth();

  // 加载复习列表
  const loadReviewList = async () => {
    setLoading(true);
    try {
      // 未登录时跳过接口调用，使用本地缓存
      if (!token) {
        const savedItems = localStorage.getItem('reviewItems');
        if (savedItems) {
          const parsedItems = JSON.parse(savedItems);
          setReviewItems(parsedItems);
          console.log('未登录，使用本地缓存的复习列表数据');
          onReviewListChange?.(parsedItems);
        }
        return;
      }

      const items = await getReviewList();
      setReviewItems(items);
      // 保存到localStorage
      localStorage.setItem('reviewItems', JSON.stringify(items));
      onReviewListChange?.(items);
    } catch (error) {
      // 针对401进行友好处理，其它错误仍打印日志
      if ((error as any)?.response?.status === 401) {
        const savedItems = localStorage.getItem('reviewItems');
        if (savedItems) {
          const parsedItems = JSON.parse(savedItems);
          setReviewItems(parsedItems);
          console.log('未授权(401)，使用本地缓存的复习列表数据');
          onReviewListChange?.(parsedItems);
        } else {
          console.warn('未授权(401)，且无本地缓存数据。请先登录。');
        }
      } else {
        console.error('加载复习列表失败:', error);
        try {
          const savedItems = localStorage.getItem('reviewItems');
          if (savedItems) {
            const parsedItems = JSON.parse(savedItems);
            setReviewItems(parsedItems);
            console.log('从本地存储恢复复习列表数据');
            onReviewListChange?.(parsedItems);
          }
        } catch (localError) {
          console.error('从本地存储恢复数据失败:', localError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // 从复习列表中移除
  const handleRemoveFromReview = async (id: string) => {
    try {
      await removeFromReviewList(id);
      // 重新加载列表
      await loadReviewList();
    } catch (error) {
      console.error('移除复习项失败:', error);
    }
  };

  // 根据难度筛选项目
  const filteredItems = selectedDifficulty === 'all' 
    ? reviewItems 
    : reviewItems.filter(item => item.difficulty === selectedDifficulty);

  // 获取各难度级别的数量
  const getDifficultyCount = (difficulty: 'easy' | 'medium' | 'hard') => {
    return reviewItems.filter(item => item.difficulty === difficulty).length;
  };

  // 获取难度显示文本和颜色
  const getDifficultyInfo = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy':
        return { text: '简单', color: 'bg-green-100 text-green-600', icon: '😊' };
      case 'medium':
        return { text: '中等', color: 'bg-yellow-100 text-yellow-600', icon: '🤔' };
      case 'hard':
        return { text: '困难', color: 'bg-red-100 text-red-600', icon: '😰' };
      default:
        return { text: '中等', color: 'bg-yellow-100 text-yellow-600', icon: '🤔' };
    }
  };

  useEffect(() => {
    // 先从localStorage加载数据，提供即时显示
    try {
      const savedItems = localStorage.getItem('reviewItems');
      if (savedItems) {
        const parsedItems = JSON.parse(savedItems);
        setReviewItems(parsedItems);
        console.log('从本地存储加载复习列表数据');
        onReviewListChange?.(parsedItems);
      }
    } catch (error) {
      console.error('从本地存储加载数据失败:', error);
    }
    
    // 然后尝试从API获取最新数据；当token变化时重新拉取
    loadReviewList();
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex gap-6">
        {/* 侧边栏 - 难度分类 */}
        <div className="w-64 bg-white rounded-lg shadow-md p-4 h-fit">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">按难度筛选</h3>
          <div className="space-y-2">
            <button
              onClick={() => setSelectedDifficulty('all')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedDifficulty === 'all'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>📚 全部</span>
                <span className="text-sm bg-gray-200 px-2 py-1 rounded">{reviewItems.length}</span>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedDifficulty('easy')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedDifficulty === 'easy'
                  ? 'bg-green-100 text-green-700 border-2 border-green-300'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>😊 简单</span>
                <span className="text-sm bg-green-200 px-2 py-1 rounded">{getDifficultyCount('easy')}</span>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedDifficulty('medium')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedDifficulty === 'medium'
                  ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>🤔 中等</span>
                <span className="text-sm bg-yellow-200 px-2 py-1 rounded">{getDifficultyCount('medium')}</span>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedDifficulty('hard')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedDifficulty === 'hard'
                  ? 'bg-red-100 text-red-700 border-2 border-red-300'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>😰 困难</span>
                <span className="text-sm bg-red-200 px-2 py-1 rounded">{getDifficultyCount('hard')}</span>
              </div>
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={loadReviewList}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              🔄 刷新列表
            </button>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              复习列表
              {selectedDifficulty !== 'all' && (
                <span className="ml-2 text-lg font-normal text-gray-600">
                  - {getDifficultyInfo(selectedDifficulty).text}
                </span>
              )}
            </h2>
            <div className="text-sm text-gray-500">
              共 {filteredItems.length} 个知识点需要复习
            </div>
          </div>
          
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              {selectedDifficulty === 'all' ? (
                <>
                  <div className="text-gray-500 text-lg">🎉 太棒了！暂无需要复习的知识点</div>
                  <div className="text-gray-400 text-sm mt-2">继续保持，加油学习！</div>
                </>
              ) : (
                <>
                  <div className="text-gray-500 text-lg">
                    📝 暂无{getDifficultyInfo(selectedDifficulty).text}难度的复习项目
                  </div>
                  <div className="text-gray-400 text-sm mt-2">
                    试试其他难度级别或继续学习新知识点！
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const difficultyInfo = getDifficultyInfo(item.difficulty);
                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-800">{item.title}</h3>
                          <span className={`px-2 py-1 rounded text-xs ${difficultyInfo.color}`}>
                            {difficultyInfo.icon} {difficultyInfo.text}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-3">{item.content}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="bg-red-100 text-red-600 px-2 py-1 rounded">需要复习</span>
                          <span>状态: {item.status === 'in_progress' ? '学习中' : item.status === 'mastered' ? '已掌握' : '未开始'}</span>
                          <span>更新时间: {item.updatedAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFromReview(item.id)}
                        className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      >
                        标记已复习
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewList;
