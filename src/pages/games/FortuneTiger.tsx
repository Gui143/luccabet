import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatEURShort } from '@/lib/formatCurrency';
import Layout from '@/components/Layout';

const SYMBOLS = ['🐯', '🐉', '💰', '🧧', '🎋', '🏮', '💎', '🔔'];
const WINNING_COMBOS = [
  { symbols: ['🐯', '🐯', '🐯'], multiplier: 50 },
  { symbols: ['🐉', '🐉', '🐉'], multiplier: 30 },
  { symbols: ['💰', '💰', '💰'], multiplier: 20 },
  { symbols: ['🧧', '🧧', '🧧'], multiplier: 15 },
  { symbols: ['💎', '💎', '💎'], multiplier: 25 },
  { symbols: ['🔔', '🔔', '🔔'], multiplier: 10 },
];

const FortuneTiger: React.FC = () => {
  const { user, updateBalance } = useAuth();
  const [betAmount, setBetAmount] = useState('1.00');
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState([
    ['🐯', '🐉', '💰'],
    ['🐯', '🐉', '💰'],
    ['🐯', '🐉', '💰'],
  ]);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [tigerAnimation, setTigerAnimation] = useState(false);

  // Tiger idle animation
  useEffect(() => {
    const interval = setInterval(() => {
      setTigerAnimation(prev => !prev);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const getRandomSymbol = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

  const generateRandomReel = () => [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

  const checkWin = (finalReels: string[][]): number => {
    // Check middle row (index 1 of each reel)
    const middleRow = finalReels.map(reel => reel[1]);
    
    for (const combo of WINNING_COMBOS) {
      if (middleRow.every((s, i) => s === combo.symbols[i])) {
        return combo.multiplier;
      }
    }

    // Check for any 3 matching symbols in middle row
    if (middleRow[0] === middleRow[1] && middleRow[1] === middleRow[2]) {
      return 5;
    }

    // Check for 2 matching tigers
    const tigerCount = middleRow.filter(s => s === '🐯').length;
    if (tigerCount === 2) return 2;

    return 0;
  };

  const spin = async () => {
    if (!user) {
      toast.error('Faça login para jogar');
      return;
    }

    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) {
      toast.error('Digite um valor válido');
      return;
    }

    if (bet > user.balance) {
      toast.error('Saldo insuficiente');
      return;
    }

    setSpinning(true);
    setLastWin(null);

    // Deduct bet
    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ balance: user.balance - bet })
      .eq('id', user.id);

    if (balanceError) {
      toast.error('Erro ao processar aposta');
      setSpinning(false);
      return;
    }

    await updateBalance(-bet);

    // Animate reels
    let spinCount = 0;
    const spinInterval = setInterval(() => {
      setReels([generateRandomReel(), generateRandomReel(), generateRandomReel()]);
      spinCount++;
      
      if (spinCount >= 20) {
        clearInterval(spinInterval);
        
        // Generate final result
        const finalReels = [generateRandomReel(), generateRandomReel(), generateRandomReel()];
        
        // 15% chance of win
        if (Math.random() < 0.15) {
          const randomCombo = WINNING_COMBOS[Math.floor(Math.random() * WINNING_COMBOS.length)];
          finalReels[0][1] = randomCombo.symbols[0];
          finalReels[1][1] = randomCombo.symbols[1];
          finalReels[2][1] = randomCombo.symbols[2];
        }

        setReels(finalReels);
        
        const multiplier = checkWin(finalReels);
        
        if (multiplier > 0) {
          const winAmount = bet * multiplier;
          setLastWin(winAmount);
          
          // Credit winnings
          supabase
            .from('profiles')
            .update({ balance: user.balance - bet + winAmount })
            .eq('id', user.id)
            .then(() => {
              updateBalance(winAmount);
              toast.success(`🐯 VITÓRIA! Ganhou € ${winAmount.toFixed(2)}!`);
            });
        }
        
        setSpinning(false);
      }
    }, 80);
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <Link to="/games">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Fortune Tiger</h1>
            <p className="text-muted-foreground text-sm">O tigre da fortuna - 100% simulado</p>
          </div>
        </div>

        {/* Tiger Animation */}
        <div className="flex justify-center">
          <div className={`text-8xl sm:text-9xl transition-transform duration-500 ${tigerAnimation ? 'scale-110' : 'scale-100'}`}>
            🐯
          </div>
        </div>

        {/* Slot Machine */}
        <Card className="bet-card overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="bg-gradient-to-br from-red-900/50 to-yellow-900/50 rounded-xl p-4 border-4 border-yellow-500/50">
              {/* Reels */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
                {reels.map((reel, reelIndex) => (
                  <div 
                    key={reelIndex} 
                    className="bg-gradient-to-b from-red-950 to-red-900 rounded-lg p-2 border-2 border-yellow-600/50"
                  >
                    {reel.map((symbol, symbolIndex) => (
                      <div 
                        key={symbolIndex}
                        className={`text-4xl sm:text-5xl text-center py-2 ${symbolIndex === 1 ? 'bg-yellow-500/20 rounded' : ''} ${spinning ? 'animate-pulse' : ''}`}
                      >
                        {symbol}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Win Line Indicator */}
              <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm mb-4">
                <div className="h-px flex-1 bg-yellow-500/50" />
                <span>LINHA VENCEDORA</span>
                <div className="h-px flex-1 bg-yellow-500/50" />
              </div>

              {/* Last Win Display */}
              {lastWin !== null && (
                <div className="text-center mb-4 p-3 bg-yellow-500/20 rounded-lg border border-yellow-500">
                  <p className="text-sm text-yellow-400">ÚLTIMO GANHO</p>
                  <p className="text-2xl font-bold text-yellow-400">€ {lastWin.toFixed(2)}</p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm">Aposta (€)</Label>
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    min="0.10"
                    step="0.10"
                    disabled={spinning}
                    className="mt-1"
                  />
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className="text-lg font-bold text-primary">{user ? formatEURShort(user.balance) : '€ 0.00'}</p>
                </div>
              </div>

              <Button 
                onClick={spin} 
                disabled={spinning || !user}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-400 hover:to-red-400"
              >
                {spinning ? (
                  <RotateCcw className="h-6 w-6 animate-spin mr-2" />
                ) : (
                  <Play className="h-6 w-6 mr-2" />
                )}
                {spinning ? 'GIRANDO...' : 'GIRAR'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Paytable */}
        <Card className="bet-card">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3 text-center">Tabela de Pagamentos</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {WINNING_COMBOS.map((combo, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span>{combo.symbols.join(' ')}</span>
                  <span className="font-bold text-secondary">{combo.multiplier}x</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default FortuneTiger;