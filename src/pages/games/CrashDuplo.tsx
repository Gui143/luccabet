import React, { useState, useEffect, useRef } from 'react';
import { Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type GamePhase = 'waiting' | 'countdown' | 'running' | 'crashed';

interface GameState {
  phase: GamePhase;
  multiplier: number;
  crashPoint: number;
  betPlaced: boolean;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
}

const CrashDuplo: React.FC = () => {
  const { user, updateBalance, addBet } = useAuth();
  
  const [betAmountLeft, setBetAmountLeft] = useState('10');
  const [betAmountRight, setBetAmountRight] = useState('10');
  const [countdown, setCountdown] = useState(5);
  
  const [leftGame, setLeftGame] = useState<GameState>({
    phase: 'waiting',
    multiplier: 1.00,
    crashPoint: 2.00,
    betPlaced: false,
    cashedOut: false,
    cashoutMultiplier: null
  });
  
  const [rightGame, setRightGame] = useState<GameState>({
    phase: 'waiting',
    multiplier: 1.00,
    crashPoint: 2.00,
    betPlaced: false,
    cashedOut: false,
    cashoutMultiplier: null
  });

  const animationRef = useRef<number>();

  // Generate crash point
  const generateCrashPoint = () => {
    const houseEdge = 0.04;
    const randomValue = Math.random() * (1 - houseEdge);
    return Math.max(1.01, 1 / (1 - randomValue));
  };

  // Place bet on left game
  const placeBetLeft = () => {
    const amount = parseFloat(betAmountLeft);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid bet amount');
      return;
    }
    if (amount > (user?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    updateBalance(-amount);
    setLeftGame(prev => ({ ...prev, betPlaced: true }));
    toast.success(`Left bet placed: $${amount}`);
    
    if (leftGame.phase === 'waiting' && rightGame.phase === 'waiting') {
      startGames();
    }
  };

  // Place bet on right game
  const placeBetRight = () => {
    const amount = parseFloat(betAmountRight);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid bet amount');
      return;
    }
    if (amount > (user?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    updateBalance(-amount);
    setRightGame(prev => ({ ...prev, betPlaced: true }));
    toast.success(`Right bet placed: $${amount}`);
    
    if (leftGame.phase === 'waiting' && rightGame.phase === 'waiting') {
      startGames();
    }
  };

  // Place both bets
  const placeBothBets = () => {
    const leftAmount = parseFloat(betAmountLeft);
    const rightAmount = parseFloat(betAmountRight);
    const totalAmount = leftAmount + rightAmount;
    
    if (isNaN(leftAmount) || leftAmount <= 0 || isNaN(rightAmount) || rightAmount <= 0) {
      toast.error('Please enter valid bet amounts');
      return;
    }
    if (totalAmount > (user?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    updateBalance(-totalAmount);
    setLeftGame(prev => ({ ...prev, betPlaced: true }));
    setRightGame(prev => ({ ...prev, betPlaced: true }));
    toast.success(`Both bets placed: $${totalAmount.toFixed(2)}`);
    
    if (leftGame.phase === 'waiting' && rightGame.phase === 'waiting') {
      startGames();
    }
  };

  // Start both games
  const startGames = () => {
    setCountdown(5);
    setLeftGame(prev => ({ ...prev, phase: 'countdown', cashedOut: false, cashoutMultiplier: null }));
    setRightGame(prev => ({ ...prev, phase: 'countdown', cashedOut: false, cashoutMultiplier: null }));
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          runGames();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Run both games simultaneously
  const runGames = () => {
    const leftCrash = generateCrashPoint();
    const rightCrash = generateCrashPoint();
    
    setLeftGame(prev => ({ ...prev, phase: 'running', crashPoint: leftCrash, multiplier: 1.00 }));
    setRightGame(prev => ({ ...prev, phase: 'running', crashPoint: rightCrash, multiplier: 1.00 }));
    
    const startTime = Date.now();
    const duration = 10000;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Update left game
      const leftMultiplier = 1 + (leftCrash - 1) * progress;
      setLeftGame(prev => {
        if (prev.phase !== 'running') return prev;
        if (leftMultiplier >= leftCrash) {
          handleCrash('left', leftCrash);
          return { ...prev, phase: 'crashed', multiplier: leftCrash };
        }
        return { ...prev, multiplier: leftMultiplier };
      });
      
      // Update right game
      const rightMultiplier = 1 + (rightCrash - 1) * progress;
      setRightGame(prev => {
        if (prev.phase !== 'running') return prev;
        if (rightMultiplier >= rightCrash) {
          handleCrash('right', rightCrash);
          return { ...prev, phase: 'crashed', multiplier: rightCrash };
        }
        return { ...prev, multiplier: rightMultiplier };
      });
      
      if (leftMultiplier < leftCrash || rightMultiplier < rightCrash) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(resetGames, 3000);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  // Handle crash
  const handleCrash = (side: 'left' | 'right', crashPoint: number) => {
    const game = side === 'left' ? leftGame : rightGame;
    const betAmount = side === 'left' ? betAmountLeft : betAmountRight;
    
    if (game.betPlaced && !game.cashedOut) {
      addBet({
        game: `Crash Duplo (${side})`,
        amount: parseFloat(betAmount),
        odds: crashPoint,
        result: 'loss',
        profit: -parseFloat(betAmount),
      });
    }
  };

  // Cashout
  const cashout = (side: 'left' | 'right') => {
    const game = side === 'left' ? leftGame : rightGame;
    const betAmount = side === 'left' ? betAmountLeft : betAmountRight;
    const setGame = side === 'left' ? setLeftGame : setRightGame;
    
    if (!game.betPlaced || game.cashedOut || game.phase !== 'running') return;
    
    const winAmount = parseFloat(betAmount) * game.multiplier;
    updateBalance(winAmount);
    
    addBet({
      game: `Crash Duplo (${side})`,
      amount: parseFloat(betAmount),
      odds: game.multiplier,
      result: 'win',
      profit: winAmount - parseFloat(betAmount),
    });
    
    setGame(prev => ({ ...prev, cashedOut: true, cashoutMultiplier: game.multiplier }));
    toast.success(`${side} cashed out at ${game.multiplier.toFixed(2)}x! Won $${winAmount.toFixed(2)}`);
  };

  // Cashout both
  const cashoutBoth = () => {
    cashout('left');
    cashout('right');
  };

  // Reset games
  const resetGames = () => {
    setLeftGame({
      phase: 'waiting',
      multiplier: 1.00,
      crashPoint: 2.00,
      betPlaced: false,
      cashedOut: false,
      cashoutMultiplier: null
    });
    setRightGame({
      phase: 'waiting',
      multiplier: 1.00,
      crashPoint: 2.00,
      betPlaced: false,
      cashedOut: false,
      cashoutMultiplier: null
    });
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const renderGame = (game: GameState, side: 'left' | 'right', betAmount: string, setBetAmount: (v: string) => void, placeBet: () => void) => (
    <Card className="card-gradient border-border flex-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rocket className="h-5 w-5 text-primary" />
          {side === 'left' ? 'Left' : 'Right'} Crash
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Display */}
        <div className="h-32 bg-muted rounded-lg flex items-center justify-center border border-border">
          {game.phase === 'countdown' && (
            <div className="text-4xl font-bold text-primary animate-pulse">
              {countdown}
            </div>
          )}
          {game.phase === 'running' && (
            <div className="text-5xl font-bold text-gradient">
              {game.multiplier.toFixed(2)}x
            </div>
          )}
          {game.phase === 'crashed' && (
            <div className="text-4xl font-bold text-destructive">
              💥 {game.crashPoint.toFixed(2)}x
            </div>
          )}
          {game.phase === 'waiting' && (
            <div className="text-2xl text-muted-foreground">
              Place Bet
            </div>
          )}
        </div>

        {/* Controls */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Bet Amount</label>
          <Input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            disabled={game.betPlaced || game.phase !== 'waiting'}
            className="bg-input"
            min="1"
            step="1"
          />
        </div>

        {!game.betPlaced ? (
          <Button
            onClick={placeBet}
            disabled={game.phase !== 'waiting'}
            className="w-full glow-primary"
          >
            Place Bet
          </Button>
        ) : (
          <Button
            onClick={() => cashout(side)}
            disabled={game.phase !== 'running' || game.cashedOut}
            className="w-full glow-secondary bg-secondary hover:bg-secondary/90"
          >
            {game.cashoutMultiplier 
              ? `Cashed Out ${game.cashoutMultiplier.toFixed(2)}x` 
              : `Cash Out ${game.multiplier.toFixed(2)}x`
            }
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary" />
              Crash Duplo
            </CardTitle>
            <CardDescription>Two simultaneous crash games - double your action!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Button
                onClick={placeBothBets}
                disabled={leftGame.phase !== 'waiting' || rightGame.phase !== 'waiting'}
                className="flex-1 glow-primary"
              >
                Place Both Bets
              </Button>
              <Button
                onClick={cashoutBoth}
                disabled={leftGame.phase !== 'running' && rightGame.phase !== 'running'}
                className="flex-1 glow-secondary bg-secondary hover:bg-secondary/90"
              >
                Cash Out Both
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-6 flex-col md:flex-row">
          {renderGame(leftGame, 'left', betAmountLeft, setBetAmountLeft, placeBetLeft)}
          {renderGame(rightGame, 'right', betAmountRight, setBetAmountRight, placeBetRight)}
        </div>
      </div>
    </Layout>
  );
};

export default CrashDuplo;
