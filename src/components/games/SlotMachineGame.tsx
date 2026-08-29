import React, { useState, useRef, useCallback } from 'react';
import {
  ArrowLeft, Wallet, Maximize2, Heart, Sparkles, Zap,
  Banana, Grape, Apple, Citrus, Candy, Cookie, Gift, Crown, Hourglass,
  Gem, Bomb, Heart as HeartIcon, Coins, Trophy, Lollipop,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRLShort } from '@/lib/formatCurrency';
import { shouldPlayerWin } from '@/lib/gameOdds';
import { recordGameOutcome } from '@/lib/gameOutcomes';
import { soundManager } from '@/lib/soundManager';
import {
  SlotConfig, Grid, Cell as EngineCell, SpinResult,
  simulateSpin, randomGrid,
} from '@/games/slotEngine';
import ThemeBackground from '@/components/ThemeBackground';

// ---- Visual de cada símbolo -------------------------------------------------

interface SymVisual {
  bg: string;
  ring: string;
  text: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  glyph?: string;
}

const ICON: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  banana: Banana,
  grape: Grape,
  apple: Apple,
  citrus: Citrus,
  'candy-blue': Candy,
  'candy-green': Cookie,
  heart: HeartIcon,
  lollipop: Lollipop,
  bomb: Bomb,
  orb: Sparkles,
  zeus: Trophy,
  crown: Crown,
  hourglass: Hourglass,
  ring_gold: Coins,
  'gem-teal': Gem,
  'gem-blue': Gem,
  'gem-green': Gem,
  'gem-purple': Gem,
  'gem-red': Gem,
  'gem-yellow': Gem,
};

const SWEET_VISUALS: Record<string, SymVisual> = {
  banana:      { bg: 'from-yellow-300 to-amber-500',    ring: 'ring-yellow-200', text: 'text-amber-900', icon: ICON.banana },
  grape:       { bg: 'from-purple-400 to-fuchsia-600', ring: 'ring-purple-200', text: 'text-white',    icon: ICON.grape },
  watermelon:  { bg: 'from-rose-400 to-red-600',       ring: 'ring-rose-200',   text: 'text-white',    glyph: '🍉' },
  citrus:      { bg: 'from-orange-300 to-orange-500',  ring: 'ring-orange-200', text: 'text-orange-950', icon: ICON.citrus },
  apple:       { bg: 'from-red-400 to-rose-600',       ring: 'ring-red-200',    text: 'text-white',    icon: ICON.apple },
  'candy-blue':{ bg: 'from-sky-300 to-blue-500',       ring: 'ring-sky-200',    text: 'text-sky-950',  icon: ICON['candy-blue'] },
  'candy-green':{bg: 'from-emerald-300 to-green-500',  ring: 'ring-emerald-200',text: 'text-emerald-950', icon: ICON['candy-green'] },
  heart:       { bg: 'from-pink-400 to-rose-600',      ring: 'ring-pink-200',   text: 'text-white',    icon: ICON.heart },
  lollipop:    { bg: 'from-fuchsia-300 via-pink-400 to-rose-500', ring: 'ring-fuchsia-200', text: 'text-white', icon: ICON.lollipop },
  bomb:        { bg: 'from-amber-300 via-orange-400 to-rose-500', ring: 'ring-amber-200', text: 'text-rose-950', icon: ICON.bomb },
};

const OLYMPUS_VISUALS: Record<string, SymVisual> = {
  'gem-teal':   { bg: 'from-teal-300 to-cyan-600',     ring: 'ring-teal-200',   text: 'text-teal-950', icon: ICON['gem-teal'] },
  'gem-blue':   { bg: 'from-sky-400 to-blue-700',      ring: 'ring-sky-200',    text: 'text-white',    icon: ICON['gem-blue'] },
  'gem-green':  { bg: 'from-emerald-400 to-green-700', ring: 'ring-emerald-200',text: 'text-emerald-950', icon: ICON['gem-green'] },
  'gem-purple': { bg: 'from-violet-400 to-purple-700', ring: 'ring-violet-200', text: 'text-white',    icon: ICON['gem-purple'] },
  'gem-red':    { bg: 'from-rose-400 to-red-700',      ring: 'ring-rose-200',   text: 'text-white',    icon: ICON['gem-red'] },
  'gem-yellow': { bg: 'from-yellow-300 to-amber-500',  ring: 'ring-yellow-200', text: 'text-amber-950',icon: ICON['gem-yellow'] },
  ring_gold:    { bg: 'from-amber-300 to-yellow-600',  ring: 'ring-amber-200',  text: 'text-amber-950',icon: ICON.ring_gold },
  hourglass:    { bg: 'from-orange-300 to-amber-600',  ring: 'ring-orange-200', text: 'text-orange-950', icon: ICON.hourglass },
  crown:        { bg: 'from-yellow-300 via-amber-400 to-yellow-600', ring: 'ring-yellow-100', text: 'text-amber-950', icon: ICON.crown },
  zeus:         { bg: 'from-indigo-400 via-purple-500 to-fuchsia-600', ring: 'ring-indigo-200', text: 'text-white', icon: ICON.zeus },
  orb:          { bg: 'from-amber-300 via-yellow-400 to-orange-500', ring: 'ring-amber-100', text: 'text-amber-950', icon: ICON.orb },
};

