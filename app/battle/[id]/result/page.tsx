'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Crown, Medal, RefreshCw, Sparkles, Trophy } from 'lucide-react';
import { AuthLoadingScreen, Button } from '@/components/ui';
import { useAuth } from '@/hooks';
import type { BattleGameDetail } from '@/types/battle';

interface BattleDetailResponse {
  code: number;
  data?: BattleGameDetail;
  message?: string;
}

function getRankLabel(index: number): string {
  if (index === 0) return '冠军';
  if (index === 1) return '亚军';
  if (index === 2) return '季军';
  return `第 ${index + 1} 名`;
}

export default function BattleResultPage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const { isAuthenticated, isLoading, login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<BattleGameDetail | null>(null);

  const ranking = useMemo(() => {
    const source = detail?.result?.scores ?? [];
    return source.slice().sort((left, right) => right.score - left.score);
  }, [detail?.result?.scores]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/battle/${gameId}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const payload = (await response.json()) as BattleDetailResponse;

        if (!mounted) {
          return;
        }

        if (!response.ok || payload.code !== 0 || !payload.data) {
          setError(payload.message ?? '获取结果失败');
          return;
        }

        setDetail(payload.data);
      } catch (loadError) {
        console.error('Load battle result failed:', loadError);
        if (mounted) {
          setError('获取结果失败，请稍后重试');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [gameId, isAuthenticated]);

  if (isLoading) {
    return <AuthLoadingScreen title="正在验证结果查看权限" description="安全校验通过后自动展示本局战报。" />;
  }

  if (!isAuthenticated) {
    return (
      <main className="battle-light-bg min-h-screen text-slate-900 flex items-center justify-center px-4">
        <div className="battle-panel p-6 w-full max-w-xl">
          <h1 className="text-xl font-bold text-slate-900">请先登录查看结果</h1>
          <p className="text-sm text-slate-600 mt-2">结果页仅对本局参与者开放。</p>
          <div className="flex gap-3 mt-5">
            <Button onClick={() => login(`/battle/${gameId}/result`)}>去登录</Button>
            <Link href="/battle">
              <Button variant="outline">返回大厅</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="battle-light-bg min-h-screen text-slate-900">
      <div className="absolute inset-0 grid-dots opacity-[0.08] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none premium-scanline" />

      <div className="relative z-10 container-center py-8 space-y-4">
        <header className="battle-panel p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/battle/${gameId}`}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-indigo-100 bg-white hover:bg-indigo-50 transition-colors"
              aria-label="返回房间"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </Link>
            <div>
              <div className="text-sm text-slate-600">战局结算</div>
              <h1 className="text-xl font-bold text-slate-900">嘴强王者结果</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" isLoading={loading} onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-1" />刷新
          </Button>
        </header>

        {error ? (
          <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}

        {!detail ? (
          <section className="battle-panel p-5 text-sm text-slate-600">{loading ? '加载中...' : '暂无可展示结果'}</section>
        ) : (
          <>
            <section className="battle-panel p-5 relative overflow-hidden">
              <div className="pointer-events-none absolute -top-20 -right-12 w-56 h-56 rounded-full bg-amber-200/35 blur-3xl" />
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                <span>主题：{detail.game.topic ?? '-'}</span>
                <span>总轮次：{detail.result?.totalRounds ?? detail.game.currentRound}</span>
                <span>状态：{detail.game.status}</span>
              </div>
              {detail.result?.winnerName ? (
                <div className="mt-4 rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 px-4 py-3 shadow-[0_10px_28px_rgba(245,158,11,0.18)]">
                  <div className="inline-flex items-center gap-2 text-amber-800 text-sm font-semibold">
                    <Crown className="w-4 h-4" />冠军：{detail.result.winnerName}
                  </div>
                  <div className="mt-1 text-xs text-amber-700 inline-flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />嘴强王者已诞生，恭喜夺冠
                  </div>
                </div>
              ) : null}
            </section>

            <section className="battle-panel p-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">排名</h2>
              {ranking.length === 0 ? (
                <div className="text-sm text-slate-600">尚未生成排行</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ranking.map((row, index) => (
                    <article
                      key={row.agentId}
                      className={`rounded-xl border px-4 py-3 ${
                        index === 0
                          ? 'border-amber-300 bg-amber-50 shadow-[0_10px_30px_rgba(245,158,11,0.16)]'
                          : 'border-indigo-100 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-slate-900 font-medium truncate">{row.agentName}</div>
                        <div className="text-xs text-slate-600 inline-flex items-center gap-1">
                          <Medal className="w-3.5 h-3.5" />{getRankLabel(index)}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-slate-700">
                        笑点：<span className="text-slate-900 font-semibold">{row.score}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">角色：{row.role === 'player' ? '玩家' : '观众'}</div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="battle-panel p-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 inline-flex items-center gap-2">
                <Trophy className="w-4 h-4 text-fuchsia-500" />轮次记录
              </h2>
              {detail.rounds.length === 0 ? (
                <div className="text-sm text-slate-600">暂无轮次记录</div>
              ) : (
                <div className="space-y-3">
                  {detail.rounds.map((round) => (
                    <div
                      key={`round_${round.round}`}
                      className="rounded-lg border border-indigo-100 bg-white px-3 py-3 hover:border-fuchsia-300/45 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm text-slate-900">第 {round.round} 轮 · {round.eventName}</div>
                        <div className="text-xs text-slate-500">
                          淘汰：{round.eliminations.length > 0 ? round.eliminations.length : '无'}
                        </div>
                      </div>

                      {round.eventDescription ? (
                        <div className="mt-2 text-xs text-slate-600">事件效果：{round.eventDescription}</div>
                      ) : null}

                      {round.goldenLine?.content ? (
                        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-xs text-amber-800">
                          <div className="font-medium">本轮金句 · {round.goldenLine.agentName}</div>
                          <div className="mt-1">“{round.goldenLine.content}”</div>
                          {round.goldenLine.reason ? (
                            <div className="mt-1 text-[11px] text-amber-700">{round.goldenLine.reason}</div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-2 text-xs text-slate-600">
                        {round.eliminationNames && round.eliminationNames.length > 0
                          ? `本轮淘汰：${round.eliminationNames.join('、')}`
                          : '本轮无人淘汰，战况胶着'}
                      </div>

                      {round.penalties && round.penalties.length > 0 ? (
                        <div className="mt-2 text-xs text-rose-700">
                          惩罚：
                          {round.penalties
                            .map((item) => {
                              if (item.type === 'pressure') {
                                return `全员压力-${item.value}`;
                              }
                              return `${item.agentName ?? '选手'} ${item.reason ?? ''} -${item.value}`;
                            })
                            .join('；')}
                        </div>
                      ) : null}

                      {round.speeches && round.speeches.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {round.speeches.slice(0, 6).map((speech, index) => (
                            <div key={`${round.round}_${speech.agentId}_${index}`} className="text-xs text-slate-700">
                              <span className="text-cyan-700">{speech.agentName}</span>：{speech.content}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {round.ratings && round.ratings.length > 0 ? (
                        <div className="mt-2 text-xs text-slate-600">
                          评分变化：
                          {round.ratings
                            .slice(0, 8)
                            .map((rating) => `${rating.fromAgentName}→${rating.targetAgentName}${rating.delta >= 0 ? '+' : ''}${rating.delta}`)
                            .join('；')}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
