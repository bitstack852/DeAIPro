import { useEffect, useRef, useState } from 'react';

function getWebSocketBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (!apiUrl) {
    // Fall back gracefully in environments where the var isn't set
    return 'ws://localhost:8000';
  }
  return apiUrl.replace(/^http/, 'ws');
}

export function useWebSocketPrice(): { price: number | null; connected: boolean } {
  const [price, setPrice] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let unmounted = false;

    function connect() {
      if (unmounted) return;
      const url = `${getWebSocketBaseUrl()}/api/ws/price`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!unmounted) setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (typeof data.price === 'number' && !unmounted) {
            setPrice(data.price);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!unmounted) {
          setConnected(false);
          // Reconnect after 5 seconds
          reconnectTimer.current = setTimeout(connect, 5000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  return { price, connected };
}
