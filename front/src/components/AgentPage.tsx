import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/axios';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  citations?: { title: string; snippet: string }[];
}

type DebugStoreResponse = {
  userId?: string;
  knowledgePointCount?: number;
  vectorStore?: {
    path?: string;
    exists?: boolean;
    numDimensions?: number | null;
    space?: string | null;
  };
  embeddings?: {
    provider?: string | null;
    ollamaBaseUrl?: string | null;
    ollamaModel?: string | null;
    enableLocalEmbeddings?: string | null;
    localEmbedDim?: string | null;
  };
};

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'bot', text: '你好！我是你的专属知识库AI助手。有什么可以帮你的吗？' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [storeInfo, setStoreInfo] = useState<DebugStoreResponse | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);
  const autoEnableAttemptedRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const refreshStoreInfo = async () => {
    try {
      const res = await apiClient.get('/ai/debug-store');
      setStoreInfo(res.data || null);
    } catch {
      setStoreInfo(null);
    }
  };

  useEffect(() => {
    refreshStoreInfo();
  }, []);

  const handleEnableVectorStore = async () => {
    if (isEnabling) return;
    setIsEnabling(true);
    try {
      const res = await apiClient.post('/ai/reindex');
      await refreshStoreInfo();
      const infoText = `已重建向量索引：知识点 ${res.data?.knowledgePointCount ?? 0} 条，文档块 ${res.data?.docCount ?? 0} 个。`;
      setMessages((prev) => [...prev, { sender: 'bot', text: infoText }]);
    } catch {
      setMessages((prev) => [...prev, { sender: 'bot', text: '重建索引失败，请稍后再试。' }]);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const userMessage: Message = { sender: 'user', text: inputValue };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    try {
      const res = await apiClient.post('/ai/rag-qa', { question: userMessage.text });
      const botMessage: Message = {
        sender: 'bot',
        text: String(res.data?.answer || ''),
        citations: res.data?.citations || []
      };
      setMessages((prev) => [...prev, botMessage]);
      refreshStoreInfo();
    } catch {
      const errorMessage: Message = { sender: 'bot', text: '抱歉，我遇到了一些问题，请稍后再试。' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const storeEnabled = !!storeInfo?.vectorStore?.exists;
  const knowledgePointCount = Number(storeInfo?.knowledgePointCount || 0);

  useEffect(() => {
    if (autoEnableAttemptedRef.current) return;
    if (isEnabling) return;
    if (!storeInfo) return;
    if (storeEnabled) return;
    if (!knowledgePointCount) return;
    autoEnableAttemptedRef.current = true;
    handleEnableVectorStore();
  }, [storeInfo, storeEnabled, knowledgePointCount, isEnabling]);

  return (
    <div className="flex flex-col h-[80vh] max-w-[800px] mx-auto border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex-1 p-5 overflow-y-auto bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="flex flex-col max-w-[70%]">
              <div
                className={`px-4 py-2 rounded-2xl leading-relaxed ${
                  msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'
                }`}
              >
                {msg.text}
              </div>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  来源：{msg.citations.map((c, i) => (
                    <span key={i} className="mr-2 inline-block bg-gray-100 rounded px-2 py-1" title={c.snippet}>
                      {c.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex mb-4 justify-start">
            <div className="px-4 py-2 rounded-2xl bg-gray-200 text-gray-900">
              思考中...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="px-3 py-2 border-t border-gray-200 bg-white flex items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          向量检索：{storeEnabled ? '已启用' : '未启用'}
          {storeInfo?.vectorStore?.numDimensions ? `（维度 ${storeInfo.vectorStore.numDimensions}）` : ''}
          {knowledgePointCount ? `，知识点 ${knowledgePointCount} 条` : ''}
        </div>
        {!storeEnabled && knowledgePointCount > 0 && (
          <button
            type="button"
            disabled={isEnabling}
            onClick={handleEnableVectorStore}
            className="px-4 py-2 rounded-2xl bg-blue-600 text-white disabled:opacity-50"
          >
            {isEnabling ? '启用中...' : '启用向量检索'}
          </button>
        )}
      </div>
      <form onSubmit={handleSendMessage} className="flex p-3 border-t border-gray-200 gap-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="在这里输入你的问题..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-2xl"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 rounded-2xl bg-blue-600 text-white"
        >
          {isLoading ? '思考中...' : '发送'}
        </button>
      </form>
    </div>
  );
}
