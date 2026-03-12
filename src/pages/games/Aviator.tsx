import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plane } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRLShort } from '@/lib/formatCurrency';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import AviatorCanvas, { AviatorCanvasHandle } from '@/components/aviator/AviatorCanvas';
import AviatorBetPanel from '@/components/aviator/AviatorBetPanel';
import AviatorHistory from '@/components/aviator/AviatorHistory';

type GamePhase = 'waiting' | 'countdown' | 'flying' | 'crashed';

interface BetSlot {
  amount: string;
  placed: boolean;
  cashoutMultiplier: number | null;
  autoCashout: string;
  autoCashoutEnabled: boolean;
}

const INITIAL_BET: BetSlot = { amount: '10', placed: false, cashoutMultiplier: null, autoCashout: '', autoCashoutEnabled: false };

// Exponential growth: mult = e^(0.08*t)
// This matches the server-side formula exactly
const GROWTH_RATE = 0.08;

const Aviator: React.FC = () => {
  const { user, updateBalance, addBet } = useAuth();
  const canvasHandle = useRef<AviatorCanvasHandle>(null);
  const animationRef = useRef<number>();
  const multiplierRef = useRef(1.00);
  const crashPointRef = useRef(2.00);
  const phaseRef = useRef<GamePhase>('waiting');
  const hasCrashedRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval>>();
  const tickIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const flightStartRef = useRef<number>(0);

  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(2.00);
  const [countdown, setCountdown] = useState(5);
  const [history, setHistory] = useState<number[]>([]);
  const [bet1, setBet1] = useState<BetSlot>({ ...INITIAL_BET });
  const [bet2, setBet2] = useState<BetSlot>({ ...INITIAL_BET, amount: '20' });

  const bet1Ref = useRef(bet1);
  const bet2Ref = useRef(bet2);
  useEffect(() => { bet1Ref.current = bet1; }, [bet1]);
  useEffect(() => { bet2Ref.current = bet2; }, [bet2]);

  const callController = async (action: string) => {
    const { data, error } = await supabase.functions.invoke('aviator-controller', {
      body: { action }
    });
    if (error) throw error;
    return data;
  };

  const startLocalCountdown = useCallback(() => {
    if (phaseRef.current === 'countdown') return;
    phaseRef.current = 'countdown';
    setGamePhase('countdown');
    setCountdown(5);
    setBet1(b => ({ ...b, cashoutMultiplier: null }));
    setBet2(b => ({ ...b, cashoutMultiplier: null }));

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    let c = 5;
    countdownTimerRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) clearInterval(countdownTimerRef.current!);
    }, 1000);
  }, []);

  const startLocalAnimation = useCallback((crashPt: number, serverStartedAt: string) => {
    if (phaseRef.current === 'flying') return;
    const serverStart = new Date(serverStartedAt).getTime();
    flightStartRef.current = serverStart;
    crashPointRef.current = crashPt;
    multiplierRef.current = 1.00;
    setCurrentMultiplier(1.00);
    setCrashPoint(crashPt);
    phaseRef.current = 'flying';
    setGamePhase('flying');
    hasCrashedRef.current = false;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    // Validation: log timing info for debugging
    const expectedCrashTime = (Math.log(crashPt) / GROWTH_RATE) * 1000;
    console.log(`[Aviator] Flight started. Crash point: ${crashPt}x, Expected duration: ${(expectedCrashTime/1000).toFixed(1)}s`);

    let lastFrameTime = performance.now();
    let frameCount = 0;

    const animate = (now: number) => {
      if (hasCrashedRef.current) return;
      
      // FPS monitoring (every 60 frames)
      frameCount++;
      if (frameCount % 60 === 0) {
        const fps = 60000 / (now - lastFrameTime);
        lastFrameTime = now;
        if (fps < 30) console.warn(`[Aviator] Low FPS: ${fps.toFixed(0)}`);
      }

      const elapsed = Date.now() - serverStart;
      const t = elapsed / 1000;
      const mult = Math.exp(GROWTH_RATE * t);
      
      multiplierRef.current = mult;
      // Throttle React state updates to ~20fps to avoid render bottleneck
      if (frameCount % 3 === 0) {
        setCurrentMultiplier(mult);
      }
      canvasHandle.current?.draw(mult, crashPt, false);

      if (mult >= crashPt) {
        console.log(`[Aviator] Client-side crash at ${mult.toFixed(2)}x after ${(elapsed/1000).toFixed(1)}s`);
        handleLocalCrash(crashPt);
        return;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const recordWin = async (amount: number, betAmount: number, multiplier: number) => {
    if (!user) return;
    try {
      await supabase.from('game_wins').insert({
        user_id: user.id,
        game_name: 'Aviator',
        bet_amount: betAmount,
        multiplier,
        win_amount: amount,
      });

      if (multiplier >= 10) {
        await supabase.from('chat_messages').insert({
          user_id: user.id,
          message: `🎉 acabou de ganhar ${formatBRLShort(amount)} no ${multiplier.toFixed(1)}x! ✈️`,
        });
      }
    } catch (e) {
      console.error('Failed to record win', e);
    }
  };

  const handleLocalCrash = useCallback((crash: number) => {
    if (hasCrashedRef.current) return;
    hasCrashedRef.current = true;
    phaseRef.current = 'crashed';
    setGamePhase('crashed');
    setCurrentMultiplier(crash);
    setCrashPoint(crash);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    canvasHandle.current?.draw(crash, crash, true);

    [
      { bet: bet1Ref.current, setBet: setBet1 },
      { bet: bet2Ref.current, setBet: setBet2 },
    ].forEach(({ bet, setBet }) => {
      if (bet.placed && !bet.cashoutMultiplier) {
        const amt = parseFloat(bet.amount);
        if (!isNaN(amt) && amt > 0) {
          addBet({ game: 'Aviator', amount: amt, odds: crash, result: 'loss', profit: -amt });
        }
        setBet(b => ({ ...b, placed: false }));
      }
    });

    toast.error(`💥 Crashed em ${crash.toFixed(2)}x!`);
    setHistory(h => [crash, ...h].slice(0, 20));

    setTimeout(() => {
      phaseRef.current = 'waiting';
      setGamePhase('waiting');
    }, 3000);
  }, [addBet]);

  // Server tick + realtime sync
  useEffect(() => {
    callController('get_or_create_round').then(data => {
      if (!data?.round) return;
      const round = data.round;
      if (round.status === 'flying' && round.started_at) {
        startLocalAnimation(Number(round.crash_point), round.started_at);
      } else if (round.status === 'countdown') {
        startLocalCountdown();
      }
    }).catch(console.error);

    tickIntervalRef.current = setInterval(() => {
      callController('tick').catch(console.error);
    }, 2000);

    supabase
      .from('aviator_rounds')
      .select('crash_point')
      .eq('status', 'crashed')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setHistory(data.map(r => Number(r.crash_point)));
      });

    const channel = supabase
      .channel('aviator-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aviator_rounds' },
        (payload) => {
          const round = payload.new as any;
          if (!round?.status) return;

          if (round.status === 'waiting' && phaseRef.current !== 'waiting' && phaseRef.current !== 'crashed') {
            phaseRef.current = 'waiting';
            setGamePhase('waiting');
            setBet1(b => ({ ...b, cashoutMultiplier: null }));
            setBet2(b => ({ ...b, cashoutMultiplier: null }));
          }

          if (round.status === 'countdown' && phaseRef.current !== 'countdown' && phaseRef.current !== 'flying') {
            startLocalCountdown();
          }

          if (round.status === 'flying' && round.started_at && phaseRef.current !== 'flying') {
            startLocalAnimation(Number(round.crash_point), round.started_at);
          }

          if (round.status === 'crashed' && phaseRef.current !== 'crashed') {
            handleLocalCrash(Number(round.crash_point));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, []);

  // Auto cashout
  useEffect(() => {
    if (gamePhase !== 'flying') return;
    [
      { bet: bet1, setBet: setBet1, idx: 1 },
      { bet: bet2, setBet: setBet2, idx: 2 },
    ].forEach(({ bet, idx }) => {
      if (bet.placed && !bet.cashoutMultiplier && bet.autoCashoutEnabled && bet.autoCashout) {
        const target = parseFloat(bet.autoCashout);
        if (!isNaN(target) && currentMultiplier >= target) doCashout(idx);
      }
    });
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

    recordWin(win, amt, mult);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-4">
        <Card className="card-gradient border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-6 w-6 text-primary" />
              Aviator
              <span className="text-xs font-normal text-muted-foreground ml-2">🔴 LIVE</span>
            </CardTitle>
            <CardDescription>Retire antes do avião cair! Sincronizado em tempo real.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AviatorHistory history={history} />

            <div className="relative bg-card border border-border rounded-lg overflow-visible">
              <AviatorCanvas ref={canvasHandle} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {gamePhase === 'countdown' && (
                  <div className="text-5xl sm:text-6xl font-black text-accent animate-pulse drop-shadow-lg">{countdown}</div>
                )}
                {gamePhase === 'flying' && (
                  <div className="text-5xl sm:text-7xl font-black text-gradient drop-shadow-lg">{currentMultiplier.toFixed(2)}x</div>
                )}
                {gamePhase === 'crashed' && (
                  <div className="text-center">
                    <div className="text-4xl sm:text-6xl font-black text-destructive drop-shadow-lg">CRASHED</div>
                    <div className="text-2xl sm:text-3xl font-bold text-destructive/80 mt-1">{crashPoint.toFixed(2)}x</div>
                  </div>
                )}
                {gamePhase === 'waiting' && (
                  <div className="text-lg sm:text-xl text-muted-foreground font-medium animate-pulse">Aguardando próxima rodada...</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AviatorBetPanel slotIdx={1} bet={bet1} setBet={setBet1} gamePhase={gamePhase} currentMultiplier={currentMultiplier} onPlaceBet={placeBet} onCashout={doCashout} />
              <AviatorBetPanel slotIdx={2} bet={bet2} setBet={setBet2} gamePhase={gamePhase} currentMultiplier={currentMultiplier} onPlaceBet={placeBet} onCashout={doCashout} />
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Aviator;
