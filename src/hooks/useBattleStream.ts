'use client';

import { useEffect, useRef } from 'react';
import { useBattleStore } from '@/store/battle-store';
import type { BattleEventRecord, BattleResult, BattleScoreItem } from '@/types/battle';

interface UseBattleStreamOptions {
  gameId?: string;
  enabled?: boolean;
}

const BATTLE_EVENT_TYPES = [
  'battle:state_sync',
  'battle:talent_selected',
  'battle:round_start',
  'battle:event_announced',
  'battle:item_bought',
  'battle:speech_turn',
  'battle:speech_start',
  'battle:speech_complete',
  'battle:rating_result',
  'battle:score_update',
  'battle:topic_penalty',
  'battle:repeat_penalty',
  'battle:pressure_applied',
  'battle:elimination',
  'battle:round_end',
  'battle:game_over',
  'battle:error',
] as const;

function parseEventPayload(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function useBattleStream(options: UseBattleStreamOptions) {
  const { gameId, enabled = true } = options;
  const addEvent = useBattleStore((state) => state.addEvent);
  const setConnectionStatus = useBattleStore((state) => state.setConnectionStatus);
  const setScores = useBattleStore((state) => state.setScores);
  const setCurrentResult = useBattleStore((state) => state.setCurrentResult);
  const setCurrentGame = useBattleStore((state) => state.setCurrentGame);

  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosingRef = useRef(false);
  const retryCountRef = useRef(0);
  const activeConnectionSeqRef = useRef(0);

  useEffect(() => {
    if (!enabled || !gameId) {
      setConnectionStatus('idle');
      return;
    }

    isClosingRef.current = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const closeCurrentSource = () => {
      activeConnectionSeqRef.current += 1;
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      clearReconnectTimer();
      const nextRetry = retryCountRef.current + 1;
      retryCountRef.current = nextRetry;
      const waitMs = Math.min(4500, 400 * 2 ** Math.min(nextRetry, 4));
      setConnectionStatus('disconnected');
      reconnectTimerRef.current = setTimeout(() => {
        if (isClosingRef.current) {
          return;
        }
        connect();
      }, waitMs);
    };

    const connect = () => {
      if (isClosingRef.current) {
        return;
      }

      clearReconnectTimer();

      const connectionSeq = activeConnectionSeqRef.current + 1;
      activeConnectionSeqRef.current = connectionSeq;

      setConnectionStatus('connecting');
      closeCurrentSource();

      activeConnectionSeqRef.current = connectionSeq;

      const source = new EventSource(`/api/battle/${gameId}/stream`, {
        withCredentials: true,
      });
      sourceRef.current = source;

      source.onopen = () => {
        if (connectionSeq !== activeConnectionSeqRef.current || isClosingRef.current) {
          return;
        }
        clearReconnectTimer();
        retryCountRef.current = 0;
        setConnectionStatus('connected');
      };

      source.onerror = () => {
        if (connectionSeq !== activeConnectionSeqRef.current) {
          return;
        }
        if (isClosingRef.current) {
          return;
        }
        closeCurrentSource();
        scheduleReconnect();
      };

      source.onmessage = (event) => {
        if (connectionSeq !== activeConnectionSeqRef.current || isClosingRef.current) {
          return;
        }
        const data = parseEventPayload(event.data);

        const record: BattleEventRecord = {
          type: event.type || 'message',
          data,
          timestamp: new Date().toISOString(),
        };

        addEvent(record);
      };

      const bind = (eventType: string, handler: (data: Record<string, unknown>) => void) => {
        source.addEventListener(eventType, (raw) => {
          if (connectionSeq !== activeConnectionSeqRef.current || isClosingRef.current) {
            return;
          }
          const evt = raw as MessageEvent<string>;
          const payload = parseEventPayload(evt.data);

          addEvent({
            type: eventType,
            data: payload,
            timestamp: new Date().toISOString(),
          });

          handler(payload);
        });
      };

      for (const eventType of BATTLE_EVENT_TYPES) {
        bind(eventType, (payload) => {
          if (eventType === 'battle:state_sync') {
            if (payload.game && typeof payload.game === 'object') {
              setCurrentGame(payload.game as never);
            }
            return;
          }

          if (
            eventType === 'battle:talent_selected' ||
            eventType === 'battle:round_start' ||
            eventType === 'battle:event_announced' ||
            eventType === 'battle:item_bought' ||
            eventType === 'battle:round_end' ||
            eventType === 'battle:pressure_applied' ||
            eventType === 'battle:elimination' ||
            eventType === 'battle:topic_penalty' ||
            eventType === 'battle:repeat_penalty'
          ) {
            if (payload.game && typeof payload.game === 'object') {
              setCurrentGame(payload.game as never);
            }
            return;
          }

          if (eventType === 'battle:score_update') {
            if (Array.isArray(payload.scores)) {
              setScores(payload.scores as BattleScoreItem[]);
            }
            if (payload.game && typeof payload.game === 'object') {
              setCurrentGame(payload.game as never);
            }
            return;
          }

          if (eventType === 'battle:game_over') {
            if (payload.result && typeof payload.result === 'object') {
              setCurrentResult(payload.result as BattleResult);
            }
            isClosingRef.current = true;
            clearReconnectTimer();
            setConnectionStatus('disconnected');
            closeCurrentSource();
            return;
          }

          if (eventType === 'battle:error') {
            setConnectionStatus('error');
          }
        });
      }
    };

    connect();

    return () => {
      isClosingRef.current = true;
      clearReconnectTimer();
      closeCurrentSource();
      setConnectionStatus('disconnected');
    };
  }, [addEvent, enabled, gameId, setConnectionStatus, setCurrentGame, setCurrentResult, setScores]);

  return {
    disconnect: () => {
      isClosingRef.current = true;
      activeConnectionSeqRef.current += 1;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      sourceRef.current?.close();
      sourceRef.current = null;
      setConnectionStatus('disconnected');
    },
  };
}
