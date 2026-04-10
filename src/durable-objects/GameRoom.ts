import { DurableObject } from "cloudflare:workers";

interface Card {
  id: number;
  content: string;
  pairId: number;
  isFlipped: boolean;
  isMatched: boolean;
  rotation: number;
}

interface Player {
  sessionId: string;
  name: string;
  score: number;
}

interface GameState {
  cards: Card[];
  players: Player[];
  currentTurnSessionId: string | null;
  flippedCards: number[];
  isProcessing: boolean;
  status: 'waiting' | 'active' | 'finished';
  winner: Player | null;
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
      currentTurnSessionId: null,
      flippedCards: [],
      isProcessing: false,
      status: 'waiting',
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

    // Initialize currentTurnSessionId if this is the first client or it's not set
    if (!this.gameState.currentTurnSessionId) {
      // Get all connected sessionIds and sort them to ensure consistency
      const allSessionIds = Array.from(this.clients).map(c => c.sessionId).sort();
      if (allSessionIds.length > 0) {
        this.gameState.currentTurnSessionId = allSessionIds[0];
        console.log('[GameRoom] Initialized currentTurnSessionId to:', this.gameState.currentTurnSessionId);
      }
    }

    // Send current game state to the new client
    webSocket.send(JSON.stringify({
      type: 'state',
      data: this.gameState,
    }));

    // Send current turn state to the new client
    webSocket.send(JSON.stringify({
      type: 'current_turn',
      data: { sessionId: this.gameState.currentTurnSessionId },
    }));

