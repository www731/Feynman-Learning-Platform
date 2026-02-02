import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Plus, Search, Edit, Trash2, Tag, Eye, Loader2, Terminal } from 'lucide-react';
import { KnowledgePoint } from '../data/mockData';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mermaid from 'mermaid';
import 'katex/dist/katex.min.css';
import { evaluateKnowledgePoint, updateKnowledgePoint, AIEvaluationResponse } from '../api/knowledgePoints';

// 共享的 Markdown 组件映射，带有表格样式
const markdownTableComponents: any = {
  table: ({ children }: any) => (
    <table className="table-auto w-full border-collapse border border-gray-200 text-sm">
      {children}
    </table>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-gray-50 text-gray-900">
      {children}
    </thead>
  ),
  tbody: ({ children }: any) => <tbody>{children}</tbody>,
  tr: ({ children }: any) => <tr className="even:bg-gray-50">{children}</tr>,
  th: ({ children }: any) => (
    <th className="border border-gray-200 px-3 py-2 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border border-gray-200 px-3 py-2">
      {children}
    </td>
  ),
};

// Mermaid组件
function MermaidComponent({ chart, id }: { chart: string; id: string }) {
  useEffect(() => {
    const renderMermaid = async () => {
      try {
        const { svg } = await mermaid.render(id, chart);
        const element = document.getElementById(id);
        if (element) {
          element.innerHTML = svg;
        }
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        const element = document.getElementById(id);
        if (element) {
          element.innerHTML = '<p>Mermaid图表渲染失败</p>';
        }
      }
    };
    renderMermaid();
  }, [chart, id]);

  return <div id={id} className="mermaid-container" />;
}

interface KnowledgePointsProps {
  knowledgePoints: KnowledgePoint[];
  onAdd: (point: Omit<KnowledgePoint, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, point: Partial<KnowledgePoint>) => void;
  onDelete: (id: string) => void;
}


