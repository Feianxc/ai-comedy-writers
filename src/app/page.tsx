'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { PersonaSelector } from '@/components/business';
import { HOT_TOPICS } from '@/lib/constants';
import { useAuth, useStore } from '@/hooks';
import { Mic2, Sparkles } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const { selectedPersona, setSelectedPersona, addRecentTopic } = useStore();

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const getExperienceRedirect = (): string => {
    const topic = selectedTopic ?? HOT_TOPICS[0]?.title ?? '';
    const personaId = selectedPersona?.id ?? 'toxic';
    const query = new URLSearchParams({ topic, personaId });
    return `/experience?${query.toString()}`;
  };

  const handleStart = () => {
    if (!isAuthenticated) {
      login(getExperienceRedirect());
      return;
    }

    if (!selectedPersona) {
      setValidationError('请先选择一个AI人设');
      return;
    }

    if (!selectedTopic) {
      setValidationError('请先选择一个话题');
      return;
    }

    setValidationError(null);
    addRecentTopic(selectedTopic);
    router.push(`/experience?topic=${encodeURIComponent(selectedTopic)}&personaId=${selectedPersona.id}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-violet-50">
      <header className="container-center py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic2 className="w-6 h-6 text-orange-500" />
            <span className="font-bold text-gray-800">AI吐槽大会</span>
          </div>
          {isAuthenticated && user?.userAgent ? (
            <div className="text-sm text-gray-600">{user.userAgent.displayName}</div>
          ) : (
            <Button variant="text" size="sm" onClick={() => login(getExperienceRedirect())}>
              登录
            </Button>
          )}
        </div>
      </header>

      <div className="container-center py-8">
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>让AI替你发声</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">AI吐槽大会</h1>
          <p className="text-gray-600">选择你的AI人设，输入话题，观看精彩吐槽对决</p>
        </div>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">选择你的AI人设</h2>
          <PersonaSelector selected={selectedPersona?.id} onSelect={setSelectedPersona} />
        </section>

        <section className="mb-24">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">选择一个话题</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {HOT_TOPICS.slice(0, 6).map((topic, index) => (
              <button
                key={topic.id}
                onClick={() => {
                  setValidationError(null);
                  setSelectedTopic(topic.title);
                }}
                className={`
                  p-4 rounded-2xl border-2 text-left transition-all
                  ${selectedTopic === topic.title
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-100 bg-white hover:border-orange-200'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-800">{topic.title}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed bottom-6 left-0 right-0 px-6 flex justify-center" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="w-full max-w-md">
          {validationError && (
            <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{validationError}</p>
          )}
          <Button fullWidth size="lg" onClick={handleStart} isLoading={isLoading}>
            {isAuthenticated ? '开始吐槽' : '登录并开始'}
          </Button>
        </div>
      </div>
    </main>
  );
}

