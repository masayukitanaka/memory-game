'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import decksData from '@/data/decks.json';
import { Deck } from '@/types/deck';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function DecksPage() {
  const router = useRouter();
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleDeckClick = (deck: Deck) => {
    setSelectedDeck(deck);
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (selectedDeck) {
      // Generate a unique game ID
      const gameId = `game-${Date.now()}`;
      router.push(`/${selectedDeck.deck_id}/${gameId}`);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setSelectedDeck(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <ConfirmDialog
        show={showConfirmDialog}
        title={selectedDeck?.deck_id.replace(/-/g, ' ').toUpperCase() || ''}
        description={selectedDeck?.description || ''}
        numberOfCards={selectedDeck?.number_of_cards || 0}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <div className="max-w-6xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Choose Your Deck
          </h1>
          <p className="text-gray-600 text-lg">
            Select a deck to start your memory game
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decksData.decks.map((deck) => (
            <button
              key={deck.deck_id}
              onClick={() => handleDeckClick(deck)}
              className="bg-white rounded-2xl shadow-lg p-8 text-left hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-indigo-500"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">🎴</div>
                <div className="bg-indigo-100 text-indigo-700 text-sm font-semibold px-3 py-1 rounded-full">
                  {deck.number_of_cards} cards
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-3 capitalize">
                {deck.deck_id.replace(/-/g, ' ')}
              </h2>

              <p className="text-gray-600 mb-4 line-clamp-2">
                {deck.description}
              </p>

              <div className="flex items-center text-indigo-600 font-medium">
                <span>Start Game</span>
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {decksData.decks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-500 text-lg">No decks available</p>
          </div>
        )}

        <div className="mt-12 text-center">
          <a
            href="/mock_ui"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors shadow-lg"
          >
            View Mock UI
          </a>
        </div>
      </div>
    </div>
  );
}
