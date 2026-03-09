import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { formatBRLShort } from '@/lib/formatCurrency';

type GamePhase = 'waiting' | 'countdown' | 'flying' | 'crashed';

interface BetSlot {
  amount: string;
  placed: boolean;
  cashoutMultiplier: number | null;
  autoCashout: string;
  autoCashoutEnabled: boolean;
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
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Aposta {slotIdx}</span>
          {bet.cashoutMultiplier && (
            <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">
              ✓ {bet.cashoutMultiplier.toFixed(2)}x
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Valor (€)</label>
            <Input
              type="number"
              value={bet.amount}
              onChange={(e) => setBet(b => ({ ...b, amount: e.target.value }))}
              disabled={bet.placed || gamePhase === 'flying'}
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
              disabled={bet.placed || gamePhase === 'flying'}
              className="flex-1 h-7 text-xs"
            >
              {v}
            </Button>
          ))}
        </div>
        {!bet.placed ? (
          <Button
            onClick={() => onPlaceBet(slotIdx)}
            disabled={gamePhase === 'flying'}
            className="w-full glow-primary"
          >
            Apostar
          </Button>
        ) : (
          <Button
            onClick={() => onCashout(slotIdx)}
            disabled={gamePhase !== 'flying' || !!bet.cashoutMultiplier}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-base sm:text-lg"
          >
            {bet.cashoutMultiplier
              ? `Retirou ${bet.cashoutMultiplier.toFixed(2)}x`
              : `RETIRAR ${currentMultiplier.toFixed(2)}x`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AviatorBetPanel;
