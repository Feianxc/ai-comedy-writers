// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import { SYSTEM_TOPICS } from '@/lib/constants/topics';

const prisma = new PrismaClient();

async function main() {
  console.log('开始种子数据初始化...');

  // 清空现有话题数据（仅系统话题）
  await prisma.topic.deleteMany({
    where: { isSystem: true },
  });

  // 插入系统话题
  const topicsData = SYSTEM_TOPICS.map((topic) => ({
    title: topic.title,
    category: topic.category,
    hot: Math.floor(Math.random() * 1000) + 100,
    isSystem: true,
  }));

  const result = await prisma.topic.createMany({
    data: topicsData,
    skipDuplicates: true,
  });

  console.log(`成功创建 ${result.count} 个系统话题`);

  // 显示创建的话题
  const allTopics = await prisma.topic.findMany({
    where: { isSystem: true },
    orderBy: { category: 'asc' },
  });

  console.log('\n已创建的话题分类统计:');
  const categoryCount = allTopics.reduce((acc, topic) => {
    acc[topic.category] = (acc[topic.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(categoryCount).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} 个`);
  });

  console.log('\n种子数据初始化完成!');
}

main()
  .catch((e) => {
    console.error('种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
