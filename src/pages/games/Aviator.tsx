import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Wallet, Maximize2, Heart, Plane, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRLShort } from '@/lib/formatCurrency';
import { shouldPlayerWin } from '@/lib/gameOdds';
import { recordGameOutcome } from '@/lib/gameOutcomes';
import { soundManager } from '@/lib/soundManager';
import ThemeBackground from '@/components/ThemeBackground';

type Phase = 'waiting' | 'flying' | 'crashed';

interface BetSlot {
  amount: string;
  placed: boolean;
  cashedOut: number | null;
  autoEnabled: boolean;
  autoValue: string;
  queued: boolean;
}

interface LiveBet {
  id: number;
  name: string;
  amount: number;
  mult: number | null;
}

const BOT_NAMES = ['Carlos', 'Julia', 'Rafael', 'Marina', 'Pedro', 'Ana', 'Lucas', 'Bia', 'Thiago', 'Camila', 'Diego', 'Fernanda', 'Bruno', 'Letícia', 'Matheus'];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Ponto de crash conforme a % de ganho configurada no painel admin */
const generateCrash = (favor: boolean, minAuto: number | null): number => {
  let cp: number;
  const r = Math.random();
  if (favor) {
    if (r < 0.22) cp = 1.3 + Math.random() * 0.8;
    else if (r < 0.6) cp = 2.0 + Math.random() * 2.2;
    else if (r < 0.88) cp = 4.2 + Math.random() * 4;
    else cp = 8 + Math.random() * 20;
  } else {
    if (r < 0.45) cp = 1.0 + Math.random() * 0.28;
    else if (r < 0.78) cp = 1.3 + Math.random() * 0.6;
    else cp = 1.9 + Math.random() * 1.1;
  }
  cp = Math.round(cp * 100) / 100;

  // Respeita o auto-cashout das apostas ativas
  if (minAuto !== null) {
    if (favor) cp = Math.max(cp, Math.round((minAuto + 0.05) * 100) / 100);
    else cp = Math.min(cp, Math.max(1.0, Math.round((minAuto - 0.05) * 100) / 100));
  }
  return Math.max(1.0, cp);
};

