'use server';

import { getAllDecks, getDeckById } from '@/lib/deck';

export async function fetchAllDecks() {
  const decks = await getAllDecks();
  return {
    decks: decks.map((deck) => ({
      deck_id: deck.deck_id,
      description: deck.description,
      number_of_cards: deck.number_of_cards,
      pairs: deck.pairs,
    })),
  };
}

export async function fetchDeckById(deckId: string) {
  const deck = await getDeckById(deckId);

  if (!deck) {
    return { deck: null };
  }

  return {
    deck: {
      deck_id: deck.deck_id,
      description: deck.description,
      number_of_cards: deck.number_of_cards,
      pairs: deck.pairs,
    },
  };
}
