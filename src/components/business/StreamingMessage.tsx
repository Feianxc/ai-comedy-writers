'use client';

import { useState, useEffect, useRef } from 'react';
import { RoastMessage, RoastSession } from '@/types';

interface StreamingMessageProps {
  url: string;
  onComplete?: (session: RoastSession) => void;
  onError?: (error: string) => void;
}

export function StreamingMessage({ url, onComplete, onError }: StreamingMessageProps) {
  const [messages, setMessages] = useState<RoastMessage[]>([]);
  const [currentContent, setCurrentContent] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [, setCurrentRound] = useState(1);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const currentContentRef = useRef('');
  const currentSpeakerRef = useRef('');

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    currentContentRef.current = currentContent;
  }, [currentContent]);

  useEffect(() => {
    currentSpeakerRef.current = currentSpeaker;
  }, [currentSpeaker]);

  useEffect(() => {
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => setIsConnected(true);

    eventSource.addEventListener('session', () => {
      // Session established
    });

    eventSource.addEventListener('start', (e) => {
      const data = JSON.parse(e.data);
      setCurrentRound(data.round);
    });

    eventSource.addEventListener('participant', (e) => {
      const data = JSON.parse(e.data);
      setCurrentSpeaker(data.name);
      setCurrentContent('');
    });

    eventSource.addEventListener('token', (e) => {
      const data = JSON.parse(e.data);
      setCurrentContent(prev => prev + data.content);
    });

    eventSource.addEventListener('round_end', (e) => {
      const data = JSON.parse(e.data);
      const content = currentContentRef.current;
      const speaker = currentSpeakerRef.current;
      if (content && speaker) {
        setMessages(prev => [...prev, {
          role: speaker,
          content,
          isUser: data.speaker === '我的AI',
        }]);
      }
      setCurrentContent('');
    });

    eventSource.addEventListener('done', (e) => {
      const data = JSON.parse(e.data);
      setIsConnected(false);
      onCompleteRef.current?.(data);
      eventSource.close();
    });

    eventSource.addEventListener('error', (e) => {
      const errorEvent = e as MessageEvent;
      const data = JSON.parse(errorEvent.data);
      onErrorRef.current?.(data.message);
      setIsConnected(false);
      eventSource.close();
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [url]);

  return (
    <div className="space-y-4">
      {/* 已完成的消息 */}
      {messages.map((msg, idx) => (
        <div key={idx} className={`flex gap-3 ${msg.isUser ? 'flex-row-reverse' : ''}`}>
          <div className={`w-10 h-10 rounded-full ${msg.isUser ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gray-200'} flex items-center justify-center text-sm font-medium shrink-0`}>
            {msg.role[0]}
          </div>
          <div className={`max-w-[80%] ${msg.isUser ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-white'} rounded-2xl px-4 py-3 shadow-sm`}>
            <p className="text-sm">{msg.content}</p>
          </div>
        </div>
      ))}

      {/* 当前正在生成的消息 */}
      {currentContent && (
        <div className={`flex gap-3 ${currentSpeaker === '我的AI' ? 'flex-row-reverse' : ''}`}>
          <div className={`w-10 h-10 rounded-full ${currentSpeaker === '我的AI' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gray-200'} flex items-center justify-center text-sm font-medium shrink-0`}>
            {currentSpeaker[0]}
          </div>
          <div className={`${currentSpeaker === '我的AI' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-white'} rounded-2xl px-4 py-3 shadow-sm`}>
            <p className="text-sm">
              {currentContent}
              <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
            </p>
          </div>
        </div>
      )}

      {/* 连接状态 */}
      {!isConnected && messages.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>连接中...</p>
        </div>
      )}
    </div>
  );
}
