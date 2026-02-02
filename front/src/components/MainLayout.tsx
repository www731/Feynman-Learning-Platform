import { useState } from 'react';
import { Button } from './ui/button';
import { BookOpen, Mic, LogOut, Menu, X, Brain, RefreshCw, MessageSquare, Share2, Globe } from 'lucide-react';

interface MainLayoutProps {
  currentView: 'knowledge' | 'audio' | 'quiz' | 'review' | 'agent' | 'graph' | 'universe';
  onViewChange: (view: 'knowledge' | 'audio' | 'quiz' | 'review' | 'agent' | 'graph' | 'universe') => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function MainLayout({
  currentView,
  onViewChange,
  onLogout,
  children,
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 侧边栏 */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-lg transition-all duration-300 z-10 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex flex-col h-full p-6 overflow-hidden">
          {/* Logo */}
          <div className={`flex items-center mb-8 ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-gray-600" />
            </div>
            <span className={`text-gray-900 whitespace-nowrap transition-all duration-300 ${
              sidebarOpen ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 overflow-hidden'
            }`}>
              费曼学习平台
            </span>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 space-y-2">
            <button
              onClick={() => onViewChange('knowledge')}
              className={`w-full flex items-center rounded-lg transition-all overflow-hidden ${
                sidebarOpen ? 'gap-3 px-4 py-3' : 'justify-center px-3 py-3'
              } ${
                currentView === 'knowledge'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={!sidebarOpen ? '知识点' : undefined}
            >
              <BookOpen className={`w-5 h-5 flex-shrink-0 ${currentView === 'knowledge' ? 'text-white' : 'text-gray-500'}`} />
              <span className={`whitespace-nowrap transition-all duration-300 ${
                sidebarOpen ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 overflow-hidden'
              }`}>
                知识点
              </span>
            </button>
            <button
              onClick={() => onViewChange('audio')}
              className={`w-full flex items-center rounded-lg transition-all overflow-hidden ${
                sidebarOpen ? 'gap-3 px-4 py-3' : 'justify-center px-3 py-3'
              } ${
                currentView === 'audio'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={!sidebarOpen ? '音频转写' : undefined}
            >
              <Mic className={`w-5 h-5 flex-shrink-0 ${currentView === 'audio' ? 'text-white' : 'text-gray-500'}`} />
              <span className={`whitespace-nowrap transition-all duration-300 ${
                sidebarOpen ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 overflow-hidden'
              }`}>
                音频转写
              </span>
            </button>
            <button
              onClick={() => onViewChange('quiz')}
              className={`w-full flex items-center rounded-lg transition-all overflow-hidden ${
                sidebarOpen ? 'gap-3 px-4 py-3' : 'justify-center px-3 py-3'
              } ${
                currentView === 'quiz'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={!sidebarOpen ? 'AI答题' : undefined}
            >
              <Brain className={`w-5 h-5 flex-shrink-0 ${currentView === 'quiz' ? 'text-white' : 'text-gray-500'}`} />
              <span className={`whitespace-nowrap transition-all duration-300 ${
                sidebarOpen ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 overflow-hidden'
              }`}>
                AI答题
              </span>
            </button>
            <button
              onClick={() => onViewChange('review')}
              className={`w-full flex items-center rounded-lg transition-all overflow-hidden ${
                sidebarOpen ? 'gap-3 px-4 py-3' : 'justify-center px-3 py-3'
              } ${
                currentView === 'review'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={!sidebarOpen ? '复习列表' : undefined}
            >
              <RefreshCw className={`w-5 h-5 flex-shrink-0 ${currentView === 'review' ? 'text-white' : 'text-gray-500'}`} />
              <span className={`whitespace-nowrap transition-all duration-300 ${
                sidebarOpen ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 overflow-hidden'
              }`}>
              复习列表
              </span>
            </button>
            <button
              onClick={() => onViewChange('agent')}
              className={`w-full flex items-center rounded-lg transition-all overflow-hidden ${
                sidebarOpen ? 'gap-3 px-4 py-3' : 'justify-center px-3 py-3'
              } ${
                currentView === 'agent'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={!sidebarOpen ? 'AI助手' : undefined}
            >
              <MessageSquare className={`w-5 h-5 flex-shrink-0 ${currentView === 'agent' ? 'text-white' : 'text-gray-500'}`} />
              <span className={`whitespace-nowrap transition-all duration-300 ${
                sidebarOpen ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 overflow-hidden'
              }`}>
                AI助手
              </span>
            </button>
            <button
              onClick={() => onViewChange('graph')}
              className={`w-full flex items-center rounded-lg transition-all overflow-hidden ${
                sidebarOpen ? 'gap-3 px-4 py-3' : 'justify-center px-3 py-3'
              } ${
                currentView === 'graph'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={!sidebarOpen ? '知识图谱' : undefined}
            >
              <Share2 className={`w-5 h-5 flex-shrink-0 ${currentView === 'graph' ? 'text-white' : 'text-gray-500'}`} />
              <span className={`whitespace-nowrap transition-all duration-300 ${
                sidebarOpen ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 overflow-hidden'
              }`}>
                知识图谱
              </span>
            </button>
            <button
              onClick={() => onViewChange('universe')}
              className={`w-full flex items-center rounded-lg transition-all overflow-hidden ${
                sidebarOpen ? 'gap-3 px-4 py-3' : 'justify-center px-3 py-3'
              } ${
                currentView === 'universe'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={!sidebarOpen ? '3D宇宙' : undefined}
            >
              <Globe className={`w-5 h-5 flex-shrink-0 ${currentView === 'universe' ? 'text-white' : 'text-gray-500'}`} />
              <span className={`whitespace-nowrap transition-all duration-300 ${
                sidebarOpen ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 overflow-hidden'
              }`}>
                3D宇宙
              </span>
            </button>
          </nav>

          {/* 退出登录 */}
          <Button
            onClick={onLogout}
            variant="ghost"
            className={`w-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 overflow-hidden ${
              sidebarOpen ? 'justify-start gap-3' : 'justify-center px-3'
            }`}
            title={!sidebarOpen ? '退出登录' : undefined}
          >
            <LogOut className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <span className={`whitespace-nowrap transition-all duration-300 ${
              sidebarOpen ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 overflow-hidden'
            }`}>
              退出登录
            </span>
          </Button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* 顶部栏 */}
        <header className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              variant="ghost"
              size="icon"
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5 text-gray-500" />
              ) : (
                <Menu className="w-5 h-5 text-gray-500" />
              )}
            </Button>
            <h1 className="text-gray-900">
              {currentView === 'knowledge' ? '知识点管理' : currentView === 'audio' ? '音频转写' : currentView === 'quiz' ? 'AI答题' : currentView === 'review' ? '复习列表' : currentView === 'agent' ? 'AI助手' : currentView === 'graph' ? '知识图谱' : '3D宇宙'}
            </h1>
          </div>
        </header>

        {/* 内容 */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
