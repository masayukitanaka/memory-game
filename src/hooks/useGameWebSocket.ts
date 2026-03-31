import { useEffect, useRef, useCallback } from 'react';

interface GameWebSocketOptions {
  gameId: string;
  sessionId: string;
  onGameEnd: (winner: any) => void;
  onCardsUpdated: (cards: any[]) => void;
  onPlayersUpdated: (players: any[]) => void;
  onCardFlipped: (data: { cardId: number; isFlipped: boolean }) => void;
  onPlayerSwitched: (data: { currentPlayerIndex: number }) => void;
}

export function useGameWebSocket({
  gameId,
  sessionId,
  onGameEnd,
  onCardsUpdated,
  onPlayersUpdated,
  onCardFlipped,
  onPlayerSwitched,
}: GameWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Construct WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/game/${gameId}/ws?sessionId=${sessionId}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'game_end':
            onGameEnd(message.data.winner);
            break;
          case 'cards_updated':
            onCardsUpdated(message.data.cards);
            break;
          case 'players_updated':
            onPlayersUpdated(message.data.players);
            break;
          case 'card_flipped':
            onCardFlipped(message.data);
            break;
          case 'player_switched':
            onPlayerSwitched(message.data);
            break;
          case 'state':
            // Initial state sync
            if (message.data.cards?.length > 0) {
              onCardsUpdated(message.data.cards);
            }
            if (message.data.players?.length > 0) {
              onPlayersUpdated(message.data.players);
            }
            break;
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      wsRef.current = null;

      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...');
        connect();
      }, 3000);
    };

    wsRef.current = ws;
  }, [gameId, sessionId, onGameEnd, onCardsUpdated, onPlayersUpdated, onCardFlipped, onPlayerSwitched]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    sendMessage,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
