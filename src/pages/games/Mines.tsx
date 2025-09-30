import React, { useState } from 'react';
import { Bomb, Gem } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const GRID_SIZE = 25;

const Mines: React.FC = () => {
  const { user, updateBalance, addBet } = useAuth();
  const [betAmount, setBetAmount] = useState('10');
  const [bombCount, setBombCount] = useState(5);
  const [gameActive, setGameActive] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [bombs, setBombs] = useState<Set<number>>(new Set());
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [gameOver, setGameOver] = useState(false);

  const startGame = () => {
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
    
    // Generate random bomb positions based on user selection
    const bombPositions = new Set<number>();
    while (bombPositions.size < bombCount) {
      bombPositions.add(Math.floor(Math.random() * GRID_SIZE));
    }

    setBombs(bombPositions);
    setRevealed(new Set());
    setGameActive(true);
    setGameOver(false);
    setCurrentMultiplier(1);
    toast.success(`Game started! Bet: $${amount}`);
  };

  const revealCell = (index: number) => {
    if (!gameActive || revealed.has(index) || gameOver) return;

    const newRevealed = new Set(revealed);
    newRevealed.add(index);
    setRevealed(newRevealed);

    if (bombs.has(index)) {
      // Hit a bomb - game over
      setGameOver(true);
      setGameActive(false);
      
      addBet({
        game: 'Mines',
        amount: parseFloat(betAmount),
        odds: currentMultiplier,
        result: 'loss',
        profit: -parseFloat(betAmount),
      });
      
      toast.error('💥 Boom! You hit a bomb!');
    } else {
      // Safe cell - increase multiplier
      const newMultiplier = 1 + (newRevealed.size * 0.2);
      setCurrentMultiplier(newMultiplier);
      toast.success(`Safe! Multiplier: ${newMultiplier.toFixed(2)}x`);
    }
  };

  const cashOut = () => {
    if (!gameActive || revealed.size === 0) return;

    const winAmount = parseFloat(betAmount) * currentMultiplier;
    updateBalance(winAmount);
    
    addBet({
      game: 'Mines',
      amount: parseFloat(betAmount),
      odds: currentMultiplier,
      result: 'win',
      profit: winAmount - parseFloat(betAmount),
    });

    setGameActive(false);
    setGameOver(true);
    toast.success(`💎 Cashed out! Won $${winAmount.toFixed(2)}`);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gem className="h-6 w-6 text-primary" />
              Mines
            </CardTitle>
            <CardDescription>Find diamonds and avoid bombs. Cash out before it's too late!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Bet Amount</label>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={gameActive}
                  className="bg-input"
                  min="1"
                  step="1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Number of Bombs: {bombCount}
                </label>
                <Slider
                  value={[bombCount]}
                  onValueChange={(value) => setBombCount(value[0])}
                  min={1}
                  max={15}
                  step={1}
                  disabled={gameActive}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={startGame} 
                disabled={gameActive}
                className="glow-primary flex-1"
              >
                Start Game
              </Button>
              {gameActive && (
                <Button 
                  onClick={cashOut}
                  className="glow-secondary bg-secondary hover:bg-secondary/90"
                  disabled={revealed.size === 0}
                >
                  Cash Out ${(parseFloat(betAmount) * currentMultiplier).toFixed(2)}
                </Button>
              )}
            </div>

            {gameActive && (
              <div className="flex justify-between items-center p-4 rounded-lg bg-muted">
                <div>
                  <div className="text-sm text-muted-foreground">Current Multiplier</div>
                  <div className="text-2xl font-bold text-secondary">{currentMultiplier.toFixed(2)}x</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Potential Win</div>
                  <div className="text-2xl font-bold text-primary">${(parseFloat(betAmount) * currentMultiplier).toFixed(2)}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: GRID_SIZE }).map((_, index) => {
                const isRevealed = revealed.has(index);
                const isBomb = bombs.has(index);
                const showBomb = isRevealed && isBomb;
                const showGem = isRevealed && !isBomb;
                const showAll = gameOver;

                return (
                  <button
                    key={index}
                    onClick={() => revealCell(index)}
                    disabled={!gameActive || isRevealed || gameOver}
                    className={`
                      aspect-square rounded-lg border-2 transition-all flex items-center justify-center
                      ${isRevealed 
                        ? isBomb 
                          ? 'bg-destructive border-destructive' 
                          : 'bg-success border-success'
                        : 'bg-card border-border hover:border-primary hover:scale-105 cursor-pointer'
                      }
                      ${!gameActive && 'cursor-not-allowed opacity-50'}
                      ${showAll && bombs.has(index) && !isRevealed && 'bg-destructive/30'}
                    `}
                  >
                    {showBomb && <Bomb className="h-6 w-6 text-white" />}
                    {showGem && <Gem className="h-6 w-6 text-white" />}
                    {showAll && bombs.has(index) && !isRevealed && <Bomb className="h-5 w-5 text-destructive/60" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Mines;
