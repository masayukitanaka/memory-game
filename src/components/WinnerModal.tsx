interface Player {
  id: number;
  name: string;
  score: number;
}

interface WinnerModalProps {
  show: boolean;
  winner: Player | null;
  players: Player[];
  onClose: () => void;
}

export default function WinnerModal({ show, winner, players, onClose }: WinnerModalProps) {
  if (!show || !winner) return null;

  const isTie = players.filter((p) => p.score === winner.score).length > 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scale-in">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>

          {isTie ? (
            <>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">It's a Tie!</h2>
              <p className="text-gray-600 mb-6">Great game everyone!</p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Game Over!</h2>
              <p className="text-xl text-gray-600 mb-6">
                <span className="font-semibold text-indigo-600">{winner.name}</span> wins!
              </p>
            </>
          )}

          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              Final Scores
            </h3>
            {players
              .sort((a, b) => b.score - a.score)
              .map((player) => (
                <div
                  key={player.id}
                  className="flex justify-between items-center py-2 border-b last:border-b-0"
                >
                  <span
                    className={`font-medium ${
                      player.id === winner.id ? 'text-indigo-600' : 'text-gray-700'
                    }`}
                  >
                    {player.name}
                    {player.id === winner.id && !isTie && ' 👑'}
                  </span>
                  <span className="text-2xl font-bold text-gray-800">
                    {player.score}
                  </span>
                </div>
              ))}
          </div>

          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
