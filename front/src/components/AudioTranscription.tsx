import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Mic, Upload, Play, Pause, Sparkles, MessageSquare, FileAudio, Loader2, Terminal, Trash2, Save } from 'lucide-react';
import { AudioTranscription } from '../data/mockData';
import { transcribeAudio, evaluateAudio, polishText, AIEvaluationResponse, PolishResponse } from '../api/audio';

interface AudioTranscriptionProps {
  transcriptions: AudioTranscription[];
  onAddTranscription: (transcription: Omit<AudioTranscription, 'id' | 'createdAt'>) => void;
  onUpdateTranscription: (id: string, updates: Partial<Omit<AudioTranscription, 'id' | 'createdAt'>>) => void;
  onDeleteTranscription: (id: string) => void;
}

export default function AudioTranscriptionComponent({
  transcriptions,
  onAddTranscription,
  onUpdateTranscription,
  onDeleteTranscription,
}: AudioTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [polishedText, setPolishedText] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [aiResult, setAiResult] = useState<AIEvaluationResponse | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knowledgePointContent, setKnowledgePointContent] = useState('');
  const [activeTab, setActiveTab] = useState('original');
  const [currentTranscriptionId, setCurrentTranscriptionId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // 清理 blob URL 的函数
  const cleanupAudioUrl = (url: string | null) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      // 清理当前音频 URL
      cleanupAudioUrl(currentAudio);
      
      // 停止录音相关资源
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 当 currentAudio 改变时，清理旧的 URL
  useEffect(() => {
    return () => {
      cleanupAudioUrl(currentAudio);
    };
  }, [currentAudio]);

  // 开始录音
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `录音_${new Date().toLocaleString('zh-CN')}.webm`, { type: 'audio/webm' });
        
        // 清理旧的音频 URL
        cleanupAudioUrl(currentAudio);
        
        const url = URL.createObjectURL(blob);
        
        setCurrentAudio(url);
        setCurrentFile(file);
        setCurrentFileName(file.name);
        
        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
    } catch (err: any) {
      setError(`无法访问麦克风: ${err.message}`);
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  // 上传音频文件
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 清理旧的音频 URL
      cleanupAudioUrl(currentAudio);
      
      const url = URL.createObjectURL(file);
      setCurrentAudio(url);
      setCurrentFile(file);
      setCurrentFileName(file.name);
      setOriginalText('');
      setPolishedText('');
      setEvaluation('');
      setAiResult(null);
      setError(null);
    }
  };

  // 播放/暂停音频
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 音频转写
  const handleTranscribe = async () => {
    if (!currentFile) {
      setError('请先选择或录制音频文件');
      return;
    }

    setIsTranscribing(true);
    setError(null);
    setOriginalText('');

    try {
      const result = await transcribeAudio(currentFile);
      setOriginalText(result.result);
      // 自动同步转写结果到知识点内容输入框
      setKnowledgePointContent(result.result);
      
      // 自动保存转写记录
      if (currentAudio && result.result) {
        const newTranscription = {
          name: currentFileName,
          audioUrl: currentAudio,
          originalText: result.result,
        };
        const transcriptionId = Date.now().toString(); // 生成ID
        setCurrentTranscriptionId(transcriptionId);
        onAddTranscription(newTranscription);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.msg || '音频转写失败，请重试';
      setError(errorMsg);
    } finally {
      setIsTranscribing(false);
    }
  };

  // AI评教
  const handleEvaluate = async () => {
    if (!originalText.trim()) {
      setError('请先完成音频转写');
      return;
    }
    
    if (!knowledgePointContent.trim()) {
      setError('请输入原始知识点内容');
      return;
    }

    setIsEvaluating(true);
    setError(null);
    setAiResult(null);

    try {
      const result = await evaluateAudio(knowledgePointContent, originalText);
      setAiResult(result);
      setPolishedText(result.polishedText);
      setEvaluation(result.evaluation);
      // 自动跳转到AI评教标签页
      setActiveTab('evaluation');
      
      // 更新已保存的转写记录
      if (currentTranscriptionId) {
        onUpdateTranscription(currentTranscriptionId, {
          polishedText: result.polishedText,
          evaluation: result.evaluation,
        });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'AI评教失败，请重试';
      setError(errorMsg);
    } finally {
      setIsEvaluating(false);
    }
  };

  // AI润色
  const handlePolish = async () => {
    if (!originalText.trim()) {
      setError('请先完成音频转写');
      return;
    }

    setIsPolishing(true);
    setError(null);
    setPolishedText('');

    try {
      const result = await polishText(originalText);
      setPolishedText(result.polishedText);
      // 自动跳转到AI润色标签页
      setActiveTab('polished');
      
      // 更新已保存的转写记录
      if (currentTranscriptionId) {
        onUpdateTranscription(currentTranscriptionId, {
          polishedText: result.polishedText,
        });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'AI润色失败，请重试';
      setError(errorMsg);
    } finally {
      setIsPolishing(false);
    }
  };

  // 保存AI评教结果
  const handleSaveEvaluation = () => {
    if (!currentAudio || !originalText || !evaluation || !aiResult) {
      alert('请确保有完整的转写内容和AI评教结果');
      return;
    }

    const transcriptionId = Date.now().toString();
    const newTranscription = {
      id: transcriptionId,
      name: currentFileName || `评教记录_${new Date().toLocaleString()}`,
      audioUrl: currentAudio,
      originalText,
      polishedText,
      evaluation,
      aiResult,
      knowledgePointContent,
      createdAt: new Date().toISOString(),
    };

    onAddTranscription(newTranscription);
    
    // 清理状态
    cleanupAudioUrl(currentAudio);
    setCurrentAudio(null);
    setCurrentFile(null);
    setCurrentFileName('');
    setOriginalText('');
    setPolishedText('');
    setEvaluation('');
    setAiResult(null);
    setKnowledgePointContent('');
    setActiveTab('original');
    setCurrentTranscriptionId(null);
    
    alert('AI评教结果已保存！');
  };

  // 删除转写记录
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`确定要删除转写记录"${name}"吗？此操作不可撤销。`)) {
      onDeleteTranscription(id);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>操作失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 录音和上传区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 录音卡片 */}
        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Mic className="w-5 h-5 text-gray-500" />
              录音
            </CardTitle>
            <CardDescription className="text-gray-600">
              点击按钮开始录音
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isRecording && (
              <div className="text-center">
                <div className="text-red-600 mb-2">{formatTime(recordingTime)}</div>
                <Progress value={(recordingTime % 60) * 100 / 60} className="h-2" />
              </div>
            )}
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-full ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isTranscribing}
            >
              <Mic className={`w-4 h-4 mr-2 ${isRecording ? 'text-white' : 'text-white'}`} />
              {isRecording ? '停止录音' : '开始录音'}
            </Button>
          </CardContent>
        </Card>

        {/* 上传音频卡片 */}
        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-gray-500" />
              上传音频
            </CardTitle>
            <CardDescription className="text-gray-600">
              支持 MP3, WAV, M4A 格式
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isTranscribing}
            >
              <Upload className="w-4 h-4 mr-2 text-white" />
              选择音频文件
            </Button>
          </CardContent>
        </Card>
      </div>



      {/* 音频处理区域 */}
      {currentAudio && (
        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <FileAudio className="w-5 h-5 text-gray-500" />
              {currentFileName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 音频播放器 */}
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={togglePlayback}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </Button>
              <audio 
                ref={audioRef} 
                src={currentAudio} 
                onEnded={() => setIsPlaying(false)}
                onError={(e) => {
                  console.error('音频加载错误:', e);
                  setError('音频文件加载失败，请重新选择文件');
                  setIsPlaying(false);
                }}
                onLoadStart={() => setError(null)}
              />
            </div>

            {/* 转写按钮 */}
            <div className="text-center space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center justify-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  音频转写
                </h3>
                {isTranscribing && (
                  <div className="mt-3">
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">正在处理音频文件，请稍候...</p>
                  </div>
                )}
              </div>
            </div>

            {/* 转写文本处理 */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                <TabsTrigger value="original" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-700">
                  转写结果
                </TabsTrigger>
                <TabsTrigger value="polished" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-700">
                  AI润色
                </TabsTrigger>
                <TabsTrigger value="evaluation" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-700">
                  AI评教
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="original" className="space-y-4">
                <Textarea
                  placeholder="转写结果将显示在这里..."
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  className="min-h-[200px] bg-gray-50"
                  readOnly={isTranscribing}
                />
                {/* 在转写结果模块下面添加开始转写按钮 */}
                <div className="flex justify-center">
                  <Button
                    onClick={handleTranscribe}
                    disabled={!currentFile || isTranscribing}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    {isTranscribing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        正在转写
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        开始转写
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="polished" className="space-y-4">
                <Textarea
                  placeholder="AI润色后的文本将显示在这里..."
                  value={polishedText}
                  readOnly
                  className="min-h-[200px] bg-gray-50"
                />
                <Textarea
                  placeholder="请输入原始知识点内容..."
                  value={knowledgePointContent}
                  onChange={(e) => setKnowledgePointContent(e.target.value)}
                  className="min-h-[100px] bg-gray-50"
                />
                {/* 在AI润色模块添加开始AI润色按钮 */}
                <div className="flex justify-center">
                  <Button
                    onClick={handlePolish}
                    disabled={!originalText || isPolishing}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    {isPolishing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        正在润色
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        开始AI润色
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="evaluation" className="space-y-4">
                <Textarea
                  placeholder="请输入原始知识点内容..."
                  value={knowledgePointContent}
                  onChange={(e) => setKnowledgePointContent(e.target.value)}
                  className="min-h-[100px] bg-gray-50"
                />
                <Textarea
                  placeholder="AI评教结果将显示在这里..."
                  value={evaluation}
                  readOnly
                  className="min-h-[200px] bg-gray-50"
                />
                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      handleEvaluate();
                      setActiveTab('evaluation');
                    }}
                    disabled={!originalText || !knowledgePointContent || isEvaluating}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        正在评价
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        开始评教
                      </>
                    )}
                  </Button>
                </div>
                {aiResult && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">详细评分</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">综合得分：</span>
                        <span className="text-2xl font-bold text-blue-600 ml-2">{aiResult.score}/100</span>
                      </div>
                      <div>
                        <span className="font-medium text-green-600">优点：</span>
                        <ul className="list-disc list-inside mt-1 text-green-700">
                          {aiResult.strengths.map((strength, index) => (
                            <li key={index}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-medium text-yellow-600">可改进点：</span>
                        <ul className="list-disc list-inside mt-1 text-yellow-700">
                          {aiResult.weaknesses.map((weakness, index) => (
                            <li key={index}>{weakness}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* 操作按钮 */}
            <div className="flex gap-2 justify-center">
              <Button
                onClick={handleEvaluate}
                disabled={!originalText || !knowledgePointContent || isEvaluating}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI评教中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI评教
                  </>
                )}
              </Button>
              
              {/* AI评教保存记录按钮 */}
              {evaluation && aiResult && (
                <Button
                  onClick={handleSaveEvaluation}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <Save className="w-4 h-4 mr-2" />
                  保存记录
                </Button>
              )}

            </div>
          </CardContent>
        </Card>
      )}

      {/* 历史记录 */}
      {transcriptions.length > 0 && (
        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-gray-900">转写历史</CardTitle>
            <CardDescription className="text-gray-600">
              查看之前的转写记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transcriptions.map((transcription) => (
                <div key={transcription.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{transcription.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{transcription.originalText}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        {transcription.createdAt.toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(transcription.id, transcription.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
