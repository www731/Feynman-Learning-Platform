# 费曼学习平台（ANDRIOkaifa）

面向学习者与教师的“费曼学习法”平台，支持知识点管理、错题归档、复习列表、向量检索 + RAG 问答、知识图谱与音频转写等核心能力，强调可用性与可验证性。

## 功能简介
- 知识点管理：增删改查，维护标题、内容、标签与状态
- 错题归档：测评提交后自动记录错题与解析
- 复习列表：评分小于 100 自动加入，支持移除与回顾
- 向量库与 RAG：用户隔离的本地索引（HNSWLib），多 Embeddings/LLM，可降级为检索片段预览
- AI 助手：问答、出题、评分、费曼尝试评估，返回引用提升可解释性
- 知识图谱：按内容引用与标签生成节点与边，支持前端可视化
- 音频转写：语音转文本便捷记录学习要点

## 技术栈
- 前端：React + Vite + TypeScript
- 后端：Node.js + Express
- 数据库：MongoDB
- 检索：LangChain + HNSWLib（本地索引）
- Embeddings：DeepSeek / OpenAI / Cohere / Ollama / 本地回退（可配置）
- LLM：百度千帆 / DeepSeek（可配置）
- 语音：Whisper API（可配置）

## 快速开始（Windows）
1. 安装 Node.js 18+ 与 MongoDB，并启动本地数据库
2. 可选配置环境变量：`DEEPSEEK_API_KEY`、`QIANFAN_API_KEY/SECRET` 等
3. 启动后端：
   ```powershell
   cd feynman-platform-backend
   npm install
   npm run start
   ```
4. 启动前端：
   ```powershell
   cd front
   npm install
   npm run dev
   ```
5. 基本验证接口：
   - 重新索引：POST /api/ai/reindex
   - 自检索引：GET /api/ai/debug-store
   - RAG 问答：POST /api/ai/rag-qa { question }

## 约定与规范
- UI：按钮统一蓝色、白字
- 渐进式与可验证：小步快跑，保持可编译与测试通过
- Windows 终端：避免使用 “&&”，分行执行命令
- 鉴权：私有接口统一使用 JWT；AI 接口可按需启用统一鉴权

## 参考与文档
- 模块开发卷宗（含 UML 图）：[template4.md](file:///d:/projects/ANDRIOkaifa/front/word/template4.md)
- 进度与报告：可见 front/word 下的系列模板（已忽略提交）

## 贡献
- 欢迎通过 Issue/PR 提交优化与功能建议
- 提交前确保通过编译与基本测试，遵循代码风格与约定
