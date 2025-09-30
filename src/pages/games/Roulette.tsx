import React, { useState } from 'react';
import { CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type BetType = 'red' | 'black' | 'even' | 'odd' | 'number';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const Roulette: React.FC = () => {
  const { user, updateBalance, addBet } = useAuth();
  const [betAmount, setBetAmount] = useState('10');
  const [betType, setBetType] = useState<BetType>('red');
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);

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

    if (betType === 'number' && selectedNumber === null) {
      toast.error('Please select a number');
      return;
    }

    updateBalance(-amount);
    setSpinning(true);

    // Simulate spin animation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate result (0-36)
    const result = Math.floor(Math.random() * 37);
    setLastResult(result);
    setSpinning(false);

    const isRed = RED_NUMBERS.includes(result);
    const isEven = result > 0 && result % 2 === 0;

    let won = false;
    let multiplier = 0;

    switch (betType) {
      case 'red':
        won = isRed;
        multiplier = 2;
        break;
      case 'black':
        won = !isRed && result !== 0;
        multiplier = 2;
        break;
      case 'even':
        won = isEven;
        multiplier = 2;
        break;
      case 'odd':
        won = !isEven && result !== 0;
        multiplier = 2;
        break;
      case 'number':
        won = result === selectedNumber;
        multiplier = 35;
        break;
    }

    if (won) {
      const winAmount = amount * multiplier;
      updateBalance(winAmount);
      
      addBet({
        game: 'Roulette',
        amount,
        odds: multiplier,
        result: 'win',
        profit: winAmount - amount,
      });

      toast.success(`🎯 Win! Number ${result}. You won $${winAmount.toFixed(2)}`);
    } else {
      addBet({
        game: 'Roulette',
        amount,
        odds: multiplier,
        result: 'loss',
        profit: -amount,
      });
      
      toast.error(`Number ${result}. Better luck next time!`);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDot className="h-6 w-6 text-accent" />
              Roulette
            </CardTitle>
            <CardDescription>Choose red, black, even, odd, or a specific number!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wheel display */}
            <div className="flex items-center justify-center p-8 bg-muted rounded-xl">
              <div className={`
                w-32 h-32 rounded-full border-8 border-secondary flex items-center justify-center
                ${spinning ? 'animate-spin' : ''}
              `}>
                {lastResult !== null && !spinning && (
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${RED_NUMBERS.includes(lastResult) ? 'text-destructive' : 'text-foreground'}`}>
                      {lastResult}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {lastResult === 0 ? 'Green' : RED_NUMBERS.includes(lastResult) ? 'Red' : 'Black'}
                    </div>
                  </div>
                )}
                {spinning && (
                  <div className="text-2xl font-bold text-secondary">?</div>
                )}
              </div>
            </div>

            {/* Betting options */}
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Bet Type</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <Button
                    onClick={() => setBetType('red')}
                    variant={betType === 'red' ? 'default' : 'outline'}
                    className={betType === 'red' ? 'bg-destructive hover:bg-destructive/90' : ''}
                  >
                    Red (2x)
                  </Button>
                  <Button
                    onClick={() => setBetType('black')}
                    variant={betType === 'black' ? 'default' : 'outline'}
                  >
                    Black (2x)
                  </Button>
                  <Button
                    onClick={() => setBetType('even')}
                    variant={betType === 'even' ? 'default' : 'outline'}
                  >
                    Even (2x)
                  </Button>
                  <Button
                    onClick={() => setBetType('odd')}
                    variant={betType === 'odd' ? 'default' : 'outline'}
                  >
                    Odd (2x)
                  </Button>
                  <Button
                    onClick={() => setBetType('number')}
                    variant={betType === 'number' ? 'default' : 'outline'}
                  >
                    Number (35x)
                  </Button>
                </div>
              </div>

              {betType === 'number' && (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Select Number (0-36)</label>
                  <div className="grid grid-cols-10 gap-1">
                    {Array.from({ length: 37 }).map((_, i) => (
                      <Button
                        key={i}
                        onClick={() => setSelectedNumber(i)}
                        variant={selectedNumber === i ? 'default' : 'outline'}
                        size="sm"
                        className={`
                          ${selectedNumber === i ? 'bg-primary' : ''}
                          ${i === 0 ? 'bg-success/20' : RED_NUMBERS.includes(i) ? 'text-destructive' : ''}
                        `}
                      >
                        {i}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

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
                className="w-full glow-accent bg-accent hover:bg-accent/90"
                size="lg"
              >
                {spinning ? 'Spinning...' : 'Spin'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Roulette;
