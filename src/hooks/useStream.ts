import { useRef, useState, useCallback, useEffect } from 'react';
import { useStore } from '@/store';
import type { RoastMessage, SSEMessage } from '@/types';

export interface StreamParams {
  topic: string;
  userAgent: { displayName: string; bio?: string; interests?: string[] };
  userPersona: { name: string; archetype: string };
}

export interface UseStreamReturn {
  messages: RoastMessage[];
  isConnected: boolean;
  currentRound: number;
  error: Error | null;
  startStream: (params: StreamParams) => void;
  stopStream: () => void;
}

export function useStream(): UseStreamReturn {
  const messages = useStore((state) => state.messages);
  const updateLastMessage = useStore((state) => state.updateLastMessage);
  const clearMessages = useStore((state) => state.clearMessages);
  const setCurrentRoastId = useStore((state) => state.setCurrentRoastId);

  const [isConnected, setIsConnected] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleSSEMessage = useCallback((data: SSEMessage) => {
    switch (data.type) {
      case 'user_agent_info':
        break;

      case 'start':
        if (data.round !== undefined) {
          setCurrentRound(data.round);
        }
        break;

      case 'token':
        if (data.role && data.content !== undefined) {
          updateLastMessage(data.content, data.role);
        }
        break;

      case 'message_complete':
        break;

      case 'round_end':
        if (data.round !== undefined) {
          setCurrentRound(data.round);
        }
        break;

      case 'done':
        if (data.roastId) {
          setCurrentRoastId(data.roastId);
        }
        setIsConnected(false);
        eventSourceRef.current?.close();
        break;

      case 'error':
        setError(new Error(data.error || 'Stream error'));
        setIsConnected(false);
        eventSourceRef.current?.close();
        break;
    }
  }, [updateLastMessage, setCurrentRoastId]);

  const stopStream = useCallback(() => {
    eventSourceRef.current?.close();
    setIsConnected(false);
  }, []);

  const startStream = useCallback((params: StreamParams) => {
    // 清理之前的连接
    stopStream();
    clearMessages();
    setError(null);

    // 构建URL
    const searchParams = new URLSearchParams({
      topic: params.topic,
      userAgent: JSON.stringify(params.userAgent),
      userPersona: JSON.stringify(params.userPersona),
    });

    const url = `/api/stream?${searchParams.toString()}`;

    // 创建EventSource
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);
        handleSSEMessage(data);
      } catch (err) {
        setError(err as Error);
      }
    };

    es.onerror = () => {
      setError(new Error('Stream connection failed'));
      setIsConnected(false);
      es.close();
    };
  }, [stopStream, clearMessages, handleSSEMessage]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    messages,
    isConnected,
    currentRound,
    error,
    startStream,
    stopStream,
  };
}
