'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Confetti from '@/components/Confetti';
import WinnerModal from '@/components/WinnerModal';
import decksData from '@/data/decks.json';
import { getDeckById, parsePairs } from '@/types/deck';

interface CardData {
  id: number;
  content: string;
  pairId: number;
  isFlipped: boolean;
  isMatched: boolean;
  rotation: number;
}

interface Player {
  id: number;
  name: string;
  score: number;
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deck_id as string;
  const gameId = params.game_id as string;

  const [cards, setCards] = useState<CardData[]>([]);
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: 'Player 1', score: 0 },
    { id: 2, name: 'Player 2', score: 0 },
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [deckNotFound, setDeckNotFound] = useState<boolean>(false);

  useEffect(() => {
    // Load deck data
    const deck = getDeckById(decksData, deckId);

    if (!deck) {
      setDeckNotFound(true);
      return;
    }

    // Parse card pairs
    const cardPairs = parsePairs(deck.pairs);

    // Create cards with random rotations
    const expandedCards: CardData[] = [];
    cardPairs.forEach((pair, index) => {
      const rotation1 = Math.random() * 10 - 5;
      const rotation2 = Math.random() * 10 - 5;

      expandedCards.push(
        {
          id: index * 2,
          content: pair.front,
          pairId: index,
          isFlipped: false,
          isMatched: false,
          rotation: rotation1,
        },
        {
          id: index * 2 + 1,
          content: pair.back,
          pairId: index,
          isFlipped: false,
          isMatched: false,
          rotation: rotation2,
        }
      );
    });

    // Shuffle cards
    for (let i = expandedCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [expandedCards[i], expandedCards[j]] = [expandedCards[j], expandedCards[i]];
    }

    setCards(expandedCards);
  }, [deckId]);

  const handleCardClick = (id: number) => {
    // Prevent clicking during checking or if card is already flipped/matched
    if (isChecking || flippedCards.length >= 2) return;

    const card = cards.find((c) => c.id === id);
    if (!card || card.isFlipped || card.isMatched) return;

    // Flip the card
    const newFlippedCards = [...flippedCards, id];
    setFlippedCards(newFlippedCards);

    setCards((prevCards) =>
      prevCards.map((c) => (c.id === id ? { ...c, isFlipped: true } : c))
    );

    // Check for match when 2 cards are flipped
    if (newFlippedCards.length === 2) {
      setIsChecking(true);

      setTimeout(() => {
        checkForMatch(newFlippedCards);
      }, 1000);
    }
  };

  const checkForMatch = (flippedCardIds: number[]) => {
    const [firstId, secondId] = flippedCardIds;
    const firstCard = cards.find((c) => c.id === firstId);
    const secondCard = cards.find((c) => c.id === secondId);

    if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
      // Match found!
      setCards((prevCards) =>
        prevCards.map((c) =>
          c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c
        )
      );

      // Award point to current player
      setPlayers((prevPlayers) =>
        prevPlayers.map((p, index) =>
          index === currentPlayerIndex ? { ...p, score: p.score + 1 } : p
        )
      );

      // Check if game is over
      setTimeout(() => {
        checkGameOver();
      }, 500);
    } else {
      // No match - flip cards back
      setCards((prevCards) =>
        prevCards.map((c) =>
          c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c
        )
      );

      // Switch player
      setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
    }

    setFlippedCards([]);
    setIsChecking(false);
  };

  const checkGameOver = () => {
    const allMatched = cards.every((c) => c.isMatched);

    if (allMatched) {
      // Game over!
      const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
      const winnerPlayer = sortedPlayers[0];
      setWinner(winnerPlayer);

      setShowConfetti(true);
      setTimeout(() => {
        setShowWinnerModal(true);
      }, 500);
    }
  };

  const handleCloseModal = () => {
    setShowWinnerModal(false);
    setShowConfetti(false);
  };

  const handleBackToDecks = () => {
    router.push('/decks');
  };

  if (deckNotFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Deck Not Found</h1>
            <p className="text-gray-600 mb-6">
              The deck <span className="font-mono font-semibold">{deckId}</span> does not
              exist.
            </p>
            <button
              onClick={handleBackToDecks}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
            >
              Back to Decks
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <Confetti show={showConfetti} />
      <WinnerModal
        show={showWinnerModal}
        winner={winner}
        players={players}
        onClose={handleCloseModal}
      />

      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Language Learning Memory Game
          </h1>
          <p className="text-gray-600">
            Deck: {deckId.replace(/-/g, ' ')} | Game: {gameId}
          </p>
          <button
            onClick={handleBackToDecks}
            className="mt-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
          >
            ← Back to Decks
          </button>
        </div>

        {/* Players Score Board */}
        <div className="mb-8 flex justify-center gap-6">
          {players.map((player, index) => (
            <div
              key={player.id}
              className={`bg-white rounded-xl shadow-lg p-6 min-w-[200px] transition-all ${
                index === currentPlayerIndex
                  ? 'ring-4 ring-indigo-500 scale-105'
                  : 'opacity-70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{player.name}</h3>
                  {index === currentPlayerIndex && (
                    <p className="text-sm text-indigo-600 font-medium">Current Turn</p>
                  )}
                </div>
                <div className="text-3xl font-bold text-indigo-600">{player.score}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-8 max-w-4xl mx-auto p-8">
          {cards.map((card) => (
            <Card
              key={card.id}
              id={card.id}
              content={card.content}
              isFlipped={card.isFlipped}
              isMatched={card.isMatched}
              rotation={card.rotation}
              onClick={() => handleCardClick(card.id)}
            />
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          Click on cards to flip them
        </div>
      </div>
    </div>
  );
}
