interface ConfirmDialogProps {
  show: boolean;
  title: string;
  description: string;
  numberOfCards: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  show,
  title,
  description,
  numberOfCards,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scale-in">
        <div className="text-center">
          <div className="text-5xl mb-4">🎴</div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
          <p className="text-gray-600 mb-4">{description}</p>

          <div className="bg-indigo-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-indigo-600 font-medium">
              Cards in this deck: <span className="text-2xl font-bold">{numberOfCards}</span>
            </p>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            Ready to start a new game?
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
