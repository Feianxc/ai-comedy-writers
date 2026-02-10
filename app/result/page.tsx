'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';
import { ShareCard } from '@/components/business';
import { apiClient } from '@/lib/api';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import type { RoastSession } from '@/types';

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<RoastSession | null>(null);
  const [, setShareUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const topic = searchParams.get('topic');
    // 使用会话数据（实际应从API获取）
    const mockSession: RoastSession = {
      id: 'roast_demo',
      topic: topic || '过年催婚',
      userId: 'demo-user',
      userAgent: { displayName: '我的AI', bio: '一个真实的AI Agent' },
      userPersona: {
        id: 'persona-toxic',
        name: '毒舌老哥',
        archetype: 'toxic',
        style: { tone: '毒舌', length: 'medium', emoji: false, meme: false },
        signature: ['毒舌'],
      },
      round1: [
        { role: 'user_agent', content: '说真的，过年催婚这事儿，大家都懂但没人说出来。', isUser: true },
        { role: 'ai_comedian', content: '家人们谁懂啊，过年催婚真的绝了！这不就是咱们每天都在经历的事吗？' },
        { role: 'ai_comedian', content: '过年催婚本质就是这样，大家心知肚明。但这背后的真相，懂的都懂。' },
        { role: 'moderator', content: '本人建议：过年催婚这事儿直接翻篇。数据说话，纠结这个的成功率为零。' },
      ],
      round2: [
        { role: 'ai_comedian', content: '笑死，刚才说的都太客气了！过年催婚这事儿，我只能说：绝绝子！' },
        { role: 'user_agent', content: '大家都说到点子上了，但我觉得过年催婚还有更深的一面...', isUser: true },
        { role: 'ai_comedian', content: '总结一下，过年催婚这个现象，反映了当代人的某种精神状态。懂的都懂。' },
        { role: 'moderator', content: '最终结论：过年催婚，不值得浪费时间。下一个。' },
      ],
      participants: ['我的AI', '热梗王', '吐槽大师', '冷面评委'],
      createdAt: new Date(),
    };

    setSession(mockSession);
    setShareUrl(`${window.location.origin}/share/demo123`);
    setLoading(false);
  }, [searchParams]);

  const handleShare = async () => {
    if (!session) return;

    setSharing(true);
    try {
      const result = await apiClient.createShare(session.id);
      setShareUrl(result.shareUrl);

      if (navigator.share) {
        await navigator.share({
          title: 'AI吐槽大会',
          text: `来看看关于${session.topic}的精彩吐槽！`,
          url: result.shareUrl,
        });
      } else {
        navigator.clipboard.writeText(result.shareUrl);
      }
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = () => {
    // 图片生成功能开发中
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-violet-50">
      {/* 顶部栏 */}
      <header className="container-center py-4 flex items-center justify-between">
        <button onClick={handleBack} className="p-2 hover:bg-white/50 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-semibold text-gray-800">吐槽结果</h1>
        <div className="w-10" />
      </header>

      {/* 分享卡片 */}
      <div className="container-center py-6">
        <ShareCard session={session} />
      </div>

      {/* 操作按钮 */}
      <div className="container-center pb-8">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4 mr-2" />
            保存图片
          </Button>
          <Button
            className="flex-1"
            onClick={handleShare}
            isLoading={sharing}
          >
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
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-orange-50 to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      </main>
    }>
      <ResultContent />
    </Suspense>
  );
}
