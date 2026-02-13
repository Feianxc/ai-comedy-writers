import { UserAgent, AIPersona } from '@/types';
import { getPersonaPrompt } from './persona-prompts';
import {
  ANTI_AI_STYLE_RULES,
  COMEDY_DENSITY_RULES,
  PHILOSOPHY_LOGIC_PROTOCOL,
  ROAST_WRITING_PROTOCOL,
} from '@/lib/prompt-style';

/**
 * 生成用户AI第一轮Prompt
 */
export function generateUserRound1Prompt(
  userAgent: UserAgent,
  persona: AIPersona,
  topic: string,
  otherAgents: string[]
): string {
  return `你是${userAgent.displayName}的AI替身，正在参与"AI吐槽大会"。

${getPersonaPrompt(persona)}
${ROAST_WRITING_PROTOCOL}
${PHILOSOPHY_LOGIC_PROTOCOL}
${ANTI_AI_STYLE_RULES}
${COMEDY_DENSITY_RULES}

【当前话题】：${topic}
【其他在场AI】：${otherAgents.join('、')}

【你的任务】：
作为第一个发言者，用你选择的人设风格对这个话题进行吐槽。

【要求】：
1. 严格按照${persona.name}的人设风格说话
2. 适当使用口头禅增强人设感
3. 针对"${topic}"进行吐槽，要有个人特色
4. 1-2句，长度控制在30-80字
5. 必须包含至少1个具体场景或动作细节
6. 结尾要有一句可单摘的金句
7. 直接输出吐槽内容，不要解释你的思路

现在请开始：`;
}

/**
 * 生成场控AI第一轮Prompt
 */
export function generateControllerRound1Prompt(
  controller: { name: string; systemPrompt: string; temperature: number },
  topic: string,
  userAiContent: string,
  previousContents?: string[]
): string {
  let prompt = controller.systemPrompt
    .replace('{topic}', topic)
    .replace('{userAiContent}', userAiContent);

  if (previousContents && previousContents.length > 0) {
    const contents = previousContents.map((c, i) => `${i + 1}. ${c}`).join('\n');
    prompt = prompt.replace('{previousContents}', contents);
  } else {
    prompt = prompt.replace('{previousContents}', userAiContent);
  }

  return prompt;
}

/**
 * 生成第二轮互动Prompt
 */
export function generateRound2Prompt(
  role: string,
  roleName: string,
  userDisplayName: string,
  _userPersona: string,
  round1Contents: { role: string; content: string }[]
): string {
  const round1Summary = round1Contents
    .map((msg) => `- ${msg.role}：${msg.content}`)
    .join('\n');

  return `你是${role}（${roleName}），继续参与"AI吐槽大会"的第二轮讨论。
${ROAST_WRITING_PROTOCOL}
${PHILOSOPHY_LOGIC_PROTOCOL}
${ANTI_AI_STYLE_RULES}
${COMEDY_DENSITY_RULES}

【第一轮讨论内容】：
${round1Summary}

【任务】：生成你的第二轮发言

【要求】：
1. 必须引用(@)至少一个其他AI的第一轮内容（**优先引用用户AI ${userDisplayName}**）
2. 对引用的内容进行回应或补充
3. 保持你的角色/人设风格
4. 延续吐槽话题，给出新角度
5. 长度控制在30-80字，1-2句
6. 必须包含1个具体场景/动作细节，避免空话
7. 收尾要有一句能单独传播的金句
8. 直接输出内容，格式如："@角色名 你的回应内容"

现在请开始：`;
}

/**
 * 构建AI消息数组
 */
export function buildMessages(
  systemPrompt: string,
  userContent: string
): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}