    console.log('[GameRoom] Client connected:', sessionId, 'Current turn:', this.gameState.currentTurnSessionId);

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
      case 'init_game':
        this.handleInitGame(message.data, sender);
        break;
      case 'register_player':
        this.handleRegisterPlayer(message.data, sender);
        break;
      case 'card_click':
        this.handleCardClick(message.data, sender);
        break;
      case 'update_cards':
        this.handleUpdateCards(message.data);
        break;
      case 'update_players':
        this.handleUpdatePlayers(message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  handleInitGame(data: { cards: Card[] }, sender: WebSocketClient) {
    if (this.gameState.cards.length === 0) {
      this.gameState.cards = data.cards;
      this.gameState.status = 'active';
      console.log('[GameRoom] Game initialized with', data.cards.length, 'cards');

      // Broadcast initial state to all clients
      this.broadcastAll({
        type: 'state',
        data: this.gameState,
      });
    }
  }

  handleRegisterPlayer(data: { sessionId: string; playerName: string }, sender: WebSocketClient) {
    // Check if player already exists
    const existingPlayer = this.gameState.players.find(p => p.sessionId === data.sessionId);
    if (!existingPlayer) {
      this.gameState.players.push({
        sessionId: data.sessionId,
        name: data.playerName,
        score: 0,
      });
      console.log('[GameRoom] Player registered:', data.playerName, data.sessionId);

      // Initialize turn to first player if not set
      if (!this.gameState.currentTurnSessionId && this.gameState.players.length > 0) {
        const sortedPlayers = [...this.gameState.players].sort((a, b) =>
          a.sessionId.localeCompare(b.sessionId)
        );
        this.gameState.currentTurnSessionId = sortedPlayers[0].sessionId;
      }

      // Broadcast updated players to all clients
      this.broadcastAll({
        type: 'players_updated',
        data: { players: this.gameState.players },
      });

      this.broadcastAll({
        type: 'current_turn',
        data: { sessionId: this.gameState.currentTurnSessionId },
      });
    }
  }

  handleCardClick(data: { cardId: number }, sender: WebSocketClient) {
    // Validate it's the sender's turn
    if (sender.sessionId !== this.gameState.currentTurnSessionId) {
      console.log('[GameRoom] Invalid turn. Current:', this.gameState.currentTurnSessionId, 'Sender:', sender.sessionId);
      return;
    }

    // Prevent clicking if already processing or game is over
    if (this.gameState.isProcessing || this.gameState.status !== 'active') {
      return;
    }

    const card = this.gameState.cards.find(c => c.id === data.cardId);
    if (!card || card.isFlipped || card.isMatched) {
      return;
    }

    // Flip the card
    card.isFlipped = true;
    this.gameState.flippedCards.push(data.cardId);

    // Broadcast card flip
    this.broadcastAll({
      type: 'card_flipped',
      data: { cardId: data.cardId, isFlipped: true },
    });

    // Check if two cards are flipped
    if (this.gameState.flippedCards.length === 2) {
      this.gameState.isProcessing = true;
      this.checkForMatch();
    }
  }

  checkForMatch() {
    const [firstId, secondId] = this.gameState.flippedCards;
    const firstCard = this.gameState.cards.find(c => c.id === firstId);
    const secondCard = this.gameState.cards.find(c => c.id === secondId);

    if (!firstCard || !secondCard) {
      this.gameState.isProcessing = false;
      return;
    }

    if (firstCard.pairId === secondCard.pairId) {
      // Match found!
      console.log('[GameRoom] Cards matched:', firstId, secondId);
      firstCard.isMatched = true;
      secondCard.isMatched = true;

      // Award point to current player
      const currentPlayer = this.gameState.players.find(
        p => p.sessionId === this.gameState.currentTurnSessionId
      );
      if (currentPlayer) {
        currentPlayer.score += 1;
      }

      // Broadcast match
      this.broadcastAll({
        type: 'cards_matched',
        data: {
          cardIds: [firstId, secondId],
          players: this.gameState.players,
        },
      });

      // Reset flipped cards
      this.gameState.flippedCards = [];
      this.gameState.isProcessing = false;

      // Check if game is over
      if (this.gameState.cards.every(c => c.isMatched)) {
        this.endGame();
      }
    } else {
      // No match - flip cards back after delay
      console.log('[GameRoom] Cards did not match. Flipping back in 1 second.');

      setTimeout(() => {
        firstCard.isFlipped = false;
        secondCard.isFlipped = false;

        // Broadcast cards flipping back
        this.broadcastAll({
          type: 'cards_unmatched',
          data: { cardIds: [firstId, secondId] },
        });

        // Switch to next player
        this.switchToNextPlayer();

        // Reset state
        this.gameState.flippedCards = [];
        this.gameState.isProcessing = false;
      }, 1000);
    }
  }

  switchToNextPlayer() {
    const sortedPlayers = [...this.gameState.players].sort((a, b) =>
      a.sessionId.localeCompare(b.sessionId)
    );

    const currentIndex = sortedPlayers.findIndex(
      p => p.sessionId === this.gameState.currentTurnSessionId
    );

    const nextIndex = (currentIndex + 1) % sortedPlayers.length;
    this.gameState.currentTurnSessionId = sortedPlayers[nextIndex].sessionId;

    console.log('[GameRoom] Turn switched to:', this.gameState.currentTurnSessionId);

    // Broadcast player switch
    this.broadcastAll({
      type: 'player_switched',
      data: {
        sessionId: this.gameState.currentTurnSessionId,
        currentPlayerIndex: nextIndex
      },
    });
  }

  endGame() {
    this.gameState.status = 'finished';

    // Find winner (highest score)
    const sortedPlayers = [...this.gameState.players].sort((a, b) => b.score - a.score);
    this.gameState.winner = sortedPlayers[0];

    console.log('[GameRoom] Game ended. Winner:', this.gameState.winner?.name);

    // Broadcast game end
    this.broadcastAll({
      type: 'game_end',
      data: { winner: this.gameState.winner },
    });
  }

  handleUpdateCards(data: { cards: Card[] }) {
    this.gameState.cards = data.cards;
    this.broadcastAll({
      type: 'cards_updated',
      data: { cards: data.cards },
    });
  }

  handleUpdatePlayers(data: { players: Player[] }) {
    this.gameState.players = data.players;
    this.broadcastAll({
      type: 'players_updated',
      data: { players: data.players },
    });
  }

  updateGameState(updates: Partial<GameState>) {
    this.gameState = { ...this.gameState, ...updates };
    this.broadcastAll({
      type: 'state',
      data: this.gameState,
    });
  }

  broadcastAll(message: any) {
    const messageStr = JSON.stringify(message);
    for (const client of this.clients) {
      try {
        client.socket.send(messageStr);
      } catch (error) {
        console.error("Error sending message to client:", error);
        this.clients.delete(client);
      }
    }
  }
}