type Theme = 'sweet' | 'olympus';

interface Props {
  theme: Theme;
  title: string;
  subtitle: string;
  config: SlotConfig;
  gameName: string;
  accent: string; // tailwind gradiente do botão
  headerBg: string;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const SlotMachineGame: React.FC<Props> = ({ theme, title, subtitle, config, gameName, accent, headerBg }) => {
  const { user, updateBalance, addBet } = useAuth();
  const visuals = theme === 'sweet' ? SWEET_VISUALS : OLYMPUS_VISUALS;

  const [grid, setGrid] = useState<Grid>(() => randomGrid(config));
  const [spinning, setSpinning] = useState(false);
  const [winCells, setWinCells] = useState<Set<number>>(new Set());
  const [multCells, setMultCells] = useState<Record<number, number>>({});
  const [bet, setBet] = useState('2');
  const [lastWin, setLastWin] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [message, setMessage] = useState('');

  const [bonus, setBonus] = useState(false);
  const [bonusSpinsLeft, setBonusSpinsLeft] = useState(0);
  const [bonusTotal, setBonusTotal] = useState(0);
  const [bonusMult, setBonusMult] = useState(0);

  const [favorited, setFavorited] = useState(false);
  const runningRef = useRef(false);

  const betAmount = Math.max(0, parseFloat(bet) || 0);

  const setGridFromStep = useCallback((step: SpinResult['steps'][number]) => {
    setGrid(step.grid.map(col => col.map(c => (c ? { ...c } : null))));
    setMultCells(() => {
      const m: Record<number, number> = {};
      step.multipliers.forEach(p => { m[p.index] = p.value; });
      return m;
    });
  }, []);

  const animateSpin = useCallback(async (result: SpinResult) => {
    soundManager.playBet();
    for (let i = 0; i < result.steps.length; i++) {
      const step = result.steps[i];
      setGridFromStep(step);

      if (step.winCells.length > 0) {
        setWinCells(new Set(step.winCells));
        if (step.multipliers.length) soundManager.playFly();
        await sleep(750);
        setWinCells(new Set());
        await sleep(180);
      } else {
        await sleep(420);
      }
    }
  }, [setGridFromStep]);

  const runBonus = useCallback(async (stake: number) => {
    setBonus(true);
    let spins = config.freeSpinsCount;
    setBonusSpinsLeft(spins);
    setBonusTotal(0);
    setBonusMult(0);
    setMessage(`🎁 ${config.freeSpinsCount} GIROS GRÁTIS!`);
    soundManager.playWin();
    await sleep(1600);

    let acc = 0;
    let globalMult = 0;
    let rawBase = 0; // ganho-base dos giros do Gates (sem orbes), para aplicar o acumulado

    while (spins > 0 && runningRef.current) {
      setBonusSpinsLeft(spins);
      const res = simulateSpin(config, true, true);
      await animateSpin(res);

      if (config.multiplierOnlyInBonus) {
        // Sweet: bombas já foram aplicadas em cada giro
        acc += res.totalWin * stake;
      } else {
        // Gates: soma o ganho-base e acumula os orbes
        rawBase += res.baseWin * stake;
        globalMult += res.totalMultiplier;
        acc = globalMult > 0 ? rawBase * globalMult : rawBase;
      }
      setBonusTotal(acc);
      setBonusMult(globalMult);
      if (res.totalWin > 0) soundManager.playWin();

      if (res.scatterCount >= config.retriggerScatters) {
        spins += 5;
        setMessage('🔥 +5 GIROS GRÁTIS!');
      }
      spins -= 1;
      await sleep(500);
    }

    setBonusSpinsLeft(0);
    if (acc > 0) {
      await updateBalance(acc);
      soundManager.playCashout();
      setMessage(`🎉 BÔNUS: ${formatBRLShort(acc)}`);
      if (user) {
        await recordGameOutcome({
          userId: user.id, gameName, betAmount: stake,
          multiplier: stake > 0 ? acc / stake : 0, winAmount: stake + acc,
        });
      }
      addBet({ game: gameName, amount: stake, odds: stake > 0 ? acc / stake : 0, result: 'win', profit: acc });
    } else {
      setMessage('Bônus encerrado sem ganhos');
      addBet({ game: gameName, amount: stake, odds: 0, result: 'loss', profit: -stake });
    }
    setBonus(false);
    setTotalWin(acc);
  }, [config, animateSpin, updateBalance, user, gameName, addBet]);

  const spin = async () => {
    if (spinning || runningRef.current) return;
    if (betAmount <= 0) { setMessage('Digite uma aposta válida'); return; }
    if (betAmount > (user?.balance || 0)) { setMessage('Saldo insuficiente'); return; }

    runningRef.current = true;
    setSpinning(true);
    setLastWin(0);
    setTotalWin(0);
    setMessage('');
    setWinCells(new Set());
    setMultCells({});

    await updateBalance(-betAmount);

    const favor = await shouldPlayerWin(config.gameKey);
    const result = simulateSpin(config, favor, false);

    await animateSpin(result);

    const winMoney = result.totalWin * betAmount;
    setLastWin(winMoney);

    if (result.freeSpinsTriggered) {
      // entra no bônus (a aposta já foi debitada)
      setSpinning(false);
      await runBonus(betAmount);
      runningRef.current = false;
      setSpinning(false);
      return;
    }

    if (winMoney > 0) {
      await updateBalance(winMoney);
      soundManager.playWin();
      setMessage(`✨ Você ganhou ${formatBRLShort(winMoney)}!`);
      if (user) {
        await recordGameOutcome({
          userId: user.id, gameName, betAmount,
          multiplier: result.totalWin, winAmount: winMoney,
        });
      }
      addBet({ game: gameName, amount: betAmount, odds: result.totalWin, result: 'win', profit: winMoney - betAmount });
    } else {
      soundManager.playLose();
      setMessage('Sem combinação — tente de novo!');
      if (user) {
        await recordGameOutcome({ userId: user.id, gameName, betAmount, multiplier: 0, winAmount: 0 });
      }
      addBet({ game: gameName, amount: betAmount, odds: 0, result: 'loss', profit: -betAmount });
    }

    runningRef.current = false;
    setSpinning(false);
  };

  const renderCell = (cell: EngineCell, col: number, row: number) => {
    const idx = col * config.rows + row;
    const isWin = winCells.has(idx);
    const mult = cell?.sym === config.multiplierId ? cell.mult : undefined;
    const isScatter = cell?.sym === config.scatterId;
    const vis = cell?.sym ? visuals[cell.sym] : null;

    return (
      <div
        key={cell?.key ?? `empty-${col}-${row}`}
        className={`
          relative aspect-square rounded-md sm:rounded-lg flex items-center justify-center
          ${cell?.key ? 'slot-cell-drop' : ''}
          ${isWin ? 'slot-win-pulse z-10' : ''}
          ${mult ? 'slot-multiplier-glow z-10' : ''}
        `}
        style={{ animationDelay: `${col * 60}ms` }}
      >
        {cell && vis && (
          <div className={`
            absolute inset-[6%] rounded-md sm:rounded-lg bg-gradient-to-br ${vis.bg}
            ring-2 ${vis.ring} shadow-lg flex items-center justify-center
            ${isWin ? 'brightness-125' : ''}
            ${isScatter ? 'ring-4 ring-yellow-300/80' : ''}
          `}>
            {vis.icon ? (
              <vis.icon className={`w-[58%] h-[58%] ${vis.text}`} />
            ) : (
              <span className="text-[clamp(10px,3.4vw,26px)]">{vis.glyph}</span>
            )}
          </div>
        )}
        {mult !== undefined && (
          <div className="absolute inset-[10%] rounded-md sm:rounded-lg bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 ring-2 ring-amber-100 flex flex-col items-center justify-center shadow-[0_0_16px_rgba(255,180,40,0.8)]">
            <Zap className="w-[30%] h-[30%] text-rose-950" />
            <span className="text-[clamp(9px,2.6vw,20px)] font-black text-rose-950 leading-none">
              {mult}x
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen text-white flex flex-col relative">
      <ThemeBackground />
      <div className="absolute inset-0 -z-[5] bg-black/55" />

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3 border-b border-white/10 bg-black/70 backdrop-blur-md">
        <Link to="/games">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="text-center">
          <h1 className="text-base sm:text-xl font-black tracking-tight leading-none">{title}</h1>
          <p className="text-[10px] sm:text-xs text-white/50">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 border border-white/10">
          <Wallet className="h-4 w-4 text-green-400" />
          <span className="text-sm font-bold">{formatBRLShort(user?.balance || 0)}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-2 sm:px-4 pb-6 w-full max-w-3xl mx-auto">
        {/* Máquina */}
        <div className={`w-full mt-3 rounded-2xl p-2.5 sm:p-4 border border-white/15 shadow-2xl bg-gradient-to-b ${headerBg}`}>
          {/* Topo com ganho */}
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="text-[10px] sm:text-xs font-bold text-white/60 uppercase tracking-wider">
              {bonus ? `Giros Grátis: ${bonusSpinsLeft}` : 'Ganho'}
            </div>
            <div className="flex items-center gap-1.5">
              {multCells && Object.values(multCells).length > 0 && (
                <span className="text-[10px] sm:text-xs font-black text-amber-300 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {Object.values(multCells).reduce((a, b) => a + b, 0)}x
                </span>
              )}
              <div className="bg-black/40 rounded-md px-2.5 py-1 text-amber-300 font-black text-sm sm:text-lg tabular-nums min-w-[80px] text-center">
                {formatBRLShort(bonus ? bonusTotal : lastWin)}
              </div>
            </div>
          </div>

          {/* Grade 6x5 */}
          <div
            className="grid gap-1 sm:gap-1.5 rounded-xl p-1.5 sm:p-2.5 bg-black/35 border border-white/10"
            style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: config.cols }).map((_, c) => (
              <div key={c} className="flex flex-col gap-1 sm:gap-1.5">
                {Array.from({ length: config.rows }).map((_, r) => renderCell(grid[c]?.[r] ?? null, c, r))}
              </div>
            ))}
          </div>

          {/* Faixa de bônus */}
          {bonus && (
            <div className="mt-2 rounded-lg bg-gradient-to-r from-fuchsia-600/80 to-rose-600/80 px-3 py-1.5 flex items-center justify-between text-xs sm:text-sm font-bold">
              <span className="flex items-center gap-1.5"><Gift className="w-4 h-4" /> GIROS GRÁTIS</span>
              <span>Restam: {bonusSpinsLeft}</span>
              {!config.multiplierOnlyInBonus && <span className="text-amber-200 flex items-center gap-1"><Zap className="w-3.5 h-3.5" />{bonusMult}x</span>}
              <span className="text-amber-200">{formatBRLShort(bonusTotal)}</span>
            </div>
          )}
        </div>

        {/* Mensagem */}
        <div className="h-6 mt-2 text-center">
          {message && <p className="text-sm font-bold text-amber-300 animate-pulse">{message}</p>}
        </div>

        {/* Controles */}
        <div className="w-full mt-2 rounded-2xl bg-black/60 border border-white/10 p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/60 shrink-0">Aposta</label>
            <Input
              type="number"
              value={bet}
              min="0.5"
              step="0.5"
              disabled={spinning}
              onChange={e => setBet(e.target.value)}
              className="bg-white/10 border-white/15 text-white h-10 font-bold text-center"
            />
            <div className="flex gap-1">
              {[1, 5, 10, 50].map(v => (
                <Button
                  key={v}
                  variant="outline"
                  size="sm"
                  disabled={spinning}
                  onClick={() => setBet(String(v))}
                  className="h-8 px-2 text-xs bg-white/5 border-white/15 text-white hover:bg-white/15"
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={spin}
            disabled={spinning}
            size="lg"
            className={`w-full h-14 text-lg sm:text-xl font-black rounded-xl bg-gradient-to-b ${accent} text-white shadow-[0_6px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-0.5 transition-all disabled:opacity-60`}
          >
            {spinning ? (bonus ? 'GIRO GRÁTIS...' : 'GIRANDO...') : `GIRAR  •  ${formatBRLShort(betAmount)}`}
          </Button>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setFavorited(f => !f)} className={`text-xs gap-1.5 ${favorited ? 'text-rose-400' : 'text-white/60'}`}>
              <Heart className={`h-4 w-4 ${favorited ? 'fill-current' : ''}`} /> Favorito
            </Button>
            <p className="text-[10px] text-white/40">
              8+ símbolos iguais pagam • 4+ scatters = giros grátis
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotMachineGame;
