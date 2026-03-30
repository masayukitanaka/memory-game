# Deck Data

This directory contains JSON metadata for memory game decks.

## Main Data File

All decks are stored in a single file: `decks.json`

## Schema

```typescript
{
  decks: [
    {
      deck_id: string;        // Unique identifier for the deck
      description: string;    // Human-readable description
      number_of_cards: number; // Total number of cards (always even)
      pairs: string[];        // Array where adjacent items form pairs
    }
  ]
}
```

## Pairs Format

The `pairs` array contains card content where **adjacent elements form a matching pair**.

Example:
```json
"pairs": ["Hello", "こんにちは", "Thank you", "ありがとう"]
```

This creates 2 pairs:
- Pair 1: "Hello" ↔ "こんにちは"
- Pair 2: "Thank you" ↔ "ありがとう"

## Available Decks

### 1. Hiragana-Katakana
- **ID**: `hiragana-katakana`
- **Cards**: 20
- **Content**: Match hiragana with katakana characters

### 2. English-Japanese Basics
- **ID**: `english-japanese-basics`
- **Cards**: 16
- **Content**: Common English phrases with Japanese translations

## Usage in Code

```typescript
import { DecksData, getDeckById, parsePairs } from '@/types/deck';
import decksData from '@/data/decks.json';

const data: DecksData = decksData;

// Get a specific deck
const deck = getDeckById(data, 'english-japanese-basics');

if (deck) {
  const cardPairs = parsePairs(deck.pairs);
  // cardPairs[0] = { front: "Hello", back: "こんにちは" }
}

// List all decks
const allDecks = data.decks;
```
