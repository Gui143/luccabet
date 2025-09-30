import React, { useState } from 'react';
import { Trophy, Cherry, Coins, Gem } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const SYMBOLS = [
  { icon: Cherry, name: 'Cherry', multiplier: 2 },
  { icon: Coins, name: 'Coin', multiplier: 3 },
  { icon: Gem, name: 'Gem', multiplier: 5 },
  { icon: Trophy, name: 'Trophy', multiplier: 10 },
];

const Slots: React.FC = () => {
  const { user, updateBalance, addBet } = useAuth();
  const [betAmount, setBetAmount] = useState('10');
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState([0, 1, 2]);
  const [lastWin, setLastWin] = useState(0);

  const spin = async () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid bet amount');
      return;
    }
    if (amount > (user?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    updateBalance(-amount);
    setSpinning(true);
    setLastWin(0);

    // Animate reels
    const spinDuration = 2000;
    const interval = setInterval(() => {
      setReels([
        Math.floor(Math.random() * SYMBOLS.length),
        Math.floor(Math.random() * SYMBOLS.length),
        Math.floor(Math.random() * SYMBOLS.length),
      ]);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      
      // Final result
      const finalReels = [
        Math.floor(Math.random() * SYMBOLS.length),
        Math.floor(Math.random() * SYMBOLS.length),
        Math.floor(Math.random() * SYMBOLS.length),
      ];
      setReels(finalReels);
      setSpinning(false);

      // Check for wins
      let multiplier = 0;
      if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
        // All three match
        multiplier = SYMBOLS[finalReels[0]].multiplier;
      } else if (finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2]) {
        // Two match
        multiplier = 1.5;
      }

      if (multiplier > 0) {
        const winAmount = amount * multiplier;
        updateBalance(winAmount);
        setLastWin(winAmount);
        
        addBet({
          game: 'Slots',
          amount,
          odds: multiplier,
          result: 'win',
          profit: winAmount - amount,
        });

        toast.success(`🎰 Win! You won $${winAmount.toFixed(2)}`);
      } else {
        addBet({
          game: 'Slots',
          amount,
          odds: 0,
          result: 'loss',
          profit: -amount,
        });
        
        toast.error('No match. Try again!');
      }
    }, spinDuration);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-secondary" />
              Slots
            </CardTitle>
            <CardDescription>Match three symbols to win big!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4 rounded-xl bg-muted p-8 justify-center">
              {reels.map((symbolIndex, index) => {
                const Symbol = SYMBOLS[symbolIndex].icon;
                return (
                  <div
                    key={index}
                    className={`
                      w-24 h-24 rounded-xl bg-card border-4 border-border flex items-center justify-center
                      ${spinning ? 'animate-spin' : ''}
                    `}
                  >
                    <Symbol className="h-12 w-12 text-secondary" />
                  </div>
                );
              })}
            </div>

            {lastWin > 0 && (
              <div className="text-center p-4 rounded-lg bg-success/20 border border-success">
                <div className="text-sm text-success-foreground mb-1">Last Win</div>
                <div className="text-3xl font-bold text-success">${lastWin.toFixed(2)}</div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Bet Amount</label>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={spinning}
                  className="bg-input"
                  min="1"
                  step="1"
                />
              </div>

              <Button 
                onClick={spin} 
                disabled={spinning}
                className="w-full glow-secondary bg-secondary hover:bg-secondary/90"
                size="lg"
              >
                {spinning ? 'Spinning...' : 'Spin'}
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <div className="text-sm text-muted-foreground mb-3">Payout Table</div>
              <div className="space-y-2">
                {SYMBOLS.map((symbol, index) => {
                  const Icon = symbol.icon;
                  return (
                    <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <span className="text-sm">3x {symbol.name}</span>
                      </div>
                      <span className="font-bold text-secondary">{symbol.multiplier}x</span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">2x Match</span>
                  <span className="font-bold text-primary">1.5x</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Slots;
