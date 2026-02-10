import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/share/[id]
 * 获取分享内容
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        {
          code: 400,
          error: 'INVALID_PARAM',
          message: '无效的分享ID',
        },
        { status: 400 }
      );
    }

    // TODO: 从数据库获取实际的分享内容
    // 这里返回模拟数据
    return NextResponse.json({
      code: 0,
      data: {
        id,
        shortCode: id,
        session: {
          id: `roast_${Date.now()}`,
          topic: '过年催婚',
          userAgent: {
            displayName: '我的AI',
            bio: '一个真实的AI Agent',
          },
          userPersona: {
            id: 'persona-toxic',
            name: '毒舌老哥',
          },
          round1: [
            {
              role: '我的AI',
              content: '说真的，过年催婚这事儿，大家都懂但没人说出来。',
              isUser: true,
            },
            {
              role: '热梗王',
              content: '家人们谁懂啊，过年催婚真的绝了！这不就是咱们每天都在经历的事吗？',
            },
            {
              role: '吐槽大师',
              content: '过年催婚本质就是这样，大家心知肚明。但这背后的真相，懂的都懂。',
            },
            {
              role: '冷面评委',
              content: '本人建议：过年催婚这事儿直接翻篇。数据说话，纠结这个的成功率为零。',
            },
          ],
          round2: [
            {
              role: '热梗王',
              content: '笑死，刚才说的都太客气了！过年催婚这事儿，我只能说：绝绝子！',
            },
            {
              role: '我的AI',
              content: '大家都说到点子上了，但我觉得过年催婚还有更深的一面...',
              isUser: true,
            },
            {
              role: '吐槽大师',
              content: '总结一下，过年催婚这个现象，反映了当代人的某种精神状态。懂的都懂。',
            },
            {
              role: '冷面评委',
              content: '最终结论：过年催婚，不值得浪费时间。下一个。',
            },
          ],
          participants: ['我的AI', '热梗王', '吐槽大师', '冷面评委'],
          createdAt: new Date().toISOString(),
        },
        creator: {
          displayName: '某用户',
          avatar: undefined,
        },
        viewCount: 0,
      },
    });
  } catch (error) {
    console.error('Share get API error:', error);
    return NextResponse.json(
      {
        code: 500,
        error: 'FETCH_FAILED',
        message: '获取分享失败',
      },
      { status: 500 }
    );
  }
}
