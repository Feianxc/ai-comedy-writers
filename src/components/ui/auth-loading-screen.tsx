'use client';

import { ShieldCheck, Sparkles } from 'lucide-react';
import { Spinner } from './spinner';

interface AuthLoadingScreenProps {
  title?: string;
  description?: string;
}

export function AuthLoadingScreen({
  title = '正在验证登录状态',
  description = '请稍候，马上进入房间。',
}: AuthLoadingScreenProps) {
  return (
    <main className="battle-light-bg min-h-screen text-slate-900 flex items-center justify-center px-4">
      <div className="battle-panel game-surface p-7 w-full max-w-lg text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/45 bg-cyan-50 px-4 py-1.5 text-cyan-700 text-xs">
          <Sparkles className="w-3.5 h-3.5" />
          安全校验中
        </div>

        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full border border-indigo-200 bg-white text-indigo-600 shadow-[0_10px_28px_rgba(59,130,246,0.16)]">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{description}</p>

        <div className="mt-5 inline-flex items-center gap-2 text-cyan-700 text-sm">
          <Spinner size="sm" color="blue" />
          同步会话中...
        </div>
      </div>
    </main>
  );
}

