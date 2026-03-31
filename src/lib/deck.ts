import postgres from 'postgres';

// PostgreSQL client
function getDB() {
  const connectionString = process.env.SUPABASE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('SUPABASE_CONNECTION_STRING is not defined');
  }
  return postgres(connectionString);
}

export interface Deck {
  deck_id: string;
  description: string;
  number_of_cards: number;
  pairs: string[];
  created_at: Date;
  updated_at: Date;
}

/**
 * Get all decks
 */
export async function getAllDecks(): Promise<Deck[]> {
  const sql = getDB();

  try {
    const decks = await sql`
      SELECT * FROM memory_game.decks
      ORDER BY deck_id
    `;

    return decks.map((deck) => ({
      deck_id: deck.deck_id,
      description: deck.description,
      number_of_cards: deck.number_of_cards,
      pairs: deck.pairs as string[],
      created_at: new Date(deck.created_at),
      updated_at: new Date(deck.updated_at),
    }));
  } finally {
    await sql.end();
  }
}

/**
 * Get a specific deck by ID
 */
export async function getDeckById(deckId: string): Promise<Deck | null> {
  const sql = getDB();

  try {
    const [deck] = await sql`
      SELECT * FROM memory_game.decks
      WHERE deck_id = ${deckId}
    `;

    if (!deck) {
      return null;
    }

    return {
      deck_id: deck.deck_id,
      description: deck.description,
      number_of_cards: deck.number_of_cards,
      pairs: deck.pairs as string[],
      created_at: new Date(deck.created_at),
      updated_at: new Date(deck.updated_at),
    };
  } finally {
    await sql.end();
  }
}
