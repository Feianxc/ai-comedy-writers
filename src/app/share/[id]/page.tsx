import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ShareCard } from '@/components/business';
import { prisma } from '@/lib/db';
import type { RoastMessage, RoastSession } from '@/types';

interface SharePageProps {
  params: Promise<{ id: string }>;
}

function toRoastMessages(value: unknown): RoastMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const messages: RoastMessage[] = [];
  for (const item of value) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const row = item as Record<string, unknown>;
      if (typeof row.role !== 'string' || typeof row.content !== 'string') {
        continue;
      }

      messages.push({
        role: row.role,
        content: row.content,
        isUser: typeof row.isUser === 'boolean' ? row.isUser : undefined,
      });
  }

  return messages;
}

async function getShareByCode(shortCode: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(shortCode)) {
    return null;
  }

  const share = await prisma.shareCard.findUnique({
    where: { shortCode },
    include: {
      session: true,
      user: {
        select: {
          displayName: true,
          avatar: true,
        },
      },
    },
  });

  if (!share) {
    return null;
  }

  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    return null;
  }

  const userAgentConfig = share.session.userAgentConfig as Record<string, unknown>;
  const session: RoastSession = {
    id: share.session.id,
    topic: share.session.topic,
    userId: share.session.userId,
    userAgent: {
      id: share.session.userAgentId,
      displayName: (userAgentConfig.displayName as string) ?? share.user.displayName,
      bio: typeof userAgentConfig.bio === 'string' ? userAgentConfig.bio : undefined,
      interests: Array.isArray(userAgentConfig.interests)
        ? (userAgentConfig.interests as string[])
        : undefined,
      avatar: typeof userAgentConfig.avatar === 'string' ? userAgentConfig.avatar : undefined,
    },
    round1: toRoastMessages(share.session.round1),
    round2: toRoastMessages(share.session.round2),
    participants: share.session.participants,
    createdAt: share.session.createdAt,
    imageUrl: share.imageUrl,
  };

  return {
    id: share.id,
    shortCode: share.shortCode,
    session,
    creator: {
      displayName: share.user.displayName,
      avatar: share.user.avatar ?? undefined,
    },
    viewCount: share.viewCount,
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;
  const shareData = await getShareByCode(id);

  if (!shareData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 to-violet-100 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <ShareCard session={shareData.session} creator={shareData.creator} />
        </div>

        <div className="text-center">
          <p className="text-gray-600 mb-4">觉得有趣？也让你的AI来吐槽吧</p>
          <Link
            href="/?ref=share"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-8 rounded-full transition-colors shadow-lg"
          >
            创建我的吐槽
          </Link>
          <p className="text-xs text-gray-400 mt-4">已被查看 {shareData.viewCount} 次</p>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  const shareData = await getShareByCode(id);

  if (!shareData) {
    return {
      title: 'AI吐槽大会 - 分享',
      description: '分享不存在或已过期',
    };
  }

  return {
    title: `${shareData.session.topic} - AI吐槽大会`,
    description: `来自 ${shareData.creator.displayName} 的AI吐槽大会`,
    openGraph: {
      title: `${shareData.session.topic} - AI吐槽大会`,
      description: `来自 ${shareData.creator.displayName} 的AI吐槽大会`,
      images: shareData.session.imageUrl ? [shareData.session.imageUrl] : undefined,
    },
  };
}
