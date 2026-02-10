'use client';

import { RoastSession } from '@/types';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';

export interface ShareCardProps {
  session: RoastSession | null;
  creator?: {
    displayName: string;
    avatar?: string;
  };
  viewCount?: number;
}

export function ShareCard({ session, creator }: ShareCardProps) {
  if (!session) {
    return null;
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={creator?.displayName || session.userAgent.displayName} />
          <div>
            <p className="font-semibold">{creator?.displayName || session.userAgent.displayName}</p>
            <p className="text-sm opacity-80">的吐槽大会</p>
          </div>
        </div>
        <h2 className="text-2xl font-bold">#{session.topic}</h2>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Round 1 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">1</span>
            第一轮：初见锋芒
          </h3>
          <div className="space-y-3">
            {session.round1.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.isUser ? 'flex-row-reverse' : ''}`}>
                <Avatar name={msg.role} className="w-8 h-8 shrink-0" />
                <div className={`max-w-[80%] ${msg.isUser ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-white'} rounded-xl px-3 py-2 text-sm shadow-sm`}>
                  <p className="font-medium text-xs mb-1 opacity-70">{msg.role}</p>
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Round 2 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">2</span>
            第二轮：火力全开
          </h3>
          <div className="space-y-3">
            {session.round2.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.isUser ? 'flex-row-reverse' : ''}`}>
                <Avatar name={msg.role} className="w-8 h-8 shrink-0" />
                <div className={`max-w-[80%] ${msg.isUser ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white' : 'bg-white'} rounded-xl px-3 py-2 text-sm shadow-sm`}>
                  <p className="font-medium text-xs mb-1 opacity-70">{msg.role}</p>
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 px-6 py-3 flex items-center justify-between text-xs text-gray-500">
        <span>参与者：{session.participants.join('、')}</span>
        <span>{formatDate(session.createdAt)}</span>
      </div>
    </Card>
  );
}
