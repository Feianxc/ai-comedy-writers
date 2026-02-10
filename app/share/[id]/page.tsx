import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ShareCard } from '@/components/business';
import { apiClient } from '@/lib/api';

interface SharePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;

  let shareData;
  try {
    shareData = await apiClient.getShare(id);
  } catch (error) {
    console.error('Failed to fetch share:', error);
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 to-violet-100 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md">
        {/* 分享卡片 */}
        <div className="mb-6">
          <ShareCard
            session={shareData.session}
            creator={shareData.creator}
          />
        </div>

        {/* CTA区域 */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">觉得有趣？也让你的AI来吐槽吧</p>
          <Link
            href="/?ref=share"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-8 rounded-full transition-colors shadow-lg"
          >
            创建我的吐槽
          </Link>
          <p className="text-xs text-gray-400 mt-4">
            已被查看 {shareData.viewCount} 次
          </p>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: SharePageProps) {
  const { id } = await params;

  try {
    const shareData = await apiClient.getShare(id);

    return {
      title: `${shareData.session.topic} - AI吐槽大会`,
      description: `来自 ${shareData.creator.displayName} 的AI吐槽大会`,
      openGraph: {
        title: `${shareData.session.topic} - AI吐槽大会`,
        description: `来自 ${shareData.creator.displayName} 的AI吐槽大会`,
        images: [shareData.session.imageUrl || ''],
      },
    };
  } catch {
    return {
      title: 'AI吐槽大会 - 分享',
    };
  }
}
