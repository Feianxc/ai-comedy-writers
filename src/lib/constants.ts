import { AIPersona, Topic } from '@/types';

/** AI人设预设库 */
export const PERSONAS: AIPersona[] = [
  {
    id: 'persona-toxic',
    name: '毒舌老哥',
    archetype: 'toxic',
    style: {
      tone: '犀利',
      length: 'short',
      emoji: false,
      meme: false,
    },
    signature: ['就这？', '那你很棒哦', '能不能行啊'],
    color: 'red-500',
    gradientFrom: 'red-400',
    gradientTo: 'red-600',
  },
  {
    id: 'persona-sarcastic',
    name: '阴阳大师',
    archetype: 'sarcastic',
    style: {
      tone: '反讽',
      length: 'medium',
      emoji: false,
      meme: true,
    },
    signature: ['不会吧不会吧', '真就XX啊', '那你开心就好'],
    color: 'purple-500',
    gradientFrom: 'purple-400',
    gradientTo: 'purple-600',
  },
  {
    id: 'persona-data',
    name: '数据帝',
    archetype: 'data',
    style: {
      tone: '理性',
      length: 'medium',
      emoji: false,
      meme: false,
    },
    signature: ['根据统计', '研究表明', '数据显示'],
    color: 'sky-500',
    gradientFrom: 'sky-400',
    gradientTo: 'sky-600',
  },
  {
    id: 'persona-meme',
    name: '热梗王',
    archetype: 'meme',
    style: {
      tone: '活泼',
      length: 'short',
      emoji: true,
      meme: true,
    },
    signature: ['家人们', '绝了', '笑死', '栓Q'],
    color: 'yellow-500',
    gradientFrom: 'yellow-400',
    gradientTo: 'yellow-500',
  },
  {
    id: 'persona-deadpan',
    name: '冷面评委',
    archetype: 'deadpan',
    style: {
      tone: '冷淡',
      length: 'medium',
      emoji: false,
      meme: false,
    },
    signature: ['本人建议', '数据说话', '客观来说'],
    color: 'slate-500',
    gradientFrom: 'slate-400',
    gradientTo: 'slate-600',
  },
];

/** 场控AI配置 */
export const CONTROL_AGENTS = [
  {
    id: 'agent-meme',
    name: '热梗王',
    color: 'amber-500',
    gradientFrom: 'amber-400',
    gradientTo: 'amber-600',
  },
  {
    id: 'agent-master',
    name: '吐槽大师',
    color: 'orange-500',
    gradientFrom: 'orange-400',
    gradientTo: 'orange-600',
  },
  {
    id: 'agent-judge',
    name: '冷面评委',
    color: 'slate-600',
    gradientFrom: 'slate-500',
    gradientTo: 'slate-700',
  },
];

/** 热门话题列表 */
export const HOT_TOPICS: Topic[] = [
  { id: 'topic-1', title: '#过年催婚', category: 'spring', hot: 95, isHot: true, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-2', title: '#年终奖太少', category: 'spring', hot: 88, isHot: true, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-3', title: '#春节不想回家', category: 'spring', hot: 72, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-4', title: '#拜年红包给多少', category: 'spring', hot: 65, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-5', title: '#亲戚问工资', category: 'spring', hot: 91, isHot: true, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-6', title: '#周一综合症', category: 'work', hot: 85, isHot: true, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-7', title: '#老板画的饼', category: 'work', hot: 78, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-8', title: '#下班不回消息', category: 'work', hot: 82, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-9', title: '#加班没有加班费', category: 'work', hot: 76, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-10', title: '#同事甩锅', category: 'work', hot: 69, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-11', title: '#减肥总是失败', category: 'life', hot: 74, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-12', title: '#熬夜刷手机', category: 'life', hot: 89, isHot: true, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-13', title: '#周末不想出门', category: 'life', hot: 66, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-14', title: '#外卖太贵了', category: 'life', hot: 71, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-15', title: '#房租太贵', category: 'life', hot: 80, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-16', title: '#前任突然联系', category: 'love', hot: 86, isHot: true, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-17', title: '#相亲遇到的奇葩', category: 'love', hot: 77, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-18', title: '#恋爱三年没结婚', category: 'love', hot: 62, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-19', title: '#AI要取代我', category: 'tech', hot: 93, isHot: true, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'topic-20', title: '#ChatGPT写的代码', category: 'tech', hot: 81, isSystem: true, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
];

/** 应用配置 */
export const APP_CONFIG = {
  SSE_TIMEOUT: 30000,
  API_TIMEOUT: 15000,
  MAX_RETRIES: 3,
  STREAM_REFRESH_INTERVAL: 16,
} as const;
