import { DurableObject } from "cloudflare:workers";

interface GameState {
  cards: Array<{
    id: number;
    content: string;
    pairId: number;
    isFlipped: boolean;
    isMatched: boolean;
    rotation: number;
  }>;
  players: Array<{
    id: number;
    name: string;
    score: number;
  }>;
  currentPlayerIndex: number;
  status: string;
  winner: {
    id: number;
    name: string;
    score: number;
  } | null;
}

interface WebSocketClient {
  socket: WebSocket;
  sessionId: string;
}

export class GameRoom extends DurableObject {
  private clients: Set<WebSocketClient>;
  private gameState: GameState;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.clients = new Set();
    this.gameState = {
      cards: [],
      players: [],
      currentPlayerIndex: 0,
      status: 'active',
      winner: null,
    };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Get sessionId from query params
      const sessionId = url.searchParams.get("sessionId") || "anonymous";

      await this.handleSession(server, sessionId);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // HTTP endpoints for game state management
    if (request.method === "POST" && url.pathname.endsWith("/update")) {
      const updates = await request.json() as Partial<GameState>;
      this.updateGameState(updates);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && url.pathname.endsWith("/state")) {
      return new Response(JSON.stringify(this.gameState), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  }

  async handleSession(webSocket: WebSocket, sessionId: string) {
    // Accept the WebSocket connection
    webSocket.accept();

    const client: WebSocketClient = { socket: webSocket, sessionId };
    this.clients.add(client);

    // Send current game state to the new client
    webSocket.send(JSON.stringify({
      type: 'state',
      data: this.gameState,
    }));

    // Handle incoming messages
    webSocket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data as string);
        this.handleMessage(message, client);
      } catch (error) {
        console.error("Error handling message:", error);
      }
    });

    // Handle connection close
    webSocket.addEventListener("close", () => {
      this.clients.delete(client);
    });
  }

  handleMessage(message: any, sender: WebSocketClient) {
    switch (message.type) {
      case 'flip_card':
        this.handleFlipCard(message.data);
        break;
      case 'update_cards':
        this.handleUpdateCards(message.data);
        break;
      case 'update_players':
        this.handleUpdatePlayers(message.data);
        break;
      case 'game_end':
        this.handleGameEnd(message.data);
        break;
      case 'switch_player':
        this.handleSwitchPlayer(message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  handleFlipCard(data: { cardId: number; isFlipped: boolean }) {
    const card = this.gameState.cards.find(c => c.id === data.cardId);
    if (card) {
      card.isFlipped = data.isFlipped;
      this.broadcast({
        type: 'card_flipped',
        data: { cardId: data.cardId, isFlipped: data.isFlipped },
      });
    }
  }

  handleUpdateCards(data: { cards: GameState['cards'] }) {
    this.gameState.cards = data.cards;
    this.broadcast({
      type: 'cards_updated',
      data: { cards: data.cards },
    });
  }

  handleUpdatePlayers(data: { players: GameState['players'] }) {
    this.gameState.players = data.players;
    this.broadcast({
      type: 'players_updated',
      data: { players: data.players },
    });
  }

  handleGameEnd(data: { winner: GameState['winner'] }) {
    this.gameState.status = 'finished';
    this.gameState.winner = data.winner;
    this.broadcast({
      type: 'game_end',
      data: { winner: data.winner },
    });
  }

  handleSwitchPlayer(data: { currentPlayerIndex: number }) {
    this.gameState.currentPlayerIndex = data.currentPlayerIndex;
    this.broadcast({
      type: 'player_switched',
      data: { currentPlayerIndex: data.currentPlayerIndex },
    });
  }

  updateGameState(updates: Partial<GameState>) {
    this.gameState = { ...this.gameState, ...updates };
    this.broadcast({
      type: 'state',
      data: this.gameState,
    });
  }

  broadcast(message: any, excludeClient?: WebSocketClient) {
    const messageStr = JSON.stringify(message);
    for (const client of this.clients) {
      if (client !== excludeClient) {
        try {
          client.socket.send(messageStr);
        } catch (error) {
          console.error("Error sending message to client:", error);
          this.clients.delete(client);
        }
      }
    }
  }
}
