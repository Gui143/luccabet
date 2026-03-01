import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRLShort } from '@/lib/formatCurrency';
import { toast } from 'sonner';

type GamePhase = 'waiting' | 'countdown' | 'flying' | 'crashed';

interface BetSlot {
  amount: string;
  placed: boolean;
  cashoutMultiplier: number | null;
  autoCashout: string;
}

const INITIAL_BET: BetSlot = { amount: '10', placed: false, cashoutMultiplier: null, autoCashout: '' };

const Aviator: React.FC = () => {
  const { user, updateBalance, addBet } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const multiplierRef = useRef(1.00);
  const crashPointRef = useRef(2.00);
  const phaseRef = useRef<GamePhase>('waiting');

  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(2.00);
  const [countdown, setCountdown] = useState(5);
  const [history, setHistory] = useState<number[]>([]);

  // Dual bet slots
  const [bet1, setBet1] = useState<BetSlot>({ ...INITIAL_BET });
  const [bet2, setBet2] = useState<BetSlot>({ ...INITIAL_BET, amount: '20' });

  // Adjusted crash algorithm — harder to reach high multipliers
  const generateCrashPoint = () => {
    const houseEdge = 0.06; // 6% house edge (harder)
    const r = Math.random();
    // Instant crash 8% of the time
    if (r < 0.08) return 1.00;
    const adjusted = (r - 0.08) / 0.92;
    const raw = 1 / (1 - adjusted * (1 - houseEdge));
    // Cap at 100x, with heavy bias toward low multipliers
    return Math.min(100, Math.max(1.01, raw));
  };

  const startCountdown = useCallback(() => {
    phaseRef.current = 'countdown';
    setGamePhase('countdown');
    setCountdown(5);
    setBet1(b => ({ ...b, cashoutMultiplier: null }));
    setBet2(b => ({ ...b, cashoutMultiplier: null }));

    let c = 5;
    const timer = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(timer);
        startFlight();
      }
    }, 1000);
  }, []);

  const startFlight = useCallback(() => {
    const crash = generateCrashPoint();
    crashPointRef.current = crash;
    setCrashPoint(crash);
    multiplierRef.current = 1.00;
    setCurrentMultiplier(1.00);
    phaseRef.current = 'flying';
    setGamePhase('flying');

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      // Speed: multiplier grows exponentially
      const t = elapsed / 1000;
      const mult = Math.pow(Math.E, 0.08 * t); // e^(0.08t) — smooth exponential
      multiplierRef.current = mult;
      setCurrentMultiplier(mult);

      drawCanvas(mult, crash, false);

      if (mult >= crash) {
        handleCrash(crash);
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const handleCrash = useCallback((crash: number) => {
    phaseRef.current = 'crashed';
    setGamePhase('crashed');
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    drawCanvas(crash, crash, true);

    // Resolve bets
    [
      { bet: bet1, setBet: setBet1, label: '1' },
      { bet: bet2, setBet: setBet2, label: '2' },
    ].forEach(({ bet, setBet }) => {
      if (bet.placed && !bet.cashoutMultiplier) {
        const amt = parseFloat(bet.amount);
        if (!isNaN(amt) && amt > 0) {
          addBet({ game: 'Aviator', amount: amt, odds: crash, result: 'loss', profit: -amt });
        }
        setBet(b => ({ ...b, placed: false }));
      }
    });

    toast.error(`💥 Crashed at ${crash.toFixed(2)}x!`);
    setHistory(h => [crash, ...h].slice(0, 20));

    setTimeout(() => {
      phaseRef.current = 'waiting';
      setGamePhase('waiting');
      // Auto-restart if any bet placed
      if (bet1.placed || bet2.placed) {
        startCountdown();
      }
    }, 3000);
  }, [bet1, bet2, addBet, startCountdown]);

  // Auto cashout check
  useEffect(() => {
    if (gamePhase !== 'flying') return;
    const checkAuto = (bet: BetSlot, cashout: (idx: number) => void, idx: number) => {
      if (bet.placed && !bet.cashoutMultiplier && bet.autoCashout) {
        const target = parseFloat(bet.autoCashout);
        if (!isNaN(target) && currentMultiplier >= target) cashout(idx);
      }
    };
    checkAuto(bet1, () => doCashout(1), 1);
    checkAuto(bet2, () => doCashout(2), 2);
  }, [currentMultiplier, gamePhase]);

  const placeBet = (slotIdx: number) => {
    const bet = slotIdx === 1 ? bet1 : bet2;
    const setBet = slotIdx === 1 ? setBet1 : setBet2;
    const amount = parseFloat(bet.amount);
    if (isNaN(amount) || amount <= 0) { toast.error('Valor inválido'); return; }
    if (amount > (user?.balance || 0)) { toast.error('Saldo insuficiente'); return; }

    updateBalance(-amount);
    setBet(b => ({ ...b, placed: true }));
    toast.success(`Aposta ${slotIdx}: ${formatBRLShort(amount)}`);

    if (gamePhase === 'waiting') startCountdown();
  };

  const doCashout = (slotIdx: number) => {
    const bet = slotIdx === 1 ? bet1 : bet2;
    const setBet = slotIdx === 1 ? setBet1 : setBet2;
    if (!bet.placed || bet.cashoutMultiplier) return;

    const mult = multiplierRef.current;
    const amt = parseFloat(bet.amount);
    const win = amt * mult;
    updateBalance(win);
    setBet(b => ({ ...b, cashoutMultiplier: mult, placed: false }));

    addBet({ game: 'Aviator', amount: amt, odds: mult, result: 'win', profit: win - amt });
    toast.success(`✈️ Aposta ${slotIdx}: ${mult.toFixed(2)}x → ${formatBRLShort(win)}`);
  };

  // Canvas drawing
  const drawCanvas = (multiplier: number, crash: number, crashed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(225,6,0,0.12)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const y = (H / 10) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      const x = (W / 10) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // Curve
    const maxMult = Math.max(crash, multiplier, 2);
    const progress = Math.min((multiplier - 1) / (maxMult - 1), 1);
    const points: [number, number][] = [];

    ctx.shadowBlur = 15;
    ctx.shadowColor = crashed ? 'rgba(225,6,0,0.9)' : 'rgba(225,6,0,0.5)';
    ctx.strokeStyle = crashed ? '#e10600' : '#ff2020';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * progress;
      const x = t * W * 0.9 + W * 0.05;
      const y = H - H * 0.1 - (H * 0.75 * Math.pow(t, 1.3));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      points.push([x, y]);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Gradient fill under curve
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0][0], H);
      points.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(points[points.length - 1][0], H);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(225,6,0,0.15)');
      grad.addColorStop(1, 'rgba(225,6,0,0.02)');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Airplane (only while flying)
    if (!crashed && points.length > 1) {
      const [px, py] = points[points.length - 1];
      const [px2, py2] = points.length > 3 ? points[points.length - 4] : points[0];
      const angle = Math.atan2(py2 - py, px - px2);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-angle);

      // Engine trail particles
      for (let i = 0; i < 8; i++) {
        const alpha = 0.6 - i * 0.07;
        const size = 4 - i * 0.4;
        ctx.fillStyle = `rgba(255,${60 + i * 20},0,${Math.max(0, alpha)})`;
        ctx.beginPath();
        ctx.arc(-22 - i * 7 + Math.random() * 3, (Math.random() - 0.5) * 6, Math.max(0.5, size), 0, Math.PI * 2);
        ctx.fill();
      }

      // Fuselage
      ctx.shadowBlur = 25;
      ctx.shadowColor = 'rgba(255,0,0,0.8)';
      ctx.fillStyle = '#e10600';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      ctx.fillStyle = '#cc0500';
      ctx.beginPath();
      ctx.moveTo(-8, 0); ctx.lineTo(-22, 14); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8, 0); ctx.lineTo(-22, -14); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();

      // Tail
      ctx.fillStyle = '#b00400';
      ctx.beginPath();
      ctx.moveTo(-18, 0); ctx.lineTo(-26, 8); ctx.lineTo(-22, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-18, 0); ctx.lineTo(-26, -8); ctx.lineTo(-22, 0); ctx.closePath(); ctx.fill();

      // Cockpit
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.ellipse(16, 0, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Crash explosion
    if (crashed && points.length > 1) {
      const [px, py] = points[points.length - 1];
      for (let i = 0; i < 12; i++) {
        const r = Math.random() * 30 + 5;
        const a = Math.random() * Math.PI * 2;
        ctx.fillStyle = `rgba(255,${Math.floor(Math.random() * 100)},0,${0.7 - i * 0.05})`;
        ctx.beginPath();
        ctx.arc(px + Math.cos(a) * r, py + Math.sin(a) * r, 3 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      drawCanvas(multiplierRef.current, crashPointRef.current, phaseRef.current === 'crashed');
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const renderBetPanel = (slotIdx: number, bet: BetSlot, setBet: React.Dispatch<React.SetStateAction<BetSlot>>) => (
    <Card className="border-border bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Aposta {slotIdx}</span>
          {bet.cashoutMultiplier && (
            <span className="text-xs font-bold text-success bg-success/10 px-2 py-1 rounded">
              ✓ {bet.cashoutMultiplier.toFixed(2)}x
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
              disabled={bet.placed || gamePhase === 'flying'}
              className="bg-input h-9 text-sm"
              min="1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Auto Cashout</label>
            <Input
              type="number"
              value={bet.autoCashout}
              onChange={(e) => setBet(b => ({ ...b, autoCashout: e.target.value }))}
              placeholder="2.00"
              className="bg-input h-9 text-sm"
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
            onClick={() => placeBet(slotIdx)}
            disabled={gamePhase === 'flying'}
            className="w-full glow-primary"
          >
            Apostar
          </Button>
        ) : (
          <Button
            onClick={() => doCashout(slotIdx)}
            disabled={gamePhase !== 'flying' || !!bet.cashoutMultiplier}
            className="w-full bg-success hover:bg-success/90 text-success-foreground font-bold text-lg"
          >
            {bet.cashoutMultiplier
              ? `Retirou ${bet.cashoutMultiplier.toFixed(2)}x`
              : `RETIRAR ${currentMultiplier.toFixed(2)}x`}
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-4">
        <Card className="card-gradient border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-6 w-6 text-primary" />
              Aviator
            </CardTitle>
            <CardDescription>Retire antes do avião cair!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* History */}
            {history.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {history.map((h, i) => (
                  <span
                    key={i}
                    className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${
                      h >= 2 ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    {h.toFixed(2)}x
                  </span>
                ))}
              </div>
            )}

            {/* Canvas */}
            <div className="relative bg-card border border-border rounded-lg overflow-hidden">
              <canvas ref={canvasRef} className="w-full h-[280px] sm:h-[340px]" style={{ imageRendering: 'auto' }} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {gamePhase === 'countdown' && (
                  <div className="text-6xl font-black text-primary animate-pulse drop-shadow-lg">
                    {countdown}
                  </div>
                )}
                {gamePhase === 'flying' && (
                  <div className="text-6xl sm:text-7xl font-black text-gradient drop-shadow-lg">
                    {currentMultiplier.toFixed(2)}x
                  </div>
                )}
                {gamePhase === 'crashed' && (
                  <div className="text-center">
                    <div className="text-5xl sm:text-6xl font-black text-destructive drop-shadow-lg">
                      CRASHED
                    </div>
                    <div className="text-3xl font-bold text-destructive/80 mt-1">
                      {crashPoint.toFixed(2)}x
                    </div>
                  </div>
                )}
                {gamePhase === 'waiting' && (
                  <div className="text-xl text-muted-foreground font-medium animate-pulse">
                    Aguardando apostas...
                  </div>
                )}
              </div>
            </div>

            {/* Dual bet panels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderBetPanel(1, bet1, setBet1)}
              {renderBetPanel(2, bet2, setBet2)}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Aviator;
