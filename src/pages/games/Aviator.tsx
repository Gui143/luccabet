import React, { useState, useEffect, useRef } from 'react';
import { Plane, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRLShort } from '@/lib/formatCurrency';
import { toast } from 'sonner';

type GamePhase = 'waiting' | 'countdown' | 'flying' | 'crashed';

const Aviator: React.FC = () => {
  const { user, updateBalance, addBet } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  const [betAmount, setBetAmount] = useState('10');
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(2.00);
  const [countdown, setCountdown] = useState(5);
  const [betPlaced, setBetPlaced] = useState(false);
  const [cashoutMultiplier, setCashoutMultiplier] = useState<number | null>(null);
  const [autoBet, setAutoBet] = useState(false);
  const [autoCashout, setAutoCashout] = useState('');
  
  // Generate crash point with house edge
  const generateCrashPoint = () => {
    const houseEdge = 0.04; // 4% house edge
    const randomValue = Math.random() * (1 - houseEdge);
    return Math.max(1.01, 1 / (1 - randomValue));
  };

  // Start countdown
  const startCountdown = () => {
    setGamePhase('countdown');
    setCountdown(5);
    setCashoutMultiplier(null);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          startFlight();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start flight phase
  const startFlight = () => {
    setGamePhase('flying');
    const crash = generateCrashPoint();
    setCrashPoint(crash);
    setCurrentMultiplier(1.00);
    
    const startTime = Date.now();
    const duration = Math.min(5000, crash * 2000); // Faster: 2-5 seconds max
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Exponential growth curve
      const multiplier = 1 + (crash - 1) * progress;
      setCurrentMultiplier(multiplier);
      
      // Draw canvas
      drawCanvas(multiplier, crash);
      
      // Check auto cashout
      if (betPlaced && autoCashout && !cashoutMultiplier) {
        const autoCashoutValue = parseFloat(autoCashout);
        if (multiplier >= autoCashoutValue) {
          handleCashout();
        }
      }
      
      // Check if crashed
      if (multiplier >= crash) {
        handleCrash();
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  // Handle crash
  const handleCrash = () => {
    setGamePhase('crashed');
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Record loss if bet was placed and not cashed out
    if (betPlaced && !cashoutMultiplier) {
      addBet({
        game: 'Aviator',
        amount: parseFloat(betAmount),
        odds: crashPoint,
        result: 'loss',
        profit: -parseFloat(betAmount),
      });
      toast.error(`💥 Crashed at ${crashPoint.toFixed(2)}x!`);
    }
    
    setBetPlaced(false);
    
    // Auto restart if auto bet enabled
    setTimeout(() => {
      if (autoBet) {
        startCountdown();
      } else {
        setGamePhase('waiting');
      }
    }, 3000);
  };

  // Place bet
  const placeBet = () => {
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
    setBetPlaced(true);
    toast.success(`Bet placed: ${formatBRLShort(amount)}`);
    
    if (gamePhase === 'waiting') {
      startCountdown();
    }
  };

  // Handle cashout
  const handleCashout = () => {
    if (!betPlaced || cashoutMultiplier) return;
    
    setCashoutMultiplier(currentMultiplier);
    const winAmount = parseFloat(betAmount) * currentMultiplier;
    updateBalance(winAmount);
    
    addBet({
      game: 'Aviator',
      amount: parseFloat(betAmount),
      odds: currentMultiplier,
      result: 'win',
      profit: winAmount - parseFloat(betAmount),
    });
    
    toast.success(`✈️ Cashed out at ${currentMultiplier.toFixed(2)}x! Won ${formatBRLShort(winAmount)}`);
    setBetPlaced(false);
  };

  // Draw canvas with improved airplane
  const drawCanvas = (multiplier: number, crash: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid with red tint
    ctx.strokeStyle = 'rgba(225, 6, 0, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const y = (height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw curve with glow
    const progress = Math.min(multiplier - 1, crash - 1) / (crash - 1);
    
    // Glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = gamePhase === 'crashed' ? 'rgba(225, 6, 0, 0.8)' : 'rgba(225, 6, 0, 0.6)';
    
    ctx.strokeStyle = gamePhase === 'crashed' ? '#e10600' : '#ff0000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    
    for (let i = 0; i <= progress * 100; i++) {
      const x = (width / 100) * i;
      const t = i / 100;
      const y = height - (height * 0.8 * Math.pow(t, 1.5));
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Draw airplane
    if (gamePhase === 'flying') {
      const planeX = (width * progress);
      const planeY = height - (height * 0.8 * Math.pow(progress, 1.5));
      
      // Airplane shadow/glow
      ctx.shadowBlur = 30;
      ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
      
      // Draw airplane body (simplified)
      ctx.save();
      ctx.translate(planeX, planeY);
      ctx.rotate(-Math.PI / 6); // Tilt upward
      
      // Fuselage
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Wings
      ctx.fillStyle = '#e10600';
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-25, 10);
      ctx.lineTo(-15, 0);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-25, -10);
      ctx.lineTo(-15, 0);
      ctx.closePath();
      ctx.fill();
      
      // Nose
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(15, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Particles trail
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(255, 0, 0, ${0.5 - i * 0.1})`;
        ctx.beginPath();
        ctx.arc(-20 - i * 5, 0, 3 - i * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
    
    ctx.shadowBlur = 0;
  };

  // Initial canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const updateSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drawCanvas(currentMultiplier, crashPoint);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-6 w-6 text-primary" />
              Aviator
            </CardTitle>
            <CardDescription>Watch the plane fly and cash out before it crashes!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Canvas */}
            <div className="relative bg-card border border-border rounded-lg overflow-hidden">
              <canvas ref={canvasRef} className="w-full h-[300px]" />
              
              {/* Multiplier overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {gamePhase === 'countdown' && (
                  <div className="text-6xl font-bold text-primary animate-pulse">
                    {countdown}
                  </div>
                )}
                {gamePhase === 'flying' && (
                  <div className="text-7xl font-bold text-gradient">
                    {currentMultiplier.toFixed(2)}x
                  </div>
                )}
                {gamePhase === 'crashed' && (
                  <div className="text-6xl font-bold text-destructive">
                    CRASHED {crashPoint.toFixed(2)}x
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Bet Amount</label>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={betPlaced || gamePhase === 'flying'}
                  className="bg-input"
                  min="1"
                  step="1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Auto Cashout (optional)</label>
                <Input
                  type="number"
                  value={autoCashout}
                  onChange={(e) => setAutoCashout(e.target.value)}
                  placeholder="e.g., 2.00"
                  className="bg-input"
                  min="1.01"
                  step="0.01"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => setAutoBet(!autoBet)}
                  variant={autoBet ? "default" : "outline"}
                  className="w-full"
                >
                  {autoBet ? 'Auto Bet: ON' : 'Auto Bet: OFF'}
                </Button>
              </div>
            </div>

            <div className="flex gap-4">
              {!betPlaced ? (
                <Button
                  onClick={placeBet}
                  disabled={gamePhase === 'flying'}
                  className="glow-primary flex-1"
                >
                  Place Bet
                </Button>
              ) : (
                <Button
                  onClick={handleCashout}
                  disabled={gamePhase !== 'flying' || !!cashoutMultiplier}
                  className="glow-secondary bg-secondary hover:bg-secondary/90 flex-1"
                >
                  {cashoutMultiplier 
                    ? `Cashed Out ${cashoutMultiplier.toFixed(2)}x` 
                    : `Cash Out ${currentMultiplier.toFixed(2)}x`
                  }
                </Button>
              )}
            </div>

            {/* Quick bet presets */}
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground">Quick Bet:</span>
              {[10, 25, 50, 100].map(amount => (
                <Button
                        key={amount}
                        onClick={() => setBetAmount(amount.toString())}
                        variant="outline"
                        size="sm"
                        disabled={betPlaced || gamePhase === 'flying'}
                      >
                        R$ {amount}
                      </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Aviator;
