const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// 延迟加载依赖，避免缺少编译环境时整个后端崩溃
let HNSWLib, OpenAIEmbeddings, CohereEmbeddings, OllamaEmbeddings, RecursiveCharacterTextSplitter;
try {
  HNSWLib = require('@langchain/community/vectorstores/hnswlib').HNSWLib;
  OpenAIEmbeddings = require('@langchain/openai').OpenAIEmbeddings;
  // 可选的嵌入提供方：Cohere 与本地 Ollama
  try { CohereEmbeddings = require('@langchain/cohere').CohereEmbeddings; } catch {}
  try { OllamaEmbeddings = require('@langchain/ollama').OllamaEmbeddings; } catch {}
  RecursiveCharacterTextSplitter = require('langchain/text_splitter').RecursiveCharacterTextSplitter;
} catch (e) {
  console.warn('RAG依赖未安装或加载失败，向量化功能将暂时不可用：', e.message);
}

const VECTOR_STORE_ROOT = path.join(__dirname, '../vector_store');

function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value?.toString) return value.toString();
  return String(value);
}

function getVectorStorePath(userId) {
  const uid = normalizeId(userId).trim();
  if (!uid) return VECTOR_STORE_ROOT;
  return path.join(VECTOR_STORE_ROOT, uid);
}

// 初始化Embedding模型，支持多提供方
function getEmbeddings() {
  const provider = (process.env.EMBEDDINGS_PROVIDER || 'deepseek').toLowerCase();

  // DeepSeek：当前官方不提供 /v1/embeddings，直接跳过并给出提示
  if (provider === 'deepseek') {
    const enableLocal = (process.env.ENABLE_LOCAL_EMBEDDINGS || 'true').toLowerCase() === 'true';
    console.warn('提示：当前选择 EMBEDDINGS_PROVIDER=deepseek。DeepSeek 暂不提供 embeddings API。');
    if (enableLocal) {
      console.warn('已启用本地简易 Embeddings 回退，仅用于开发验证。');
      return getLocalEmbeddings();
    }
    console.warn('向量化将跳过。可改用 openai、cohere 或 ollama。');
    return null;
  }

  // OpenAI
  if (provider === 'openai') {
    if (!OpenAIEmbeddings) return null;
    if (!process.env.OPENAI_API_KEY) {
      console.warn('未配置 OPENAI_API_KEY，无法使用 OpenAI embeddings。');
      return null;
    }
    try {
      const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
      const model = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
      console.log(`使用 OpenAI Embeddings，模型：${model}，baseURL：${baseURL}`);
      return new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY, baseURL, model });
    } catch (err) {
      console.error('初始化 OpenAI Embeddings 失败：', err.message);
      return null;
    }
  }

  // Cohere
  if (provider === 'cohere') {
    if (!CohereEmbeddings) {
      console.warn('未安装 @langchain/cohere，无法使用 Cohere embeddings。');
      return null;
    }
    if (!process.env.COHERE_API_KEY) {
      console.warn('未配置 COHERE_API_KEY，无法使用 Cohere embeddings。');
      return null;
    }
    try {
      const model = process.env.COHERE_EMBED_MODEL || 'embed-english-v3.0';
      console.log(`使用 Cohere Embeddings，模型：${model}`);
      return new CohereEmbeddings({ apiKey: process.env.COHERE_API_KEY, model });
    } catch (err) {
      console.error('初始化 Cohere Embeddings 失败：', err.message);
      return null;
    }
  }

  // 本地 Ollama
  if (provider === 'ollama') {
    if (!OllamaEmbeddings) {
      console.warn('未安装 @langchain/ollama，无法使用 Ollama embeddings。');
      return null;
    }
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
    console.log(`使用 Ollama Embeddings，模型：${model}，baseUrl：${baseUrl}`);
    try {
      return new OllamaEmbeddings({ baseUrl, model });
    } catch (err) {
      console.error('初始化 Ollama Embeddings 失败：', err.message);
      return null;
    }
  }

  console.warn(`未知的 EMBEDDINGS_PROVIDER: ${provider}，向量化将跳过。`);
  return null;
}

// 本地简易 Embeddings（开发验证用，非生产）
function getLocalEmbeddings() {
  const dim = parseInt(process.env.LOCAL_EMBED_DIM || '768', 10);
  const toVector = (text) => {
    const hash = crypto.createHash('sha256').update(String(text)).digest();
    const bytes = Buffer.concat([hash, hash, hash]); // 扩展为足够长度
    const out = new Array(dim);
    for (let i = 0; i < dim; i++) {
      // 将字节映射到 [-1,1] 浮点数，保持确定性
      out[i] = (bytes[i % bytes.length] / 127.5) - 1.0;
    }
    return out;
  };
  return {
    // 兼容 LangChain Embeddings 接口
    embedDocuments: async (documents) => documents.map(toVector),
    embedQuery: async (query) => toVector(query),
  };
}

function getTextSplitter() {
  if (!RecursiveCharacterTextSplitter) return null;
  return new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
}

async function ensureDir(p) {
  try {
    await fs.promises.mkdir(p, { recursive: true });
  } catch {}
}

async function clearVectorStoreDir(storePath) {
  try {
    if (!storePath) return;
    if (!fs.existsSync(storePath)) return;
    await fs.promises.rm(storePath, { recursive: true, force: true });
  } catch (e) {
    console.warn('清理向量库目录失败：', e?.message || e);
  }
}

