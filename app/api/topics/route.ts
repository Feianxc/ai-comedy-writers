import { NextRequest, NextResponse } from 'next/server';
import { HOT_TOPICS } from '@/lib/constants';

const VALID_CATEGORIES = ['spring', 'tech', 'life', 'work', 'love'] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limitParam = searchParams.get('limit');

    let parsedLimit = 20;
    if (limitParam !== null) {
      const parsed = parseInt(limitParam, 10);
      if (Number.isNaN(parsed)) {
        return NextResponse.json(
          { code: 400, error: 'INVALID_PARAM', message: 'limit 必须为有效数字' },
          { status: 400 }
        );
      }
      parsedLimit = parsed;
    }

    const limit = Math.max(1, Math.min(parsedLimit, 100));

    if (
      category &&
      category !== 'all' &&
      !VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])
    ) {
      return NextResponse.json(
        {
          code: 400,
          error: 'INVALID_PARAM',
          message: `无效的分类，有效值为: ${VALID_CATEGORIES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    let topics = [...HOT_TOPICS];
    if (category && category !== 'all') {
      topics = topics.filter((topic) => topic.category === category);
    }

    topics.sort((a, b) => b.hot - a.hot);
    topics = topics.slice(0, limit);

    return NextResponse.json({
      code: 0,
      data: {
        topics,
        total: topics.length,
      },
    });
  } catch (error) {
    console.error('Topics API error:', error);
    return NextResponse.json(
      {
        code: 500,
        error: 'FETCH_FAILED',
        message: '获取话题失败',
      },
      { status: 500 }
    );
  }
}

