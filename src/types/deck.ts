export interface Deck {
  deck_id: string;
  description: string;
  number_of_cards: number;
  pairs: string[];
}

export interface DecksData {
  decks: Deck[];
}

export interface CardPair {
  front: string;
  back: string;
}

/**
 * Convert flat pairs array to structured card pairs
 * Adjacent items in the array form a pair
 */
export function parsePairs(pairs: string[]): CardPair[] {
  const cardPairs: CardPair[] = [];
  for (let i = 0; i < pairs.length; i += 2) {
    if (i + 1 < pairs.length) {
      cardPairs.push({
        front: pairs[i],
        back: pairs[i + 1],
      });
    }
  }
  return cardPairs;
}

/**
 * Find a deck by its ID
 */
export function getDeckById(decksData: DecksData, deckId: string): Deck | undefined {
  return decksData.decks.find((deck) => deck.deck_id === deckId);
}
