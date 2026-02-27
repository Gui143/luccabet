import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Target, RotateCcw } from 'lucide-react';
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

type Position = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

const POSITIONS: { id: Position; label: string; x: number; y: number }[] = [
  { id: 'top-left', label: 'Superior Esq.', x: 15, y: 20 },
  { id: 'top-center', label: 'Superior Centro', x: 50, y: 15 },
  { id: 'top-right', label: 'Superior Dir.', x: 85, y: 20 },
  { id: 'bottom-left', label: 'Inferior Esq.', x: 20, y: 70 },
  { id: 'bottom-center', label: 'Inferior Centro', x: 50, y: 75 },
  { id: 'bottom-right', label: 'Inferior Dir.', x: 80, y: 70 },
];

const PenaltyBurrows: React.FC = () => {
  const { user, updateBalance } = useAuth();
  const [betAmount, setBetAmount] = useState('1.00');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'kicking' | 'result'>('idle');
  const [goalkeeperPosition, setGoalkeeperPosition] = useState<Position | null>(null);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 85 });
  const [result, setResult] = useState<'goal' | 'saved' | null>(null);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [goalkeeperAnimation, setGoalkeeperAnimation] = useState<'idle' | 'ready' | 'diving'>('idle');
  const animationFrameRef = useRef<number>();
  const [gkVisualPos, setGkVisualPos] = useState({ x: 50, y: 35 });

  // Smooth goalkeeper idle sway
  useEffect(() => {
    if (gameState === 'idle') {
      let startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const swayX = 50 + Math.sin(elapsed / 600) * 3;
        const swayY = 35 + Math.sin(elapsed / 800) * 1.5;
        setGkVisualPos({ x: swayX, y: swayY });
        setGoalkeeperAnimation(Math.sin(elapsed / 600) > 0 ? 'ready' : 'idle');
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    }
  }, [gameState]);

  const getMultiplier = () => {
    if (!selectedPosition) return 1;
    if (selectedPosition.includes('center')) return 1.5;
    return 2;
  };

  const kick = async () => {
    if (!user) { toast.error('Faça login para jogar'); return; }
    if (!selectedPosition) { toast.error('Selecione onde chutar'); return; }

    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) { toast.error('Digite um valor válido'); return; }
    if (bet > user.balance) { toast.error('Saldo insuficiente'); return; }

    setGameState('kicking');
    setResult(null);
    setLastWin(null);

    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ balance: user.balance - bet })
      .eq('id', user.id);

    if (balanceError) { toast.error('Erro ao processar aposta'); setGameState('idle'); return; }
    await updateBalance(-bet);

    // Animate ball to selected position
    const selectedPos = POSITIONS.find(p => p.id === selectedPosition);
    if (selectedPos) setBallPosition({ x: selectedPos.x, y: selectedPos.y });

    // Goalkeeper AI - increased difficulty: 75% chance to pick correct area, then 80% save if in area
    const gkChoices = POSITIONS.map(p => p.id);
    let gkPosition: Position;

    // Smart GK: 75% chance to read the shot direction
    if (Math.random() < 0.75) {
      gkPosition = selectedPosition; // GK reads the shot
    } else {
      gkPosition = gkChoices[Math.floor(Math.random() * gkChoices.length)];
    }

    // Smooth dive animation
    setTimeout(() => {
      setGoalkeeperPosition(gkPosition);
      setGoalkeeperAnimation('diving');
      const targetPos = POSITIONS.find(p => p.id === gkPosition);
      if (targetPos) {
        setGkVisualPos({ x: targetPos.x, y: targetPos.y < 50 ? 20 : 55 });
      }
    }, 200);

    // Determine result after animation
    setTimeout(async () => {
      // If GK is in same position AND passes save check (80%)
      const isSaved = gkPosition === selectedPosition && Math.random() < 0.80;
      
      if (isSaved) {
        setResult('saved');
        toast.error('😱 Goleiro defendeu!');
      } else {
        setResult('goal');
        const multiplier = getMultiplier();
        const winAmount = bet * multiplier;
        setLastWin(winAmount);
        
        await supabase
          .from('profiles')
          .update({ balance: user.balance - bet + winAmount })
          .eq('id', user.id);
        
        await updateBalance(winAmount);
        toast.success(`⚽ GOOOL! Ganhou € ${winAmount.toFixed(2)}!`);
      }
      
      setGameState('result');
    }, 1000);
  };

  const resetGame = () => {
    setGameState('idle');
    setSelectedPosition(null);
    setGoalkeeperPosition(null);
    setBallPosition({ x: 50, y: 85 });
    setResult(null);
    setGoalkeeperAnimation('idle');
    setGkVisualPos({ x: 50, y: 35 });
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
            <h1 className="text-2xl sm:text-3xl font-bold">Penalty Burrows</h1>
            <p className="text-muted-foreground text-sm">Cobrança de pênalti profissional</p>
          </div>
        </div>

        <Card className="bet-card overflow-hidden">
          <CardContent className="p-0">
            <div 
              className="relative bg-gradient-to-b from-green-700 to-green-800 aspect-[4/3] overflow-hidden"
              style={{ perspective: '1000px' }}
            >
              <div className="absolute inset-0">
                {/* Goal Area */}
                <div 
                  className="absolute left-1/2 top-0 -translate-x-1/2 w-3/4 h-1/2 border-4 border-white/80 rounded-b-xl"
                  style={{ transform: 'translateX(-50%) rotateX(20deg)', transformOrigin: 'top center' }}
                >
                  <div className="absolute inset-x-[10%] -top-4 h-20 bg-gradient-to-b from-white/30 to-transparent border-x-4 border-t-4 border-white rounded-t-lg" />
                  <div className="absolute left-[10%] -top-4 w-2 h-24 bg-white rounded shadow-lg" />
                  <div className="absolute right-[10%] -top-4 w-2 h-24 bg-white rounded shadow-lg" />
                  <div className="absolute left-[10%] right-[10%] -top-4 h-2 bg-white rounded shadow-lg" />
                </div>

                {/* Position Buttons */}
                {POSITIONS.map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => gameState === 'idle' && setSelectedPosition(pos.id)}
                    disabled={gameState !== 'idle'}
                    className={`absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all transform -translate-x-1/2 -translate-y-1/2 ${
                      selectedPosition === pos.id 
                        ? 'bg-primary/80 border-4 border-white scale-110 shadow-lg shadow-primary/30' 
                        : 'bg-white/20 border-2 border-white/50 hover:bg-white/40'
                    } ${gameState !== 'idle' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  >
                    <Target className={`w-5 h-5 sm:w-6 sm:h-6 mx-auto ${selectedPosition === pos.id ? 'text-white' : 'text-white/70'}`} />
                  </button>
                ))}

                {/* Goalkeeper */}
                <div 
                  className="absolute w-16 h-20 sm:w-20 sm:h-24"
                  style={{ 
                    left: `${gkVisualPos.x}%`,
                    top: `${gkVisualPos.y}%`,
                    transform: `translateX(-50%) ${goalkeeperAnimation === 'diving' ? 'scale(1.15)' : 'scale(1)'}`,
                    transition: goalkeeperAnimation === 'diving' ? 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
                  }}
                >
                  <div className="relative">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto bg-amber-200 rounded-full border-2 border-amber-300" />
                    <div className="w-12 h-10 sm:w-14 sm:h-12 mx-auto -mt-1 bg-primary rounded-lg border-2 border-primary/80 relative">
                      <span className="absolute inset-0 flex items-center justify-center text-primary-foreground font-bold text-sm">1</span>
                    </div>
                    <div className={`absolute top-8 sm:top-10 left-0 w-3 h-8 sm:w-4 sm:h-10 bg-primary rounded transition-transform duration-300 ${goalkeeperAnimation === 'diving' ? '-rotate-45 -translate-x-2' : ''}`} />
                    <div className={`absolute top-8 sm:top-10 right-0 w-3 h-8 sm:w-4 sm:h-10 bg-primary rounded transition-transform duration-300 ${goalkeeperAnimation === 'diving' ? 'rotate-45 translate-x-2' : ''}`} />
                    <div className={`absolute top-14 sm:top-16 -left-1 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-400 rounded transition-transform duration-300 ${goalkeeperAnimation === 'diving' ? '-translate-x-2' : ''}`} />
                    <div className={`absolute top-14 sm:top-16 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-400 rounded transition-transform duration-300 ${goalkeeperAnimation === 'diving' ? 'translate-x-2' : ''}`} />
                    <div className="w-10 h-4 sm:w-12 sm:h-5 mx-auto bg-primary/70 rounded-b" />
                    <div className="flex justify-center gap-1">
                      <div className="w-3 h-6 sm:w-4 sm:h-8 bg-primary/50 rounded" />
                      <div className="w-3 h-6 sm:w-4 sm:h-8 bg-primary/50 rounded" />
                    </div>
                  </div>
                </div>

                {/* Ball */}
                <div 
                  className="absolute w-8 h-8 sm:w-10 sm:h-10 transition-all duration-500 ease-out"
                  style={{ left: `${ballPosition.x}%`, top: `${ballPosition.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="w-full h-full bg-white rounded-full border-2 border-gray-300 shadow-lg flex items-center justify-center text-xl sm:text-2xl">
                    ⚽
                  </div>
                </div>

                {/* Result Overlay */}
                {result && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`text-4xl sm:text-6xl font-extrabold animate-bounce ${result === 'goal' ? 'text-primary' : 'text-destructive'}`}>
                      {result === 'goal' ? '⚽ GOL!' : '🧤 DEFESA!'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {lastWin !== null && (
                <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/30">
                  <p className="text-sm text-muted-foreground">ÚLTIMO GANHO</p>
                  <p className="text-2xl font-bold text-primary">€ {lastWin.toFixed(2)}</p>
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm">Aposta (€)</Label>
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    min="0.10"
                    step="0.10"
                    disabled={gameState !== 'idle'}
                    className="mt-1"
                  />
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className="text-lg font-bold text-primary">{user ? formatEURShort(user.balance) : '€ 0.00'}</p>
                </div>
              </div>

              {selectedPosition && gameState === 'idle' && (
                <div className="text-center text-sm text-muted-foreground">
                  Multiplicador: <span className="font-bold text-primary">{getMultiplier()}x</span>
                </div>
              )}

              {gameState === 'result' ? (
                <Button onClick={resetGame} className="w-full h-14 text-lg font-bold">
                  <RotateCcw className="h-6 w-6 mr-2" />
                  JOGAR NOVAMENTE
                </Button>
              ) : (
                <Button 
                  onClick={kick} 
                  disabled={gameState !== 'idle' || !selectedPosition || !user}
                  className="w-full h-14 text-lg font-bold"
                >
                  {gameState === 'kicking' ? 'CHUTANDO...' : 'CHUTAR'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bet-card">
          <CardContent className="p-4">
            <h3 className="font-bold mb-2">Como Jogar</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>1. Defina o valor da aposta</li>
              <li>2. Clique onde quer chutar (alvos no gol)</li>
              <li>3. Clique em CHUTAR</li>
              <li>4. Se o goleiro não defender, você ganha!</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">Cantos: 2x | Centro: 1.5x</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PenaltyBurrows;