export default function KnowledgePoints({
  knowledgePoints,
  onAdd,
  onUpdate,
  onDelete,
}: KnowledgePointsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingPoint, setViewingPoint] = useState<KnowledgePoint | null>(null);
  const [editingPoint, setEditingPoint] = useState<KnowledgePoint | null>(null);
  const [isAiEvaluating, setIsAiEvaluating] = useState(false);
  const [aiEvaluationResult, setAiEvaluationResult] = useState<AIEvaluationResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
  
  // 表单状态
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');

  // 过滤知识点
  const filteredPoints = knowledgePoints.filter(
    (point) =>
      point.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      point.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      point.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleExpand = (id: string) => {
    setExpandedStates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 初始化mermaid
  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
    mermaid.contentLoaded();
  }, [knowledgePoints]);

  // 组件卸载时清理状态
  useEffect(() => {
    return () => {
      // 清理所有状态
      setIsAddDialogOpen(false);
      setIsViewing(false);
      setViewingPoint(null);
      setEditingPoint(null);
      setIsAiEvaluating(false);
      setAiEvaluationResult(null);
      setAiError(null);
    };
  }, []);

  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormTags('');
    setEditingPoint(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = formTags.split(',').map((tag) => tag.trim()).filter(Boolean);
    
    if (editingPoint) {
      onUpdate(editingPoint.id, {
        title: formTitle,
        content: formContent,
        tags,
      });
    } else {
      onAdd({
        title: formTitle,
        content: formContent,
        tags,
      });
    }
    
    // 先重置表单，再关闭对话框
    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEditSave = () => {
    if (!editingPoint) return;
    
    const tags = formTags.split(',').map((tag) => tag.trim()).filter(Boolean);
    
    onUpdate(editingPoint.id, {
      title: formTitle,
      content: formContent,
      tags,
    });
    
    // 重置状态并关闭编辑模式
    resetForm();
    setIsEditing(false);
  };

  const handleEdit = (point: KnowledgePoint) => {
    setEditingPoint(point);
    setFormTitle(point.title);
    setFormContent(point.content);
    setFormTags(point.tags.join(', '));
    setIsEditing(true);
  };

  const handleView = (point: KnowledgePoint) => {
    setViewingPoint(point);
    setIsViewing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个知识点吗？')) {
      onDelete(id);
    }
  };

  const handleAiEvaluate = async () => {
    if (!viewingPoint) return;

    setIsAiEvaluating(true);
    setAiError(null);
    setAiEvaluationResult(null);

    try {
      const result = await evaluateKnowledgePoint(
        viewingPoint.title,
        viewingPoint.content
      );
      setAiEvaluationResult(result);

      const REVIEW_THRESHOLD = 100;
      if (result.score < REVIEW_THRESHOLD && !viewingPoint.reviewList) {
        try {
          // 自动调用API更新reviewList状态为true
          await updateKnowledgePoint(viewingPoint.id, { reviewList: true });
          
          // 更新本地状态
          onUpdate(viewingPoint.id, { reviewList: true });
          
          // 更新当前查看的知识点状态
          setViewingPoint({ ...viewingPoint, reviewList: true });
          
          console.log(`知识点 "${viewingPoint.title}" 评分为 ${result.score}，已自动标记为需要复习`);
        } catch (updateError) {
          console.error('更新reviewList状态失败:', updateError);
        }
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        'AI evaluating failed. Please try again.';
      setAiError(errorMsg);
    } finally {
      setIsAiEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 搜索和添加栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="搜索知识点标题、内容或标签..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 shadow-sm"
          />
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open && !editingPoint) {
            // 只有在非编辑模式下关闭时才重置表单
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2 text-white" />
              添加知识点
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-gray-200 text-gray-900 shadow-lg max-h-[90vh] w-[95vw] sm:max-w-[95vw] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-gray-900">{editingPoint ? '编辑知识点' : '添加新知识点'}</DialogTitle>
              <DialogDescription className="text-gray-600">
                {editingPoint ? '修改知识点信息' : '创建一个新的知识点'}
               </DialogDescription>
          </DialogHeader>
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0 overflow-y-auto">
              <div className="py-4 space-y-4 min-h-0">
                <div className="space-y-2 px-6">
                  <Label htmlFor="title" className="text-gray-700">标题</Label>
                  <Input
                    id="title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="bg-white border-gray-300 text-gray-900"
                    required
                  />
                </div>
                <div className="space-y-2 px-6">
                  <Label htmlFor="content" className="text-gray-700">内容</Label>
                  <div className="flex gap-4 min-h-0 h-[60vh]">
                    <div className="w-5/6 h-full overflow-y-auto">
                      <Textarea
                        id="content"
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        className="bg-white border-gray-300 text-gray-900 min-h-[300px] h-full w-full overflow-y-auto resize-none"
                        style={{ fieldSizing: 'fixed' } as any}
                        required
                      />
                    </div>
                    <div className="w-1/6 h-full border rounded p-2 overflow-y-auto bg-gray-50">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={markdownTableComponents}
                      >
                        {formContent || '（预览区域）'}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 px-6">
                  <Label htmlFor="tags" className="text-gray-700">
                    标签（用逗号分隔）
                  </Label>
                  <Input
                    id="tags"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="例如：React, JavaScript, 前端"
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 p-6 border-t flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    resetForm();
                    setIsAddDialogOpen(false);
                  }}
                  className="text-gray-600 hover:bg-gray-100"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingPoint ? '保存' : '添加'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 知识点列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPoints.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            {searchTerm ? '没有找到匹配的知识点' : '还没有知识点，点击"添加知识点"开始'}
          </div>
        ) : (
          filteredPoints.map((point) => (
            <Card
              key={point.id}
              className={`bg-white transition-all duration-300 flex flex-col relative ${
                point.reviewList 
                  ? 'border-2 border-red-300 shadow-red-200 shadow-lg hover:border-red-400' 
                  : 'border-gray-200 shadow-md hover:border-gray-300'
              }`}
            >
              {/* 左侧review侧边栏 */}
              {point.reviewList && (
                <div className="absolute inset-y-0 left-0 w-2 bg-red-500 rounded-l-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
              )}
              <CardHeader className={`flex-shrink-0 ${point.reviewList ? 'pl-8' : ''}`}>
                <CardTitle className={`text-lg truncate font-bold ${
                  point.reviewList ? 'text-red-700' : 'text-gray-900'
                }`}>
                  {point.title}
                  {point.reviewList && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      需要复习
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className={`px-6 pt-0 pb-2 ${point.reviewList ? 'pl-8' : ''}`}>
                <div 
                  className="text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors"
                  onClick={() => toggleExpand(point.id)}
                >
                  {expandedStates[point.id] ? (
                    <div className="fixed top-[10vh] left-[10vw] w-[80vw] h-[80vh] bg-white z-50 overflow-y-auto p-4 border-2 border-blue-500 rounded-lg shadow-2xl">
                      <div className="text-sm text-gray-600 p-2 bg-gray-50">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            ...markdownTableComponents,
                            code({node, inline, className, children, ...props}: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              if (match && match[1] === 'mermaid') {
                                const id = `mermaid-${point.id}-${Math.random().toString(36).substr(2, 9)}`;
                                const chart = String(children).replace(/\n$/, '');
                                return <MermaidComponent chart={chart} id={id} />;
                              }
                              return <code className={className} {...props}>{children}</code>;
                            }
                          }}
                        >
                          {point.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="line-clamp-3 bg-gray-50 p-2 rounded-md">
                      {point.content}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardContent className={`space-y-4 flex flex-col justify-between ${point.reviewList ? 'pl-8' : ''}`}>
                <div className="flex flex-wrap gap-2">
                  {point.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-gray-100 text-gray-700 border-gray-200"
                    >
                      <Tag className="w-3 h-3 mr-1 text-gray-500" />
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleView(point)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(point)}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(point.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 全屏查看知识点布局 */}
      {isViewing && viewingPoint && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ marginLeft: 'var(--sidebar-width, 0px)', overflow: 'hidden' }}>
          {/* 隐藏主界面滚动条 */}
          <style>{`body { overflow: hidden !important; }`}</style>
          {/* 顶部导航栏 */}
          <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsViewing(false);
                  setAiEvaluationResult(null);
                  setAiError(null);
                  setIsAiEvaluating(false);
                }}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-300 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回列表
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  {viewingPoint.title}
                </h1>
                <p className="text-gray-600 text-sm">
                  查看知识点详细内容 • 创建于 {viewingPoint.createdAt.toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {viewingPoint.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                {isAiEvaluating ? (
                  <Button variant="outline" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    分析中...
                  </Button>
                ) : aiEvaluationResult || aiError ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAiEvaluationResult(null);
                      setAiError(null);
                    }}
                  >
                    清除分析结果
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleAiEvaluate}
                  >
                    AI 智能分析
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setIsViewing(false);
                    setAiEvaluationResult(null);
                    setAiError(null);
                    setIsAiEvaluating(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                >
                  关闭
                </Button>
              </div>
            </div>
          </div>

          {/* 内容区域 - 自定义滚动系统 */}
          <div className="flex-1 p-6 relative z-10 overflow-hidden" style={{ scrollbarWidth: 'none' }}>
            <div className="max-w-4xl mx-auto min-h-0 relative">
              <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-6 relative" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                {/* 自定义滚动条 */}
                <div className="absolute right-2 top-2 bottom-2 w-2 bg-gray-200 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200">
                  <div 
                    className="absolute right-0 w-2 bg-blue-400 rounded-full hover:bg-blue-500 cursor-pointer transition-colors"
                    style={{ height: '30%', top: '0%' }}
                  />
                </div>
                <div className="max-w-none break-all whitespace-pre-wrap text-gray-800">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      ...markdownTableComponents,
                      h1: ({node, ...props}: any) => <h1 className="text-3xl font-bold my-6" {...props} />,
                      h2: ({node, ...props}: any) => <h2 className="text-2xl font-bold my-5" {...props} />,
                      h3: ({node, ...props}: any) => <h3 className="text-xl font-semibold my-4" {...props} />,
                      h4: ({node, ...props}: any) => <h4 className="text-lg font-semibold my-3" {...props} />,
                      p: ({node, ...props}: any) => <p className="my-4 leading-relaxed text-base break-all" {...props} />,
                      ul: ({node, ...props}: any) => <ul className="list-disc list-inside my-4 pl-6" {...props} />,
                      ol: ({node, ...props}: any) => <ol className="list-decimal list-inside my-4 pl-6" {...props} />,
                      li: ({node, ...props}: any) => <li className="my-2" {...props} />,
                      code({node, inline, className, children, ...props}: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        if (match && match[1] === 'mermaid') {
                          const id = `view-mermaid-${viewingPoint.id}-${Math.random().toString(36).substr(2, 9)}`;
                          const chart = String(children).replace(/\n$/, '');
                          return <MermaidComponent chart={chart} id={id} />;
                        }
                        return inline ? (
                          <code className="px-2 py-1 bg-gray-100 text-blue-600 rounded text-sm font-mono" {...props}>{children}</code>
                        ) : (
                          <pre className="bg-gray-100 p-4 rounded-lg my-4 overflow-x-auto border border-gray-200">
                            <code className={`language-${match ? match[1] : ''} text-sm`} {...props}>{children}</code>
                          </pre>
                        );
                      }
                    }}
                  >
                    {viewingPoint.content}
                  </ReactMarkdown>
                </div>

                {isAiEvaluating && (
                  <div className="mt-8 flex items-center justify-center text-gray-500 p-6 border border-gray-200 rounded-lg">
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    <span className="text-lg">AI 正在分析中，请稍候...</span>
                  </div>
                )}

                {aiError && (
                  <Alert variant="destructive" className="mt-8">
                    <Terminal className="h-5 w-5" />
                    <AlertTitle className="text-lg">分析出错</AlertTitle>
                    <AlertDescription className="text-base">{aiError}</AlertDescription>
                  </Alert>
                )}

                {aiEvaluationResult && (
                  <div className="mt-8 border-t pt-8">
                    <h3 className="text-2xl font-bold mb-6 text-gray-900 border-b pb-3">AI 智能分析结果</h3>
                    <div className="space-y-6 text-base">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-700 text-lg mb-2">润色后文本</h4>
                        <p className="p-4 bg-white border rounded text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {aiEvaluationResult.polishedText}
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-700 text-lg mb-2">综合评价</h4>
                        <p className="text-gray-800 mt-2 leading-relaxed">{aiEvaluationResult.evaluation}</p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-green-800 text-lg mb-3">优点</h4>
                          <ul className="list-disc list-inside text-green-700 space-y-2">
                            {aiEvaluationResult.strengths.map((s, i) => (
                              <li key={i} className="leading-relaxed">{s}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-yellow-800 text-lg mb-3">可改进点</h4>
                          <ul className="list-disc list-inside text-yellow-700 space-y-2">
                            {aiEvaluationResult.weaknesses.map((w, i) => (
                              <li key={i} className="leading-relaxed">{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-6 rounded-lg text-center">
                        <h4 className="font-semibold text-blue-800 text-lg mb-2">综合得分</h4>
                        <p className="font-bold text-4xl text-blue-600">{aiEvaluationResult.score} / 100</p>
                        <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                          <div 
                            className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                            style={{ width: `${aiEvaluationResult.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 全屏编辑知识点布局 */}
      {isEditing && editingPoint && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ marginLeft: 'var(--sidebar-width, 0px)' }}>
          {/* 隐藏主界面滚动条 */}
          <style>{`body { overflow: hidden !important; }`}</style>
          {/* 顶部导航栏 */}
          <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  resetForm();
                }}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-300 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回列表
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" />
                  编辑知识点
                </h1>
                <p className="text-gray-600 text-sm">
                  编辑知识点内容 • 创建于 {editingPoint.createdAt.toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  setIsEditing(false);
                  resetForm();
                }}
                variant="outline"
                className="text-gray-600 hover:text-gray-900"
              >
                取消
              </Button>
              <Button
                onClick={handleEditSave}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                保存更改
              </Button>
            </div>
          </div>

          {/* 编辑内容区域 */}
          <div className="flex-1 min-h-0 overflow-y-auto">
             <div>
              <div className="w-full p-6 space-y-6">
                {/* 标题输入 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    标题
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入知识点标题"
                  />
                </div>

                {/* 标签输入 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    标签 (用逗号分隔)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如: React, JavaScript, 前端"
                  />
                </div>

                <div className="space-y-2 px-6">
                  <Label htmlFor="content" className="text-gray-700">内容</Label>
                  <div className="flex gap-4 min-h-0 h-[calc(100vh-220px)]">
                    <div className="w-5/6 h-full overflow-y-auto">
                      <Textarea
                        id="content"
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        className="bg-white border-gray-300 text-gray-900 min-h-[300px] h-full w-full overflow-y-auto resize-none"
                        style={{ fieldSizing: 'fixed' } as any}
                        required
                      />
                    </div>
                    <div className="w-1/6 h-full border rounded p-2 overflow-y-auto bg-gray-50">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={markdownTableComponents}
                      >
                        {formContent || '（预览区域）'}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