/**
 * 将知识点内容向量化并保存到本地向量库
 * @param {object} knowledgePoint - 包含 _id 和 content 的知识点对象
 */
exports.addKnowledgePointToStore = async (knowledgePoint) => {
  try {
    const embeddings = getEmbeddings();
    const splitter = getTextSplitter();
    if (!HNSWLib || !embeddings || !splitter) {
      console.warn('向量化依赖或嵌入提供方不可用，跳过向量化流程。请安装并配置: langchain, @langchain/community, hnswlib-node（可选：@langchain/cohere 或 @langchain/ollama）');
      return;
    }

    console.log(`正在为知识点 ${knowledgePoint._id} 创建向量...`);

    const title = knowledgePoint.title || '';
    const tags = Array.isArray(knowledgePoint.tags) ? knowledgePoint.tags : [];
    const content = knowledgePoint.content || '';
    const combinedText = [title, tags.join(','), content].filter(Boolean).join('\n');

    // 1. 分割文本
    const docs = await splitter.createDocuments([
      combinedText
    ], [{
      knowledgePointId: normalizeId(knowledgePoint._id),
      knowledgePointTitle: title,
      knowledgePointTags: tags,
      userId: normalizeId(knowledgePoint.user),
    }]);
    console.log(`知识点被分割成 ${docs.length} 个文本块。`);

    const storePath = getVectorStorePath(knowledgePoint.user);
    await ensureDir(storePath);

    // 2. 加载或创建向量库
    let vectorStore;
    try {
      vectorStore = await HNSWLib.load(storePath, embeddings);
      await vectorStore.addDocuments(docs);
      console.log('向已存在的向量库中添加了新文档。');
    } catch (e) {
      console.log('未找到现有向量库，正在创建新的...');
      vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
    }

    // 3. 保存到磁盘
    await vectorStore.save(storePath);
    console.log(`知识点 ${knowledgePoint._id} 的向量已成功保存。`);
  } catch (error) {
    console.error('添加到向量库失败:', error);
  }
};

exports.rebuildVectorStore = async (knowledgePoints, userId) => {
  const embeddings = getEmbeddings();
  const splitter = getTextSplitter();
  if (!HNSWLib || !embeddings || !splitter) {
    return { ok: false, reason: '向量化依赖或嵌入提供方不可用' };
  }

  const kps = Array.isArray(knowledgePoints) ? knowledgePoints : [];
  const storePath = getVectorStorePath(userId);
  if (kps.length === 0) {
    await clearVectorStoreDir(storePath);
    return { ok: true, knowledgePointCount: 0, docCount: 0 };
  }

  const allDocs = [];
  for (const kp of kps) {
    const title = kp.title || '';
    const tags = Array.isArray(kp.tags) ? kp.tags : [];
    const content = kp.content || '';
    const combinedText = [title, tags.join(','), content].filter(Boolean).join('\n');
    const docs = await splitter.createDocuments([combinedText], [{
      knowledgePointId: normalizeId(kp._id),
      knowledgePointTitle: title,
      knowledgePointTags: tags,
      userId: normalizeId(kp.user),
    }]);
    allDocs.push(...docs);
  }

  await clearVectorStoreDir(storePath);
  await ensureDir(storePath);
  const vectorStore = await HNSWLib.fromDocuments(allDocs, embeddings);
  await vectorStore.save(storePath);
  return { ok: true, knowledgePointCount: kps.length, docCount: allDocs.length };
};
exports.queryVectorStore = async (query, k = 4, userId) => {
  try {
    const embeddings = getEmbeddings();
    if (!HNSWLib || !embeddings) return [];
    const storePath = getVectorStorePath(userId);
    const vectorStore = await HNSWLib.load(storePath, embeddings);
    const retriever = vectorStore.asRetriever(k);
    const docs = await retriever.invoke(query);
    return docs;
  } catch (error) {
    if (String(error.message || '').includes('No such file')) return [];
    throw error;
  }
};
exports.getRetriever = async (k = 4, userId) => {
  const embeddings = getEmbeddings();
  if (!HNSWLib || !embeddings) return null;
  try {
    const storePath = getVectorStorePath(userId);
    const vectorStore = await HNSWLib.load(storePath, embeddings);
    // 维度一致性预检，避免检索阶段抛出异常
    try {
      const argsPath = path.join(storePath, 'args.json');
      const expectedDims = (() => {
        try {
          const raw = require('fs').readFileSync(argsPath, 'utf-8');
          const json = JSON.parse(raw);
          return Number(json?.numDimensions || 0);
        } catch { return 0; }
      })();
      const probe = await embeddings.embedQuery('probe');
      const actualDims = Array.isArray(probe) ? probe.length : 0;
      if (expectedDims && actualDims && expectedDims !== actualDims) {
        console.warn(`向量维度不一致：索引维度=${expectedDims}，查询维度=${actualDims}。请重启后端或重建索引。`);
        return null;
      }
    } catch (e) {
      console.warn('维度预检失败：', e?.message || e);
    }
    return vectorStore.asRetriever(k);
  } catch (error) {
    const msg = String(error.message || '');
    if (msg.includes('No such file') || msg.includes('no such file')) {
      console.warn('未找到向量库文件，检索不可用。');
      return null;
    }
    console.error('加载向量库失败：', msg);
    return null;
  }
};
