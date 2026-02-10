// SSE流式连接工具
// 待实现: EventSource封装

export interface StreamOptions {
  onMessage: (message: unknown) => void;
  onError?: (error: Error) => void;
  onComplete?: (roastId: string) => void;
}

export function createStreamConnection(
  url: string,
  options: StreamOptions
): () => void {
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      options.onMessage(data);

      if ((data as { type?: string }).type === 'done') {
        const roastId = (data as { roastId?: string }).roastId;
        if (roastId) {
          options.onComplete?.(roastId);
        }
        eventSource.close();
      }
    } catch (error) {
      options.onError?.(error as Error);
    }
  };

  eventSource.onerror = () => {
    options.onError?.(new Error('Stream connection failed'));
    eventSource.close();
  };

  return () => eventSource.close();
}
