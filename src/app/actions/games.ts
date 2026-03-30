'use server';

import { createGame, getGameById } from '@/lib/game';

export async function createNewGame(deckId: string, pairs: string[]) {
  const game = await createGame(deckId, pairs);
  return {
    gameId: game.id,
    deckId: game.deck_id,
    cards: game.cards,
  };
}

export async function fetchGameById(gameId: string) {
  const game = await getGameById(gameId);
  if (!game) {
    return { game: null };
  }
  return {
    game: {
      id: game.id,
      deckId: game.deck_id,
      cards: game.cards,
      players: game.players,
      currentPlayerIndex: game.current_player_index,
      status: game.status,
    },
  };
}
