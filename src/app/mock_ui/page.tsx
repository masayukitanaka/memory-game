'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Confetti from '@/components/Confetti';
import WinnerModal from '@/components/WinnerModal';

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

export default function MockUIPage() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: 'Player 1', score: 3 },
    { id: 2, name: 'Player 2', score: 5 },
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | null>(null);

  useEffect(() => {
    // モックデータ：言語学習用のカードペア
    const cardPairs = [
      { front: 'Hello', back: 'こんにちは' },
      { front: 'Thank you', back: 'ありがとう' },
      { front: 'Good morning', back: 'おはよう' },
      { front: 'Goodbye', back: 'さようなら' },
      { front: 'Yes', back: 'はい' },
      { front: 'No', back: 'いいえ' },
      { front: 'Please', back: 'お願いします' },
      { front: 'Sorry', back: 'ごめんなさい' },
    ];

    // カードペアを展開してシャッフル
    const expandedCards: CardData[] = [];
    cardPairs.forEach((pair, index) => {
      // -5度から+5度の間でランダムな角度を生成
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

    // シャッフル
    for (let i = expandedCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [expandedCards[i], expandedCards[j]] = [expandedCards[j], expandedCards[i]];
    }

    setCards(expandedCards);
  }, []);

  const handleCardClick = (id: number) => {
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === id && !card.isMatched
          ? { ...card, isFlipped: !card.isFlipped }
          : card
      )
    );
  };

  const handleGameEnd = () => {
    // Determine winner
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winnerPlayer = sortedPlayers[0];
    setWinner(winnerPlayer);

    // Show confetti and modal
    setShowConfetti(true);
    setTimeout(() => {
      setShowWinnerModal(true);
    }, 500);
  };

  const handleCloseModal = () => {
    setShowWinnerModal(false);
    setShowConfetti(false);
  };

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
          <p className="text-gray-600">Mock UI - Development Preview</p>
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
                  <h3 className="text-lg font-semibold text-gray-800">
                    {player.name}
                  </h3>
                  {index === currentPlayerIndex && (
                    <p className="text-sm text-indigo-600 font-medium">Current Turn</p>
                  )}
                </div>
                <div className="text-3xl font-bold text-indigo-600">
                  {player.score}
                </div>
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

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">Click on cards to flip them</p>

          {/* Test Button */}
          <button
            onClick={handleGameEnd}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-lg"
          >
            🎉 Test Game End
          </button>
        </div>
      </div>
    </div>
  );
}
