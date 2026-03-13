import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

type GamePhase = 'waiting' | 'countdown' | 'flying' | 'crashed';

interface BetSlot {
  amount: string;
  placed: boolean;
  cashoutMultiplier: number | null;
  autoCashout: string;
  autoCashoutEnabled: boolean;
  queued?: boolean;
}

interface Props {
  slotIdx: number;
  bet: BetSlot;
  setBet: React.Dispatch<React.SetStateAction<BetSlot>>;
  gamePhase: GamePhase;
  currentMultiplier: number;
  onPlaceBet: (slotIdx: number) => void;
  onCashout: (slotIdx: number) => void;
}

const AviatorBetPanel: React.FC<Props> = ({ slotIdx, bet, setBet, gamePhase, currentMultiplier, onPlaceBet, onCashout }) => {
  const isFlying = gamePhase === 'flying';
  const isCrashed = gamePhase === 'crashed';
  const hasCashedOut = !!bet.cashoutMultiplier;

  // Determine button state
  const renderButton = () => {
    // During crash: disabled briefly
    if (isCrashed) {
      return (
        <Button disabled className="w-full opacity-60">
          {hasCashedOut ? `Retirou ${bet.cashoutMultiplier!.toFixed(2)}x` : '💥 Crashed'}
        </Button>
      );
    }

    // Flying + bet placed + not cashed out = CASHOUT BUTTON (ALWAYS CLICKABLE)
    if (isFlying && bet.placed && !hasCashedOut) {
      return (
        <Button
          onClick={() => onCashout(slotIdx)}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base sm:text-lg animate-pulse"
        >
          RETIRAR {currentMultiplier.toFixed(2)}x
        </Button>
      );
    }

    // Flying + already cashed out
    if (isFlying && hasCashedOut) {
      return (
        <Button disabled className="w-full bg-primary/20 text-primary font-bold">
          ✓ Retirou {bet.cashoutMultiplier!.toFixed(2)}x
        </Button>
      );
    }

    // Flying + NOT bet placed = queue for next round
    if (isFlying && !bet.placed) {
      return (
        <Button
          onClick={() => setBet(b => ({ ...b, queued: true }))}
          className="w-full"
          variant={bet.queued ? 'secondary' : 'default'}
        >
          {bet.queued ? 'Aposta Engatilhada ✓' : 'Apostar na Próxima'}
        </Button>
      );
    }

    // Waiting / Countdown = place bet
    return (
      <Button
        onClick={() => onPlaceBet(slotIdx)}
        className="w-full glow-primary"
      >
        Apostar
      </Button>
    );
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Aposta {slotIdx}</span>
          {hasCashedOut && (
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
              ✓ {bet.cashoutMultiplier!.toFixed(2)}x
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Valor (R$)</label>
            <Input
              type="number"
              value={bet.amount}
              onChange={(e) => setBet(b => ({ ...b, amount: e.target.value }))}
              className="bg-input h-8 sm:h-9 text-sm"
              min="1"
            />
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Switch
                checked={bet.autoCashoutEnabled}
                onCheckedChange={(v) => setBet(b => ({ ...b, autoCashoutEnabled: v }))}
                className="scale-75"
              />
              <label className="text-xs text-muted-foreground">Auto Cashout</label>
            </div>
            <Input
              type="number"
              value={bet.autoCashout}
              onChange={(e) => setBet(b => ({ ...b, autoCashout: e.target.value }))}
              placeholder="2.00"
              disabled={!bet.autoCashoutEnabled}
              className="bg-input h-8 sm:h-9 text-sm"
              min="1.01"
              step="0.01"
            />
          </div>
        </div>
        <div className="flex gap-1">
          {[5, 10, 50, 100].map(v => (
            <Button
              key={v}
              onClick={() => setBet(b => ({ ...b, amount: v.toString() }))}
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
            >
              {v}
            </Button>
          ))}
        </div>
        {renderButton()}
      </CardContent>
    </Card>
  );
};

export default AviatorBetPanel;
