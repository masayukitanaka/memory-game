'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Confetti from '@/components/Confetti';
import WinnerModal from '@/components/WinnerModal';
import { getSessionInfo, setPlayerName, getAllSessions, sendHeartbeat } from './actions';
import { fetchGameById } from '@/app/actions/games';
import { useGameWebSocket } from '@/hooks/useGameWebSocket';

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
  const [currentTurnSessionId, setCurrentTurnSessionId] = useState<string | null>(null);
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

  // WebSocket connection for real-time synchronization
  // Only connect when sessionInfo is available
  const { sendMessage } = useGameWebSocket({
    gameId,
    sessionId: sessionInfo?.sessionId || '',
    enabled: !!sessionInfo,  // Only connect if sessionInfo is loaded
    onConnected: () => {
      console.log('[Page] WebSocket connected, sessionId:', sessionInfo?.sessionId);
      // Register player immediately after connection
      if (sessionInfo) {
        console.log('[Page] Sending register_player');
        sendMessage({
          type: 'register_player',
          data: {
            sessionId: sessionInfo.sessionId,
            playerName: sessionInfo.playerName,
          },
        });
      }
    },
    onGameEnd: (winner) => {
      setWinner(winner);
      setShowConfetti(true);
      setTimeout(() => {
        setShowWinnerModal(true);
      }, 500);
    },
    onCardsUpdated: (updatedCards) => {
      setCards(updatedCards);
    },
    onPlayersUpdated: (updatedPlayers) => {
      // Convert server Player format (with sessionId) to client Player format (with id)
      const clientPlayers = updatedPlayers.map((p: any, index: number) => ({
        id: index + 1,
        name: p.name,
        score: p.score,
      }));
      setPlayers(clientPlayers);
    },
    onCardFlipped: ({ cardId, isFlipped }) => {
      // Update card flip state
      setCards((prevCards) =>
        prevCards.map((c) => (c.id === cardId ? { ...c, isFlipped } : c))
      );

      // Add to flipped cards if flipping (not unflipping)
      if (isFlipped) {
        setFlippedCards((prev) => {
          if (!prev.includes(cardId)) {
            const newFlipped = [...prev, cardId];
            // Set isChecking when 2 cards are flipped
            if (newFlipped.length === 2) {
              setIsChecking(true);
            }
            return newFlipped;
          }
          return prev;
        });
      }
    },
    onPlayerSwitched: ({ sessionId, currentPlayerIndex: newIndex }) => {
      console.log('Received player_switched:', sessionId, newIndex);
      setCurrentTurnSessionId(sessionId);
      setCurrentPlayerIndex(newIndex);
    },
    onCardsMatched: ({ cardIds, players: updatedPlayers }) => {
      // Update cards to matched
      setCards((prevCards) =>
        prevCards.map((c) =>
          cardIds.includes(c.id) ? { ...c, isMatched: true } : c
        )
      );
      // Update players scores - convert server format to client format
      const clientPlayers = updatedPlayers.map((p: any, index: number) => ({
        id: index + 1,
        name: p.name,
        score: p.score,
      }));
      setPlayers(clientPlayers);
      // Reset flipped cards and checking state
      setFlippedCards([]);
      setIsChecking(false);
    },
    onCardsUnmatched: ({ cardIds }) => {
      console.log('Received cards_unmatched:', cardIds);
      // Flip cards back
      setCards((prevCards) =>
        prevCards.map((c) =>
          cardIds.includes(c.id) ? { ...c, isFlipped: false } : c
        )
      );
      // Reset flipped cards and checking state
      setFlippedCards([]);
      setIsChecking(false);
    },
    onCurrentTurn: ({ sessionId }) => {
      console.log('[Page] Received current_turn from server:', sessionId);
      if (sessionId) {
        setCurrentTurnSessionId(sessionId);
        // Find the index of this sessionId in sorted sessions
        if (allSessions) {
          const sortedSessions = [...allSessions.sessions]
            .sort((a, b) => a.sessionId.localeCompare(b.sessionId))
            .slice(0, 2);
          const index = sortedSessions.findIndex(s => s.sessionId === sessionId);
          if (index !== -1) {
            setCurrentPlayerIndex(index);
          }
        }
      }
    },
  });

  useEffect(() => {
    // Load session info
    getSessionInfo().then((info) => {
      setSessionInfo(info);
      setNameInput(info.playerName);
      // Note: Player registration now happens in onConnected callback
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
      // Sort sessions by sessionId to ensure consistent order across all clients
      const sortedSessions = [...allSessions.sessions]
        .sort((a, b) => a.sessionId.localeCompare(b.sessionId))
        .slice(0, 2);

      const newPlayers: Player[] = sortedSessions.map((session, index) => {
        // Keep existing score if player already exists with same sessionId
        const existingPlayer = players.find((p) => {
          const existingSession = allSessions.sessions.find(s => s.playerName === p.name);
          return existingSession?.sessionId === session.sessionId;
        });
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

      // Note: currentTurnSessionId is now managed by the Durable Object and synced via WebSocket
      // Do not initialize it locally anymore
    }
  }, [allSessions, currentTurnSessionId, players]);

  useEffect(() => {
    // Load game data from database
    fetchGameById(gameId).then(({ game }) => {
      if (!game) {
        setDeckNotFound(true);
        return;
      }

      // Use the shuffled cards from the database
      setCards(game.cards);

      // Initialize game on server
      sendMessage({
        type: 'init_game',
        data: { cards: game.cards },
      });
    });
  }, [gameId, sendMessage]);

  const handleCardClick = (id: number) => {
    console.log('[handleCardClick] Card clicked:', id);
    console.log('[handleCardClick] isChecking:', isChecking, 'flippedCards.length:', flippedCards.length);

    // Prevent clicking during checking or if card is already flipped/matched
    if (isChecking || flippedCards.length >= 2) {
      console.log('[handleCardClick] Blocked: isChecking or too many flipped cards');
      return;
    }

    const card = cards.find((c) => c.id === id);
    console.log('[handleCardClick] Card found:', card);
    if (!card || card.isFlipped || card.isMatched) {
      console.log('[handleCardClick] Blocked: card invalid, already flipped, or matched');
      return;
    }

    // Only allow current player to click (check by sessionId)
    console.log('[handleCardClick] Turn check - sessionInfo:', sessionInfo?.sessionId, 'currentTurn:', currentTurnSessionId);
    if (!sessionInfo || sessionInfo.sessionId !== currentTurnSessionId) {
      console.log('[handleCardClick] Blocked: Not your turn. Current turn:', currentTurnSessionId, 'Your session:', sessionInfo?.sessionId);
      return; // Not this player's turn
    }

    console.log('[handleCardClick] Sending card_click to server');
    // Send card click to server (server will handle all logic)
    sendMessage({
      type: 'card_click',
      data: { cardId: id },
    });
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
            (() => {
              // Sort sessions to match player order
              const sortedSessions = allSessions
                ? [...allSessions.sessions].sort((a, b) => a.sessionId.localeCompare(b.sessionId)).slice(0, 2)
                : [];

              console.log('Current Turn SessionId:', currentTurnSessionId);
              console.log('Sorted Sessions:', sortedSessions.map(s => ({ id: s.sessionId, name: s.playerName })));

              return players.map((player, index) => {
                const session = sortedSessions[index];
                const isCurrentUser = session?.sessionId === allSessions?.currentSessionId;
                const isCurrentTurn = session?.sessionId === currentTurnSessionId;
                console.log(`Player ${index} (${player.name}): sessionId=${session?.sessionId}, isCurrentTurn=${isCurrentTurn}, isCurrentUser=${isCurrentUser}`);
                return (
                <div
                  key={player.id}
                  className={`bg-white rounded-xl shadow-lg p-6 min-w-[200px] transition-all ${
                    isCurrentTurn
                      ? 'ring-4 ring-indigo-500 scale-105'
                      : 'opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{player.name}</h3>
                        {isCurrentUser && (
                          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      {isCurrentTurn ? (
                        <p className="text-sm text-indigo-600 font-bold flex items-center gap-1">
                          <span className="inline-block w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
                          Current Turn
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">Waiting...</p>
                      )}
                    </div>
                    <div className="text-3xl font-bold text-indigo-600">{player.score}</div>
                  </div>
                </div>
              );
            });
          })()
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

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">Click on cards to flip them</p>
        </div>
      </div>
    </div>
  );
}
