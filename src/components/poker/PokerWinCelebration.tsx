import React, { useEffect } from 'react';
import { Crown, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBRLShort } from '@/lib/formatCurrency';
import { soundManager } from '@/lib/soundManager';

interface PokerWinCelebrationProps {
  show: boolean;
  winnerName: string;
  isYou: boolean;
  amount: number;
  handName?: string;
  onDismiss: () => void;
}

export const PokerWinCelebration: React.FC<PokerWinCelebrationProps> = ({
  show,
  winnerName,
  isYou,
  amount,
  handName,
  onDismiss,
}) => {
  useEffect(() => {
    if (show && isYou) {
      soundManager.playGrandWin();
    }
  }, [show, isYou]);

  if (!show || amount <= 0) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center p-4">
      {/* Chuva de partículas douradas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-bounce"
            style={{
              left: `${(i * 4.1) % 100}%`,
              top: `${(i * 7) % 80}%`,
              width: `${Math.random() * 7 + 4}px`,
              height: `${Math.random() * 7 + 4}px`,
              backgroundColor: i % 2 === 0 ? '#fbbf24' : '#f59e0b',
              boxShadow: '0 0 10px #fbbf24',
              animationDuration: `${Math.random() * 2 + 1.5}s`,
              animationDelay: `${Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Banner de Vitória */}
      <div className="pointer-events-auto max-w-md w-full bg-gradient-to-b from-neutral-900/95 via-stone-950/95 to-black/95 backdrop-blur-xl border-2 border-amber-400 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(251,191,36,0.5)] text-center space-y-3 animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-black shadow-[0_0_30px_rgba(251,191,36,0.8)]">
          <Crown className="w-9 h-9" />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            {isYou ? 'VOCÊ LEVOU O POTE!' : `${winnerName} GANHOU O POTE!`}
          </div>

          <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 tabular-nums">
            + {formatBRLShort(amount)}
          </div>

          {handName && (
            <div className="text-sm font-bold text-white/90 flex items-center justify-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" /> {handName}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          onClick={onDismiss}
          className="border-white/20 text-white hover:bg-white/10 text-xs h-10 w-full sm:w-auto"
        >
          Continuar Jogando
        </Button>
      </div>
    </div>
  );
};

export default PokerWinCelebration;