const Aviator: React.FC = () => {
  const { user, updateBalance, addBet } = useAuth();

  const [phase, setPhase] = useState<Phase>('waiting');
  const [countdown, setCountdown] = useState(6);
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState<number[]>([]);
  const [favorited, setFavorited] = useState(false);
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);

  const [slots, setSlots] = useState<BetSlot[]>([
    { amount: '10', placed: false, cashedOut: null, autoEnabled: false, autoValue: '2.00', queued: false },
    { amount: '10', placed: false, cashedOut: null, autoEnabled: false, autoValue: '2.00', queued: false },
  ]);

  const phaseRef = useRef(phase);
  const crashRef = useRef(2);
  const startTimeRef = useRef(0);
  const slotsRef = useRef(slots);
  const rafRef = useRef<number>(0);
  const liveIdRef = useRef(1);
  phaseRef.current = phase;
  slotsRef.current = slots;

  // ---- Desenho do gráfico --------------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const multRef = useRef(1);
  const crashedRef = useRef(false);

  const draw = useCallback((m: number, crashed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, W, H);

    // fundo
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0507');
    bg.addColorStop(1, '#0a0204');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = 'rgba(255,80,80,0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      ctx.beginPath(); ctx.moveTo(0, (H / 10) * i); ctx.lineTo(W, (H / 10) * i); ctx.stroke();
      ctx.beginPath(); ctx.moveTo((W / 10) * i, 0); ctx.lineTo((W / 10) * i, H); ctx.stroke();
    }

    const progress = Math.min(Math.log(m) / Math.log(12), 1);
    const points: [number, number][] = [];
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * progress;
      const x = t * W * 0.85 + W * 0.06;
      const y = H * 0.92 - Math.pow(t, 1.25) * H * 0.78;
      points.push([x, y]);
    }

    if (points.length > 1) {
      // preenchimento sob a curva
      ctx.beginPath();
      ctx.moveTo(points[0][0], H);
      points.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(points[points.length - 1][0], H);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, crashed ? 'rgba(239,68,68,0.18)' : 'rgba(220,38,38,0.22)');
      grad.addColorStop(1, 'rgba(220,38,38,0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // linha
      ctx.shadowBlur = 16;
      ctx.shadowColor = crashed ? 'rgba(239,68,68,0.9)' : 'rgba(248,113,113,0.8)';
      ctx.strokeStyle = crashed ? '#ef4444' : '#f87171';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
      ctx.shadowBlur = 0;

      // avião
      if (!crashed) {
        const [px, py] = points[points.length - 1];
        const [px2, py2] = points.length > 4 ? points[points.length - 5] : points[0];
        const angle = Math.atan2(py2 - py, px - px2);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-angle);
        const scale = Math.max(1, Math.min(W / 420, 1.6));
        ctx.scale(scale, scale);

        // rastro
        for (let i = 0; i < 7; i++) {
          ctx.fillStyle = `rgba(255,${180 - i * 14},60,${0.55 - i * 0.07})`;
          ctx.beginPath();
          ctx.arc(-20 - i * 8 + Math.random() * 3, (Math.random() - 0.5) * 5, Math.max(0.6, 3.4 - i * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
        // corpo
        ctx.shadowBlur = 22;
        ctx.shadowColor = 'rgba(248,113,113,0.9)';
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // asas
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-20, 13); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-20, -13); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill();
        // cauda
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-24, 7); ctx.lineTo(-20, 0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-24, -7); ctx.lineTo(-20, 0); ctx.closePath(); ctx.fill();
        // cockpit
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(14, 0, 4.5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      } else {
        // explosão
        const [px, py] = points[points.length - 1];
        for (let i = 0; i < 14; i++) {
          const rr = Math.random() * 34 + 4;
          const a = Math.random() * Math.PI * 2;
          ctx.fillStyle = `rgba(255,${90 + Math.floor(Math.random() * 120)},40,${0.75 - i * 0.05})`;
          ctx.beginPath();
          ctx.arc(px + Math.cos(a) * rr, py + Math.sin(a) * rr, 2 + Math.random() * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, []);

  useEffect(() => { draw(multRef.current, crashedRef.current); }, [draw]);
  useEffect(() => {
    const onResize = () => draw(multRef.current, crashedRef.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  // ---- Loop do jogo ---------------------------------------------------------
  const settleRound = useCallback(async (crashPoint: number) => {
    // perde quem não retirou
    for (let i = 0; i < 2; i++) {
      const s = slotsRef.current[i];
      if (s.placed && s.cashedOut === null) {
        const amt = parseFloat(s.amount) || 0;
        addBet({ game: 'Aviator', amount: amt, odds: crashPoint, result: 'loss', profit: -amt });
        if (user) await recordGameOutcome({ userId: user.id, gameName: 'Aviator', betAmount: amt, multiplier: 0, winAmount: 0 });
      }
    }
    setSlots(prev => prev.map(s => ({ ...s, placed: false, cashedOut: null, queued: false })));
  }, [addBet, user]);

  const runRound = useCallback(async () => {
    // ---- countdown ----
    setPhase('waiting');
    phaseRef.current = 'waiting';
    setMultiplier(1);
    multRef.current = 1;
    crashedRef.current = false;
    setLiveBets([]);
    draw(1, false);

    // engatilha apostas feitas durante o voo
    setSlots(prev => prev.map(s => s.queued ? { ...s, queued: false } : s));

    for (let t = 6; t > 0; t--) {
      setCountdown(t);
      await sleep(1000);
    }

    // consolida apostas no início do voo
    const current = slotsRef.current.map(s => ({ ...s }));
    const activeAuto = current.filter(s => s.placed && s.autoEnabled).map(s => parseFloat(s.autoValue) || 2).filter(v => v > 1);
    const minAuto = activeAuto.length ? Math.min(...activeAuto) : null;

    const favor = await shouldPlayerWin('aviator');
    const crashPoint = generateCrash(favor, minAuto);
    crashRef.current = crashPoint;

    // debita apostas
    for (let i = 0; i < 2; i++) {
      if (current[i].placed) {
        const amt = parseFloat(current[i].amount) || 0;
        if (amt > 0) await updateBalance(-amt);
      }
    }

    // apostas falsas (bots) para a lista ao vivo
    const bots: LiveBet[] = Array.from({ length: 6 + Math.floor(Math.random() * 6) }, (_, k) => ({
      id: liveIdRef.current++,
      name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
      amount: [5, 10, 20, 50, 100][Math.floor(Math.random() * 5)],
      mult: null,
    }));
    setLiveBets(bots);

    // ---- voo ----
    setPhase('flying');
    phaseRef.current = 'flying';
    startTimeRef.current = performance.now();
    soundManager.playFly();

    await new Promise<void>(resolve => {
      const tick = () => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        const m = Math.exp(0.15 * elapsed);
        multRef.current = m;
        setMultiplier(m);
        draw(m, false);

        // auto cashout
        setSlots(prev => {
          let changed = false;
          const next = prev.map(s => {
            if (s.placed && s.cashedOut === null && s.autoEnabled && m >= (parseFloat(s.autoValue) || 2)) {
              changed = true;
              const at = parseFloat(s.autoValue) || 2;
              const amt = parseFloat(s.amount) || 0;
              const win = amt * at;
              updateBalance(win);
              soundManager.playCashout();
              addBet({ game: 'Aviator', amount: amt, odds: at, result: 'win', profit: win - amt });
              recordGameOutcome({ userId: user?.id, gameName: 'Aviator', betAmount: amt, multiplier: at, winAmount: win });
              return { ...s, cashedOut: at };
            }
            return s;
          });
          return changed ? next : prev;
        });

        // bots sacando
        if (Math.random() < 0.06) {
          setLiveBets(prev => {
            const pending = prev.filter(b => b.mult === null);
            if (!pending.length) return prev;
            const target = pending[Math.floor(Math.random() * pending.length)];
            return prev.map(b => b.id === target.id ? { ...b, mult: Math.round((1.1 + Math.random() * (m - 1.1)) * 100) / 100 } : b);
          });
        }

        if (m >= crashPoint) {
          resolve();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    });

    cancelAnimationFrame(rafRef.current);

    // ---- crash ----
    crashedRef.current = true;
    multRef.current = crashPoint;
    setMultiplier(crashPoint);
    draw(crashPoint, true);
    setPhase('crashed');
    phaseRef.current = 'crashed';
    soundManager.playCrash();
    setHistory(prev => [crashPoint, ...prev].slice(0, 24));

    // bots que não sacaram
    setLiveBets(prev => prev.map(b => (b.mult === null ? { ...b, mult: 0 } : b)));

    await settleRound(crashPoint);
    await sleep(4200);
  }, [draw, settleRound, updateBalance, addBet, user]);

  useEffect(() => {
    let alive = true;
    const loop = async () => {
      while (alive) {
        await runRound();
      }
    };
    loop();
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Ações do jogador ----------------------------------------------------
  const placeBet = async (idx: number) => {
    const s = slots[idx];
    const amt = parseFloat(s.amount) || 0;
    if (amt <= 0) return;
    if (amt > (user?.balance || 0)) return;

    if (phaseRef.current === 'flying') {
      // engatilha para a próxima
      setSlots(prev => prev.map((x, i) => (i === idx ? { ...x, queued: true } : x)));
      return;
    }
    soundManager.playBet();
    setSlots(prev => prev.map((x, i) => (i === idx ? { ...x, placed: true, cashedOut: null, queued: false } : x)));
  };

  const cashOut = async (idx: number) => {
    const s = slotsRef.current[idx];
    if (!s.placed || s.cashedOut !== null) return;
    const at = Math.round(multRef.current * 100) / 100;
    const amt = parseFloat(s.amount) || 0;
    const win = amt * at;
    await updateBalance(win);
    soundManager.playCashout();
    addBet({ game: 'Aviator', amount: amt, odds: at, result: 'win', profit: win - amt });
    if (user) await recordGameOutcome({ userId: user.id, gameName: 'Aviator', betAmount: amt, multiplier: at, winAmount: win });
    setSlots(prev => prev.map((x, i) => (i === idx ? { ...x, cashedOut: at } : x)));
  };

  const cancelBet = (idx: number) => {
    setSlots(prev => prev.map((x, i) => (i === idx ? { ...x, placed: false, queued: false } : x)));
  };

  const updateSlot = (idx: number, patch: Partial<BetSlot>) => {
    setSlots(prev => prev.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  };

  const toggleFullscreen = () => {
    const el = document.getElementById('aviator-canvas-wrap');
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  return (
    <div className="min-h-screen text-white flex flex-col relative bg-[#0a0204]">
      <ThemeBackground />
      <div className="absolute inset-0 -z-[5] bg-[#0a0204]/85" />

      <header className="sticky top-0 z-50 flex items-center justify-between px-3 py-2.5 sm:px-6 border-b border-white/10 bg-[#16050a]/90 backdrop-blur-md">
        <Link to="/games">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Plane className="h-5 w-5 text-red-500" />
          <span className="text-lg sm:text-xl font-black tracking-tight">
            Aviator
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 border border-white/10">
          <Wallet className="h-4 w-4 text-green-400" />
          <span className="text-sm font-bold">{formatBRLShort(user?.balance || 0)}</span>
        </div>
      </header>

      <div className="flex-1 w-full max-w-5xl mx-auto px-2 sm:px-4 pb-4 flex flex-col">
        {/* histórico */}
        <div className="flex gap-1.5 overflow-x-auto py-2 scrollbar-none">
          {history.map((h, i) => (
            <span
              key={i}
              className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                h >= 10 ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : h >= 2 ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-600/20 text-red-300 border border-red-500/30'
              }`}
            >
              {h.toFixed(2)}x
            </span>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          {/* canvas */}
          <div className="flex-1">
            <div id="aviator-canvas-wrap" className="relative rounded-xl overflow-hidden border border-red-900/40 shadow-2xl bg-black">
              <canvas ref={canvasRef} className="w-full h-[300px] sm:h-[380px] lg:h-[440px] block" />

              {/* multiplicador central */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {phase === 'flying' && (
                  <div className="text-center">
                    <div className="text-5xl sm:text-7xl font-black text-white tabular-nums drop-shadow-[0_0_25px_rgba(248,113,113,0.7)]">
                      {multiplier.toFixed(2)}<span className="text-3xl sm:text-5xl">x</span>
                    </div>
                  </div>
                )}
                {phase === 'crashed' && (
                  <div className="text-center">
                    <div className="text-4xl sm:text-6xl font-black text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.8)]">
                      {multiplier.toFixed(2)}x
                    </div>
                    <p className="text-red-400 font-bold mt-1 text-sm sm:text-base">💥 Voou!</p>
                  </div>
                )}
                {phase === 'waiting' && (
                  <div className="text-center">
                    <p className="text-white/70 font-semibold text-sm sm:text-base mb-1">Próxima rodada em</p>
                    <div className="text-5xl sm:text-7xl font-black text-red-400 tabular-nums">{countdown}s</div>
                    <p className="text-white/40 text-xs mt-2">Faça sua aposta</p>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {/* apostas ao vivo */}
            <div className="mt-2 rounded-xl bg-black/50 border border-white/10 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Apostas da rodada</span>
                <span className="text-[10px] text-white/40">{liveBets.filter(b => b.mult !== null && b.mult > 0).length} retiradas</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none max-h-16">
                {liveBets.map(b => (
                  <div key={b.id} className={`shrink-0 rounded-lg px-2 py-1 border text-[10px] font-semibold ${
                    b.mult === null ? 'bg-white/5 border-white/10 text-white/60'
                    : b.mult === 0 ? 'bg-red-950/50 border-red-800/40 text-red-400'
                    : 'bg-emerald-950/50 border-emerald-700/40 text-emerald-300'
                  }`}>
                    <div className="font-bold">{b.name}</div>
                    <div>R$ {b.amount} {b.mult !== null && b.mult > 0 ? `• ${b.mult.toFixed(2)}x` : b.mult === 0 ? '💥' : '...'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* painéis de aposta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 lg:w-[300px]">
            {slots.map((s, idx) => (
              <div key={idx} className="rounded-xl bg-[#1c0a0e] border border-white/10 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/60">Aposta {idx + 1}</span>
                  {s.cashedOut !== null && (
                    <span className="text-[10px] font-black text-emerald-300 bg-emerald-900/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {s.cashedOut.toFixed(2)}x
                    </span>
                  )}
                </div>

                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    value={s.amount}
                    min="1"
                    disabled={s.placed}
                    onChange={e => updateSlot(idx, { amount: e.target.value })}
                    className="bg-black/40 border-white/15 text-white h-10 font-bold text-center"
                  />
                </div>
                <div className="flex gap-1">
                  {[5, 10, 50, 100].map(v => (
                    <Button
                      key={v}
                      variant="outline"
                      size="sm"
                      disabled={s.placed}
                      onClick={() => updateSlot(idx, { amount: String(v) })}
                      className="flex-1 h-7 text-[11px] bg-white/5 border-white/10 text-white hover:bg-white/15"
                    >
                      {v}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-black/30 rounded-lg px-2 py-1.5">
                  <Switch
                    checked={s.autoEnabled}
                    onCheckedChange={v => updateSlot(idx, { autoEnabled: v })}
                    className="scale-75"
                  />
                  <span className="text-[11px] text-white/60">Auto retirar</span>
                  <Input
                    type="number"
                    value={s.autoValue}
                    step="0.1"
                    min="1.1"
                    disabled={!s.autoEnabled}
                    onChange={e => updateSlot(idx, { autoValue: e.target.value })}
                    className="bg-black/40 border-white/15 text-white h-7 text-xs w-16 ml-auto text-center font-bold"
                  />
                  <span className="text-[11px] text-white/60">x</span>
                </div>

                {/* botão de ação */}
                {phase === 'flying' && s.placed && s.cashedOut === null && (
                  <Button onClick={() => cashOut(idx)} className="w-full h-12 font-black text-base bg-gradient-to-b from-amber-400 to-orange-600 text-white animate-pulse rounded-lg">
                    RETIRAR {multiplier.toFixed(2)}x
                  </Button>
                )}
                {phase === 'flying' && s.cashedOut !== null && (
                  <Button disabled className="w-full h-12 font-black text-base bg-emerald-700 text-white rounded-lg">
                    ✓ Retirou {s.cashedOut.toFixed(2)}x
                  </Button>
                )}
                {phase === 'flying' && !s.placed && (
                  <Button
                    onClick={() => placeBet(idx)}
                    variant={s.queued ? 'secondary' : 'default'}
                    className="w-full h-12 font-bold rounded-lg"
                  >
                    {s.queued ? '✓ Aposta engatilhada' : 'Apostar na próxima'}
                  </Button>
                )}
                {phase !== 'flying' && s.placed && (
                  <Button onClick={() => cancelBet(idx)} variant="outline" className="w-full h-12 font-bold rounded-lg bg-white/5 border-red-500/40 text-red-300 hover:bg-red-950/40">
                    Cancelar aposta
                  </Button>
                )}
                {phase !== 'flying' && !s.placed && (
                  <Button
                    onClick={() => placeBet(idx)}
                    className="w-full h-12 font-black text-base bg-gradient-to-b from-emerald-400 to-green-600 text-white rounded-lg hover:brightness-110"
                  >
                    APOSTAR
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 px-1">
          <Button variant="ghost" size="sm" onClick={() => setFavorited(f => !f)} className={`text-xs gap-1.5 ${favorited ? 'text-red-400' : 'text-white/50'}`}>
            <Heart className={`h-4 w-4 ${favorited ? 'fill-current' : ''}`} /> Favorito
          </Button>
          <p className="text-[10px] text-white/30">Retire antes do avião voar!</p>
        </div>
      </div>
    </div>
  );
};

export default Aviator;
