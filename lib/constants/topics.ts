// lib/constants/topics.ts

import type { TopicCategory, TopicCategoryInfo } from '@/types';

export const TOPIC_CATEGORIES: Record<TopicCategory, TopicCategoryInfo> = {
  workplace: {
    id: 'workplace',
    name: '职场',
    icon: 'briefcase',
    description: '关于工作、同事、老板的那些事',
  },
  life: {
    id: 'life',
    name: '生活',
    icon: 'coffee',
    description: '日常生活中的槽点',
  },
  tech: {
    id: 'tech',
    name: '科技',
    icon: 'cpu',
    description: '科技圈的那些破事',
  },
  relationship: {
    id: 'relationship',
    name: '情感',
    icon: 'heart',
    description: '恋爱、婚姻、相亲...',
  },
  social: {
    id: 'social',
    name: '社会',
    icon: 'users',
    description: '社会现象观察',
  },
  custom: {
    id: 'custom',
    name: '自定义',
    icon: 'sparkles',
    description: '用户自定义话题',
  },
};

export const SYSTEM_TOPICS = [
  // 职场类
  { title: '为什么周一总是这么痛苦', category: 'workplace' },
  { title: '开会的时候都在想什么', category: 'workplace' },
  { title: '那些年我们遇到过的奇葩老板', category: 'workplace' },
  { title: '加班是我的错吗', category: 'workplace' },
  { title: '当同事说"就简单问个问题"时', category: 'workplace' },

  // 生活类
  { title: '当代年轻人的消费观', category: 'life' },
  { title: '为什么我们总是熬夜', category: 'life' },
  { title: '外卖救了我一命', category: 'life' },
  { title: '健身卡办了就没去过', category: 'life' },
  { title: '周末在家躺平的一天', category: 'life' },

  // 科技类
  { title: 'AI会取代我的工作吗', category: 'tech' },
  { title: '手机电量低于20%的焦虑', category: 'tech' },
  { title: '程序员为什么喜欢黑咖啡', category: 'tech' },
  { title: '当代码能运行时的心情', category: 'tech' },
  { title: 'ChatGPT写的代码比我还好', category: 'tech' },

  // 情感类
  { title: '相亲时那些尴尬的瞬间', category: 'relationship' },
  { title: '为什么我还不结婚', category: 'relationship' },
  { title: '前任突然发消息过来', category: 'relationship' },
  { title: '情人节一个人怎么过', category: 'relationship' },
  { title: '恋爱脑的日常', category: 'relationship' },

  // 社会类
  { title: '网红打卡地到底有什么好看的', category: 'social' },
  { title: '为什么大家都喜欢拍vlog', category: 'social' },
  { title: '社交媒体上的虚假人设', category: 'social' },
  { title: '当代年轻人的社交恐惧', category: 'social' },
  { title: '演唱会抢票的崩溃瞬间', category: 'social' },
] as const;

export function getCategories(): TopicCategoryInfo[] {
  return Object.values(TOPIC_CATEGORIES);
}

export function getCategoryById(id: TopicCategory): TopicCategoryInfo | undefined {
  return TOPIC_CATEGORIES[id];
}

export function getTopicsByCategory(category: TopicCategory): typeof SYSTEM_TOPICS {
  return SYSTEM_TOPICS.filter((topic) => topic.category === category) as unknown as typeof SYSTEM_TOPICS;
}
