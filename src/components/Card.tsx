interface CardProps {
  id: number;
  content: string;
  isFlipped: boolean;
  isMatched: boolean;
  rotation: number;
  onClick: () => void;
}

export default function Card({ content, isFlipped, isMatched, rotation, onClick }: CardProps) {
  return (
    <div
      className="relative w-full aspect-square cursor-pointer perspective-1000"
      style={{ transform: `rotate(${rotation}deg)` }}
      onClick={onClick}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* カード裏面 */}
        <div
          className={`absolute w-full h-full rounded-xl shadow-lg backface-hidden ${
            isMatched
              ? 'bg-green-400 border-4 border-green-500'
              : 'bg-gradient-to-br from-indigo-500 to-purple-600'
          }`}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-6xl">🎴</div>
          </div>
        </div>

        {/* カード表面 */}
        <div
          className={`absolute w-full h-full rounded-xl shadow-lg backface-hidden rotate-y-180 ${
            isMatched
              ? 'bg-green-50 border-4 border-green-500'
              : 'bg-white border-2 border-gray-200'
          }`}
        >
          <div className="w-full h-full flex items-center justify-center p-4">
            <div
              className={`text-center font-medium break-words ${
                content.length > 10 ? 'text-sm' : 'text-lg'
              } ${isMatched ? 'text-green-700' : 'text-gray-800'}`}
            >
              {content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
