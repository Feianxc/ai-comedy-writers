import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Crown, ExternalLink, Flame, Share2, Sparkles, Trophy } from 'lucide-react';
import { prisma } from '@/lib/db';
import type { BattleShareReplay } from '@/types/battle';

interface SharePageProps {
  params: Promise<{ id: string }>;
}

interface SharePageData {
  shortCode: string;
  creator: {
    displayName: string;
    avatar?: string;
  };
  battleReplay: BattleShareReplay;
  viewCount: number;
}

function parseBattleReplay(value: unknown): BattleShareReplay | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const replay = value as Partial<BattleShareReplay>;
  if (replay.type !== 'battle_replay') {
    return null;
  }
  if (typeof replay.gameId !== 'string') {
    return null;
  }
  if (!Array.isArray(replay.speeches) || !Array.isArray(replay.scores) || !Array.isArray(replay.rounds)) {
    return null;
  }

  return replay as BattleShareReplay;
}

async function getShareByCode(shortCode: string): Promise<SharePageData | null> {
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
  const battleReplay = parseBattleReplay(userAgentConfig.battleReplay);
  if (!battleReplay) {
    return null;
  }

  await prisma.shareCard.update({
    where: { id: share.id },
    data: { viewCount: { increment: 1 } },
  });

  return {
    shortCode: share.shortCode,
    creator: {
      displayName: share.user.displayName,
      avatar: share.user.avatar ?? undefined,
    },
    battleReplay,
    viewCount: share.viewCount + 1,
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;
  const shareData = await getShareByCode(id);

  if (!shareData) {
    notFound();
  }

  const replay = shareData.battleReplay;
  const groupedSpeeches = replay.speeches
    .slice()
    .sort((left, right) => left.round - right.round || Date.parse(left.createdAt) - Date.parse(right.createdAt));

  const ranking = replay.scores.slice().sort((left, right) => right.score - left.score);

  return (
    <main className="battle-light-bg min-h-screen text-slate-900">
      <div className="absolute inset-0 grid-dots opacity-[0.08] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none premium-scanline" />

      <div className="relative z-10 container-center py-8 space-y-4">
        <section className="battle-panel p-6 border border-amber-200">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-amber-700 inline-flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />嘴强王者 · 对战战报
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">{replay.title}</h1>
              <div className="mt-2 text-sm text-slate-700">分享者：{shareData.creator.displayName}</div>
              <div className="mt-1 text-sm text-slate-700">主题：{replay.topic || '-'}</div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-50 px-3 py-1 text-amber-700">
                <Crown className="w-4 h-4" />冠军：{replay.winnerName}
              </div>
              <div className="mt-2 text-xs text-slate-600">总回合：{replay.totalRounds}</div>
              <div className="text-xs text-slate-500">浏览：{shareData.viewCount}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/battle"
              className="inline-flex items-center rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />进入嘴强王者
            </Link>
            <div className="inline-flex items-center rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs text-cyan-700">
              <Share2 className="w-3.5 h-3.5 mr-1" />分享编号：{shareData.shortCode}
            </div>
          </div>
        </section>

        <section className="battle-panel p-5">
          <div className="text-sm font-semibold text-slate-900 mb-3 inline-flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />最终排名
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {ranking.map((row, index) => (
              <article
                key={row.agentId}
                className={`rounded-xl border px-3 py-2 ${
                  index === 0
                    ? 'border-amber-300 bg-amber-50 shadow-[0_10px_32px_rgba(245,158,11,0.2)]'
                    : 'border-indigo-100 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-slate-900">
                    #{index + 1} {row.agentName}
                  </div>
                  <div className="text-sm font-semibold text-cyan-700">{row.score}</div>
                </div>
                <div className="text-xs text-slate-500 mt-1">{row.isAlive ? '存活到最后' : '中途淘汰'}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="battle-panel p-5">
          <div className="text-sm font-semibold text-slate-900 mb-3 inline-flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-fuchsia-500" />回合过程（完整对话）
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
            {groupedSpeeches.map((speech) => {
              const summary = replay.rounds.find((item) => item.round === speech.round);
              return (
                <article
                  key={speech.id}
                  className="rounded-xl border border-indigo-100 bg-white px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-cyan-700">
                      第 {speech.round} 轮 · {speech.agentName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      事件：{summary?.eventName ?? '-'}
                      {summary?.eventDescription ? `（${summary.eventDescription}）` : ''}
                    </div>
                  </div>
                  <p className="text-sm text-slate-800 mt-1 leading-6">{speech.content}</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  const shareData = await getShareByCode(id);

  if (!shareData) {
    return {
      title: '嘴强王者分享',
      description: '分享不存在或已过期',
    };
  }

  return {
    title: `${shareData.battleReplay.winnerName} · 嘴强王者战报`,
    description: `主题：${shareData.battleReplay.topic}，冠军：${shareData.battleReplay.winnerName}`,
    openGraph: {
      title: `${shareData.battleReplay.winnerName} · 嘴强王者战报`,
      description: `主题：${shareData.battleReplay.topic}，总回合：${shareData.battleReplay.totalRounds}`,
    },
  };
}
