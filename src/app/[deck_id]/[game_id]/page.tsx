'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Confetti from '@/components/Confetti';
import WinnerModal from '@/components/WinnerModal';
import { getSessionInfo, setPlayerName, getAllSessions, sendHeartbeat } from './actions';
import { fetchGameById } from '@/app/actions/games';

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
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [deckNotFound, setDeckNotFound] = useState<boolean>(false);
  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string;
    playerName: string;
    createdAt: string;
  } | null>(null);
  const [editingName, setEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [allSessions, setAllSessions] = useState<{
    currentSessionId: string;
    sessions: Array<{
      sessionId: string;
      playerName: string;
      updatedAt: string;
      createdAt: string;
    }>;
  } | null>(null);

  useEffect(() => {
    // Load session info
    getSessionInfo().then((info) => {
      setSessionInfo(info);
      setNameInput(info.playerName);
    });

    // Send initial heartbeat immediately
    sendHeartbeat();

    // Load all sessions
    const loadSessions = () => {
      getAllSessions().then((data) => {
        setAllSessions(data);
      });
    };

    loadSessions();

    // Send heartbeat every 30 seconds to keep session alive
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 30000);

    // Refresh sessions list every 30 seconds
    const sessionsInterval = setInterval(loadSessions, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(sessionsInterval);
    };
  }, []);

  // Update players list when sessions change
  useEffect(() => {
    if (allSessions && allSessions.sessions.length > 0) {
      const newPlayers: Player[] = allSessions.sessions.slice(0, 2).map((session, index) => {
        // Keep existing score if player already exists
        const existingPlayer = players.find((p) => p.id === index + 1);
        return {
          id: index + 1,
          name: session.playerName,
          score: existingPlayer?.score || 0,
        };
      });

      // Only update if players changed
      if (JSON.stringify(newPlayers.map((p) => p.name)) !== JSON.stringify(players.map((p) => p.name))) {
        setPlayers(newPlayers);
      }
    }
  }, [allSessions]);

  useEffect(() => {
    // Load game data from database
    fetchGameById(gameId).then(({ game }) => {
      if (!game) {
        setDeckNotFound(true);
        return;
      }

      // Use the shuffled cards from the database
      setCards(game.cards);
    });
  }, [gameId]);

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

  const handleSaveName = async () => {
    if (nameInput.trim()) {
      await setPlayerName(nameInput.trim());
      setSessionInfo((prev) =>
        prev ? { ...prev, playerName: nameInput.trim() } : prev
      );
      setEditingName(false);

      // Refresh sessions list
      const data = await getAllSessions();
      setAllSessions(data);
    }
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

          {/* Session Info */}
          {sessionInfo && (
            <div className="mt-4 bg-white rounded-lg shadow p-4 inline-block">
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">Session:</span>{' '}
                  {sessionInfo.sessionId}
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="font-semibold">Player:</span>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') {
                            setEditingName(false);
                            setNameInput(sessionInfo.playerName);
                          }
                        }}
                        className="border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveName}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingName(false);
                          setNameInput(sessionInfo.playerName);
                        }}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-indigo-600 font-medium">
                        {sessionInfo.playerName}
                      </span>
                      <button
                        onClick={() => setEditingName(true)}
                        className="text-indigo-600 hover:text-indigo-700 text-xs underline"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* All Connected Sessions */}
          {allSessions && allSessions.sessions.length > 0 && (
            <div className="mt-4 bg-white rounded-lg shadow p-4 inline-block max-w-2xl">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Connected Players ({allSessions.sessions.length})
              </h3>
              <div className="space-y-2">
                {allSessions.sessions.map((session) => {
                  const isCurrentUser = session.sessionId === allSessions.currentSessionId;
                  return (
                    <div
                      key={session.sessionId}
                      className={`flex items-center justify-between p-2 rounded ${
                        isCurrentUser
                          ? 'bg-indigo-50 border-2 border-indigo-500'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isCurrentUser ? 'bg-indigo-600' : 'bg-gray-400'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                isCurrentUser ? 'text-indigo-700' : 'text-gray-700'
                              }`}
                            >
                              {session.playerName}
                            </span>
                            {isCurrentUser && (
                              <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {session.sessionId.substring(0, 20)}...
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(session.updatedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Players Score Board */}
        <div className="mb-8 flex justify-center gap-6">
          {players.length > 0 ? (
            players.map((player, index) => {
              const isCurrentUser = allSessions && allSessions.sessions[index]?.sessionId === allSessions.currentSessionId;
              return (
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
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-800">{player.name}</h3>
                        {isCurrentUser && (
                          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      {index === currentPlayerIndex && (
                        <p className="text-sm text-indigo-600 font-medium">Current Turn</p>
                      )}
                    </div>
                    <div className="text-3xl font-bold text-indigo-600">{player.score}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-gray-500 text-sm">
              Waiting for players to connect...
            </div>
          )}
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
