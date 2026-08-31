import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Wallet, Maximize2, Heart, Plane, Zap, Users, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useAviator } from '@/hooks/useAviator';
import { formatBRLShort } from '@/lib/formatCurrency';
import { soundManager } from '@/lib/soundManager';
import ThemeBackground from '@/components/ThemeBackground';

type Phase = 'waiting' | 'flying' | 'crashed';

const GROWTH = 0.15; // precisa ser igual ao do servidor (interpolação do gráfico)

/**
 * Aviator — 100% dos jogadores são reais (WebSocket).
 * Nenhum bot é criado: a lista de apostas mostra só quem está conectado.
 */
const Aviator: React.FC = () => {
  const { user, authMode } = useAuth();
  const { mode, status, snapshot, myBet, bet, cancel, cashout } = useAviator();

  const [favorited, setFavorited] = useState(false);
  const [amount, setAmount] = useState('10');
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoValue, setAutoValue] = useState('2.00');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayRef = useRef(1); // multiplicador interpolado (suaviza os 10Hz do servidor)
  const [display, setDisplay] = useState(1);
  const lastServerRef = useRef({ mult: 1, at: 0, phase: 'waiting' as Phase, crash: null as number | null });

  const phase: Phase = snapshot?.phase ?? 'waiting';
  const countdown = snapshot?.countdown ?? 0;

  // ------------------------------------------------------------ sincroniza
  useEffect(() => {
    if (!snapshot) return;
    lastServerRef.current = {
      mult: snapshot.multiplier,
      at: Date.now(),
      phase: snapshot.phase,
      crash: snapshot.crashPoint,
    };
    if (snapshot.phase !== 'flying') setDisplay(snapshot.multiplier);
  }, [snapshot]);

  const toggleFullscreen = () => {
    const el = document.getElementById('aviator-canvas-wrap');
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  // ----------------------------------------------------------- interpolação
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = lastServerRef.current;
      if (s.phase === 'flying') {
        const predicted = s.mult * Math.exp((GROWTH * (Date.now() - s.at)) / 1000);
        displayRef.current = predicted;
        setDisplay(predicted);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // --------------------------------------------------------------- desenho
  const draw = useCallback((m: number, crashed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (!W || !H) return;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0507');
    bg.addColorStop(1, '#0a0204');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,80,80,0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (H / 10) * i);
      ctx.lineTo(W, (H / 10) * i);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((W / 10) * i, 0);
      ctx.lineTo((W / 10) * i, H);
      ctx.stroke();
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

      ctx.shadowBlur = 16;
      ctx.shadowColor = crashed ? 'rgba(239,68,68,0.9)' : 'rgba(248,113,113,0.8)';
      ctx.strokeStyle = crashed ? '#ef4444' : '#f87171';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (!crashed) {
        const [px, py] = points[points.length - 1];
        const [px2, py2] = points.length > 4 ? points[points.length - 5] : points[0];
        const angle = Math.atan2(py2 - py, px - px2);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-angle);
        const scale = Math.max(1, Math.min(W / 420, 1.6));
        ctx.scale(scale, scale);

        for (let i = 0; i < 7; i++) {
          ctx.fillStyle = `rgba(255,${180 - i * 14},60,${0.55 - i * 0.07})`;
          ctx.beginPath();
          ctx.arc(-20 - i * 8 + Math.random() * 3, (Math.random() - 0.5) * 5, Math.max(0.6, 3.4 - i * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 22;
        ctx.shadowColor = 'rgba(248,113,113,0.9)';
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-20, 13);
        ctx.lineTo(-12, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-20, -13);
        ctx.lineTo(-12, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(-24, 7);
        ctx.lineTo(-20, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(-24, -7);
        ctx.lineTo(-20, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(14, 0, 4.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      } else {
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

  useEffect(() => {
    draw(display, phase === 'crashed');
  }, [display, phase, draw]);

  useEffect(() => {
    const onResize = () => draw(display, phase === 'crashed');
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw, display, phase]);

  // ------------------------------------------------------------------ ações
  const placeBet = () => {
    const amt = Number(amount);
    if (!amt || amt < 1) return;
    bet(amt, autoEnabled ? Number(autoValue) : null);
  };

  const bets = snapshot?.bets ?? [];
  const history = snapshot?.history ?? [];

  return (
    <div className="min-h-screen flex flex-col text-white">
      <ThemeBackground />

      <header className="relative z-10 flex items-center justify-between px-2 sm:px-4 py-2 border-b border-white/10 bg-[#16050a]/90 backdrop-blur-md">
        <Link to="/games">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Plane className="h-5 w-5 text-red-500" />
          <span className="text-lg sm:text-xl font-black tracking-tight">Aviator</span>
          <span
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
              status === 'open' ? 'border-emerald-700/50 text-emerald-300' : 'border-amber-700/50 text-amber-300'
            }`}
          >
            {status === 'open' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {mode === 'supabase' ? 'Lovable Cloud' : mode === 'local' ? 'Servidor local' : 'Treino'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 border border-white/10">
          <Wallet className="h-4 w-4 text-green-400" />
          <span className="text-sm font-bold tabular-nums">{formatBRLShort(user?.balance ?? 0)}</span>
        </div>
      </header>

      <div className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-2 sm:px-4 pb-4 flex flex-col">
        {/* histórico de crashes */}
        <div className="flex gap-1.5 overflow-x-auto py-2 scrollbar-none">
          {history.map((h, i) => (
            <span
              key={i}
              className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                h >= 10
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : h >= 2
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
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

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {phase === 'flying' && (
                  <div className="text-5xl sm:text-7xl font-black text-white tabular-nums drop-shadow-[0_0_25px_rgba(248,113,113,0.7)]">
                    {Math.max(1, display).toFixed(2)}
                    <span className="text-3xl sm:text-5xl">x</span>
                  </div>
                )}
                {phase === 'crashed' && (
                  <div className="text-center">
                    <div className="text-4xl sm:text-6xl font-black text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.8)]">
                      {(snapshot?.crashPoint ?? 1).toFixed(2)}x
                    </div>
                    <p className="text-red-400 font-bold mt-1 text-sm sm:text-base">Voou!</p>
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

            {/* apostas ao vivo — somente jogadores reais */}
            <div className="mt-2 rounded-xl bg-black/50 border border-white/10 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3" /> Apostas da rodada
                </span>
                <span className="text-[10px] text-white/40">
                  {snapshot?.totals.players ?? 0} jogadores • {snapshot?.totals.cashedOut ?? 0} retiradas
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none min-h-[42px]">
                {bets.length === 0 ? (
                  <span className="text-[11px] text-white/30 self-center">
                    Nenhuma aposta ainda — só aparecem jogadores reais (sem bots).
                  </span>
                ) : (
                  bets.map((b, i) => (
                    <div
                      key={i}
                      className={`shrink-0 rounded-lg px-2 py-1 border text-[10px] font-semibold ${
                        b.cashedOutAt === null
                          ? 'bg-white/5 border-white/10 text-white/60'
                          : 'bg-emerald-950/50 border-emerald-700/40 text-emerald-300'
                      } ${b.you ? 'ring-1 ring-sky-400' : ''}`}
                    >
                      <div className="font-bold">
                        {b.name}
                        {b.you ? ' (você)' : ''}
                      </div>
                      <div className="tabular-nums">
                        {formatBRLShort(b.amount)}{' '}
                        {b.cashedOutAt !== null ? `• ${b.cashedOutAt.toFixed(2)}x` : '• na moita…'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* painel de aposta */}
          <div className="lg:w-[300px] rounded-xl bg-[#1c0a0e] border border-white/10 p-3 space-y-2.5 self-start w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/60">Sua aposta</span>
              {myBet?.cashedOutAt != null && (
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-900/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {myBet.cashedOutAt.toFixed(2)}x
                </span>
              )}
            </div>

            <Input
              type="number"
              value={amount}
              min="1"
              disabled={!!myBet && myBet.cashedOutAt === null}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-black/40 border-white/15 text-white h-10 font-bold text-center"
            />
            <div className="flex gap-1">
              {[5, 10, 50, 100].map((v) => (
                <Button
                  key={v}
                  variant="outline"
                  size="sm"
                  disabled={!!myBet && myBet.cashedOutAt === null}
                  onClick={() => setAmount(String(v))}
                  className="flex-1 h-7 text-[11px] bg-white/5 border-white/10 text-white hover:bg-white/15"
                >
                  {v}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-black/30 rounded-lg px-2 py-1.5">
              <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} className="scale-75" />
              <span className="text-[11px] text-white/60">Auto retirar</span>
              <Input
                type="number"
                value={autoValue}
                step="0.1"
                min="1.1"
                disabled={!autoEnabled}
                onChange={(e) => setAutoValue(e.target.value)}
                className="bg-black/40 border-white/15 text-white h-7 text-xs w-16 ml-auto text-center font-bold"
              />
              <span className="text-[11px] text-white/60">x</span>
            </div>

            {phase === 'flying' && myBet && myBet.cashedOutAt === null && (
              <Button
                onClick={cashout}
                className="w-full h-12 font-black text-base bg-gradient-to-b from-amber-400 to-orange-600 text-white animate-pulse rounded-lg"
              >
                RETIRAR {Math.max(1, display).toFixed(2)}x
              </Button>
            )}
            {phase === 'flying' && myBet?.cashedOutAt != null && (
              <Button disabled className="w-full h-12 font-black text-base bg-emerald-700 text-white rounded-lg">
                Retirou {myBet.cashedOutAt.toFixed(2)}x
              </Button>
            )}
            {phase === 'flying' && !myBet && (
              <Button disabled className="w-full h-12 font-black text-base bg-white/10 text-white/50 rounded-lg">
                Rodada em curso
              </Button>
            )}
            {phase === 'waiting' && myBet && (
              <Button
                onClick={cancel}
                variant="outline"
                className="w-full h-12 font-bold rounded-lg bg-white/5 border-red-500/40 text-red-300 hover:bg-red-950/40"
              >
                Cancelar aposta ({formatBRLShort(myBet.amount)})
              </Button>
            )}
            {phase === 'waiting' && !myBet && (
              <Button
                onClick={placeBet}
                className="w-full h-12 font-black text-base bg-gradient-to-b from-emerald-400 to-green-600 text-white rounded-lg hover:brightness-110"
              >
                APOSTAR {formatBRLShort(Number(amount) || 0)}
              </Button>
            )}
            {phase === 'crashed' && (
              <Button disabled className="w-full h-12 font-black text-base bg-white/10 text-white/60 rounded-lg">
                {myBet?.cashedOutAt == null && myBet ? 'Você perdeu esta rodada' : 'Aguarde a próxima rodada'}
              </Button>
            )}

            <p className="text-[10px] text-white/30 text-center">
              {authMode === 'supabase'
                ? 'Rodada gerada no servidor (Lovable Cloud).'
                : 'Rodada gerada no servidor de jogos do projeto.'}
              {snapshot?.serverHash ? ` Hash: ${snapshot.serverHash.slice(0, 10)}…` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 px-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFavorited((f) => !f)}
            className={`text-xs gap-1.5 ${favorited ? 'text-red-400' : 'text-white/50'}`}
          >
            <Heart className={`h-4 w-4 ${favorited ? 'fill-current' : ''}`} /> Favorito
          </Button>
          <Button variant="ghost" size="sm" onClick={() => soundManager.toggle()} className="text-xs text-white/50">
            Som
          </Button>
          <p className="text-[10px] text-white/30">Retire antes do avião voar!</p>
        </div>
      </div>
    </div>
  );
};

export default Aviator;
