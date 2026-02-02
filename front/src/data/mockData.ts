// 模拟数据
export interface KnowledgePoint {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status?: string;
  reviewList?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  createdAt: Date;
  updatedAt: Date;
}

export interface AudioTranscription {
  id: string;
  name: string;
  audioUrl: string;
  originalText: string;
  polishedText?: string;
  evaluation?: string;
  createdAt: Date;
}

// 初始知识点数据
export const initialKnowledgePoints: KnowledgePoint[] = [
  {
    id: '1',
    title: 'React Hooks基础',
    content: `# React Hooks基础

React Hooks是React 16.8引入的新特性，允许在函数组件中使用状态和其他React特性。

## 常用Hooks

- **useState**: 管理组件状态
- **useEffect**: 处理副作用
- **useContext**: 使用Context

\`\`\`javascript
const [count, setCount] = useState(0);
\`\`\`

> Hooks让函数组件更加强大！`,
    tags: ['React', 'JavaScript', '前端'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: 'TypeScript类型系统',
    content: `# TypeScript类型系统

TypeScript提供了静态类型检查，帮助开发者在编译时发现错误，提高代码质量。

## 基本类型

| 类型 | 描述 | 示例 |
|------|------|------|
| string | 字符串 | \`"hello"\` |
| number | 数字 | \`42\` |
| boolean | 布尔值 | \`true\` |

\`\`\`typescript
interface User {
  name: string;
  age: number;
}
\`\`\``,
    tags: ['TypeScript', 'JavaScript', '编程语言'],
    reviewList: true, // 标记为需要复习
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '3',
    title: '数学公式与算法',
    content: `# 数学公式与算法

## 二次方程

二次方程的一般形式为：$ax^2 + bx + c = 0$

其解为：

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

## 欧拉公式

欧拉公式是数学中最美丽的公式之一：

$$e^{i\\pi} + 1 = 0$$

这个公式将五个最重要的数学常数联系在一起：
- $e$ (自然对数的底)
- $i$ (虚数单位)
- $\\pi$ (圆周率)
- $1$ (乘法单位元)
- $0$ (加法单位元)`,
    tags: ['数学', '算法', '公式'],
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25'),
  },
  {
    id: '4',
    title: '系统架构设计',
    content: `# 系统架构设计

## 微服务架构流程

下面是一个典型的微服务架构流程图：

\`\`\`mermaid
graph TD
    A[用户请求] --> B[API网关]
    B --> C[认证服务]
    B --> D[用户服务]
    B --> E[订单服务]
    B --> F[支付服务]
    
    C --> G[(用户数据库)]
    D --> G
    E --> H[(订单数据库)]
    F --> I[(支付数据库)]
    
    E --> J[消息队列]
    F --> J
    J --> K[通知服务]
\`\`\`

## 数据流向

\`\`\`mermaid
sequenceDiagram
    participant U as 用户
    participant G as API网关
    participant A as 认证服务
    participant O as 订单服务
    participant P as 支付服务
    
    U->>G: 创建订单请求
    G->>A: 验证token
    A-->>G: 验证成功
    G->>O: 创建订单
    O->>P: 发起支付
    P-->>O: 支付成功
    O-->>G: 订单创建成功
    G-->>U: 返回订单信息
\`\`\``,
    tags: ['架构', '微服务', '设计'],
    createdAt: new Date('2024-01-30'),
    updatedAt: new Date('2024-01-30'),
  },
];

// 初始音频转写数据
export const initialAudioTranscriptions: AudioTranscription[] = [];
