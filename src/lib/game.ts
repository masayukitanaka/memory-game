import postgres from 'postgres';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { nanoid } from 'nanoid';

// PostgreSQL client
function getDB() {
  // Try to get from Cloudflare context first (works in dev and production)
  try {
    const { env } = getCloudflareContext();
    if (env.SUPABASE_CONNECTION_STRING) {
      return postgres(env.SUPABASE_CONNECTION_STRING);
    }
  } catch (e) {
    // Cloudflare context not available, fallback to process.env
  }

  // Fallback to process.env
  const connectionString = process.env.SUPABASE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('SUPABASE_CONNECTION_STRING is not defined in Cloudflare env or process.env');
  }
  return postgres(connectionString);
}

export interface CardData {
  id: number;
  content: string;
  pairId: number;
  isFlipped: boolean;
  isMatched: boolean;
  rotation: number;
}

export interface Game {
  id: string;
  deck_id: string;
  cards: CardData[];
  players: Array<{ id: number; name: string; score: number }>;
  current_player_index: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create a new game with shuffled cards
 */
export async function createGame(deckId: string, pairs: string[]): Promise<Game> {
  const sql = getDB();

  try {
    // Generate unique game ID
    const gameId = nanoid(10);

    // Parse card pairs and create cards with random rotations
    const expandedCards: CardData[] = [];

    for (let i = 0; i < pairs.length; i += 2) {
      const pairId = i / 2;
      const rotation1 = Math.random() * 10 - 5;
      const rotation2 = Math.random() * 10 - 5;

      expandedCards.push(
        {
          id: pairId * 2,
          content: pairs[i],
          pairId: pairId,
          isFlipped: false,
          isMatched: false,
          rotation: rotation1,
        },
        {
          id: pairId * 2 + 1,
          content: pairs[i + 1],
          pairId: pairId,
          isFlipped: false,
          isMatched: false,
          rotation: rotation2,
        }
      );
    }

    // Shuffle cards using Fisher-Yates algorithm
    for (let i = expandedCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [expandedCards[i], expandedCards[j]] = [expandedCards[j], expandedCards[i]];
    }

    // Insert game into database
    const [game] = await sql`
      INSERT INTO memory_game.games (
        id,
        deck_id,
        cards,
        players,
        current_player_index,
        status
      ) VALUES (
        ${gameId},
        ${deckId},
        ${JSON.stringify(expandedCards)}::jsonb,
        '[]'::jsonb,
        0,
        'active'
      )
      RETURNING *
    `;

    return {
      id: game.id,
      deck_id: game.deck_id,
      cards: game.cards as CardData[],
      players: game.players as Array<{ id: number; name: string; score: number }>,
      current_player_index: game.current_player_index,
      status: game.status,
      created_at: new Date(game.created_at),
      updated_at: new Date(game.updated_at),
    };
  } finally {
    await sql.end();
  }
}

/**
 * Get a game by ID
 */
export async function getGameById(gameId: string): Promise<Game | null> {
  const sql = getDB();

  try {
    const [game] = await sql`
      SELECT * FROM memory_game.games
      WHERE id = ${gameId}
    `;

    if (!game) {
      return null;
    }

    // Parse JSONB data - postgres returns it as plain objects/arrays
    const cards = Array.isArray(game.cards) ? game.cards : JSON.parse(game.cards as any);
    const players = Array.isArray(game.players) ? game.players : JSON.parse(game.players as any);

    return {
      id: game.id,
      deck_id: game.deck_id,
      cards: cards as CardData[],
      players: players as Array<{ id: number; name: string; score: number }>,
      current_player_index: game.current_player_index,
      status: game.status,
      created_at: new Date(game.created_at),
      updated_at: new Date(game.updated_at),
    };
  } finally {
    await sql.end();
  }
}
