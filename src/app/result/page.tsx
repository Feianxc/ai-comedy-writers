'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { ShareCard } from '@/components/business';
import { apiClient } from '@/lib/api';
import { useStore } from '@/store';
import type { RoastSession } from '@/types';

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentSession } = useStore();

  const [session, setSession] = useState<RoastSession | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionId = useMemo(() => searchParams.get('sessionId'), [searchParams]);

  useEffect(() => {
    if (!sessionId) {
      if (currentSession) {
        setSession({
          ...currentSession,
          createdAt:
            currentSession.createdAt instanceof Date
              ? currentSession.createdAt
              : new Date(currentSession.createdAt),
        });
        setShareUrl(`${window.location.origin}/share/${currentSession.id}`);
      } else {
        setError('未找到会话，请返回首页重新开始。');
      }
      setLoading(false);
      return;
    }

    if (currentSession && currentSession.id === sessionId) {
      setSession({
        ...currentSession,
        createdAt:
          currentSession.createdAt instanceof Date
            ? currentSession.createdAt
            : new Date(currentSession.createdAt),
      });
      setShareUrl(`${window.location.origin}/share/${currentSession.id}`);
      setLoading(false);
      return;
    }

    setError('当前会话不在本地状态中，请重新生成后再查看结果。');
    setLoading(false);
  }, [sessionId, currentSession]);

  const handleShare = async () => {
    if (!session) return;

    setSharing(true);
    setError(null);

    try {
      const result = await apiClient.createShare(session.id, session);
      setShareUrl(result.shareUrl);

      if (navigator.share) {
        await navigator.share({
          title: 'AI吐槽大会',
          text: `来看看关于 ${session.topic} 的精彩吐槽！`,
          url: result.shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(result.shareUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '分享失败，请稍后重试');
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = () => {
    setError('图片生成功能开发中，可先使用分享链接。');
  };

  const handleBack = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-orange-50 to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-orange-50 to-violet-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-2xl shadow p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-3">结果不存在</h1>
          <p className="text-gray-600 mb-4">{error ?? '会话数据丢失，请返回首页重新开始。'}</p>
          <Button onClick={handleBack}>返回首页</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-violet-50">
      <header className="container-center py-4 flex items-center justify-between">
        <button onClick={handleBack} className="p-2 hover:bg-white/50 rounded-full" aria-label="返回首页">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-semibold text-gray-800">吐槽结果</h1>
        <div className="w-10" />
      </header>

      <div className="container-center py-6">
        {error && (
          <div className="mb-4 bg-red-50 text-red-600 rounded-xl p-3 text-sm">{error}</div>
        )}
        {shareUrl && (
          <div className="mb-4 bg-blue-50 text-blue-700 rounded-xl p-3 text-sm break-all">
            分享链接：{shareUrl}
          </div>
        )}
        <ShareCard session={session} />
      </div>

      <div className="container-center pb-8">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            保存图片
          </Button>
          <Button className="flex-1" onClick={handleShare} isLoading={sharing}>
            <Share2 className="w-4 h-4 mr-2" />
            分享
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-br from-orange-50 to-violet-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            <p className="mt-4 text-gray-500">加载中...</p>
          </div>
        </main>
      }
    >
      <ResultContent />
    </Suspense>
  );
}

