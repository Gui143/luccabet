import React, { useEffect, useState } from 'react';
import {
  Flame,
  Minus,
  Plus,
  ShieldAlert,
  Sparkles,
  Zap,
  Crown,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatBRLShort } from '@/lib/formatCurrency';
import { soundManager } from '@/lib/soundManager';
import type { LegalActions } from '@/games/poker/engine';
import { analyzeCurrentHand, type HandAnalysis } from './PokerHandHelper';

interface PokerBetConsoleProps {
  isMyTurn: boolean;
  actions: LegalActions | null;
  currentBet: number;
  potTotal: number;
  bigBlind: number;
  playerChips: number;
  myHole: string[];
  communityCards: string[];
  waitingMessage?: string;
  onAct: (action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) => void;
}

export const PokerBetConsole: React.FC<PokerBetConsoleProps> = ({
  isMyTurn,
  actions,
  currentBet,
  potTotal,
  bigBlind,
  playerChips,
  myHole,
  communityCards,
  waitingMessage,
  onAct,
}) => {
  const [raiseAmount, setRaiseAmount] = useState(actions?.minRaiseTo ?? bigBlind * 2);

  const minRaise = actions?.minRaiseTo ?? bigBlind;
  const maxRaise = actions?.maxRaiseTo ?? playerChips;
  const toCall = actions?.callAmount ?? 0;

  useEffect(() => {
    if (actions) {
      setRaiseAmount(Math.min(actions.maxRaiseTo, Math.max(actions.minRaiseTo, actions.minRaiseTo)));
    }
  }, [actions?.minRaiseTo, actions?.maxRaiseTo]);

  // Análise da mão em tempo real
  const analysis: HandAnalysis = analyzeCurrentHand(myHole, communityCards);

  const handleSliderChange = (val: number[]) => {
    setRaiseAmount(val[0]);
    soundManager.playChipClink();
  };

  const setPresetRaise = (multiplier: number) => {
    let target = 0;
    if (multiplier === -1) {
      // Min raise
      target = minRaise;
    } else if (multiplier === 0.5) {
      // Meio pote
      target = Math.round(currentBet + potTotal * 0.5);
    } else if (multiplier === 0.75) {
      // 3/4 pote
      target = Math.round(currentBet + potTotal * 0.75);
    } else if (multiplier === 1) {
      // Pote inteiro
      target = Math.round(currentBet + potTotal);
    } else if (multiplier === 2) {
      // 2x pote
      target = Math.round(currentBet + potTotal * 2);
    } else if (multiplier === 999) {
      // All-in
      target = maxRaise;
    }

    const clamped = Math.max(minRaise, Math.min(maxRaise, target));
    setRaiseAmount(clamped);
    soundManager.playChipSplash();
  };

  const addAmount = (diff: number) => {
    const next = Math.max(minRaise, Math.min(maxRaise, raiseAmount + diff));
    setRaiseAmount(next);
    soundManager.playChipClink();
  };

  return (
    <div
      className={`w-full bg-gradient-to-b from-neutral-900/95 via-stone-950/95 to-black/98 backdrop-blur-xl rounded-2xl p-3 sm:p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(251,191,36,0.3)] transition-all ${
        isMyTurn
          ? 'border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.35)]'
          : 'border border-amber-500/40'
      }`}
    >
      {/* -------------------- Força da mão */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10 text-xs">
        {isMyTurn && (
          <div className="w-full flex items-center gap-2 pb-1">
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black font-black text-[11px] tracking-wide animate-pulse">
              SUA VEZ — ESCOLHA UMA AÇÃO
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-[11px] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>SUA MÃO:</span>
          </div>

          <span className="font-bold text-white text-xs sm:text-sm">
            {analysis.name}
          </span>

          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${analysis.tierColor} border-amber-400/30`}>
            {analysis.tierLabel}
          </Badge>
        </div>

        {/* Barra de Força da Mão */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Força:
          </span>
          <div className="w-24 sm:w-32 h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                analysis.strengthPct >= 80
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-[0_0_8px_#fbbf24]'
                  : analysis.strengthPct >= 50
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-slate-500 to-slate-400'
              }`}
              style={{ width: `${Math.max(10, analysis.strengthPct)}%` }}
            />
          </div>
          <span className="text-[11px] font-black text-amber-300 tabular-nums">
            {analysis.strengthPct}%
          </span>
        </div>
      </div>

      {/* -------------------- Controles quando é a sua vez */}
      {isMyTurn && actions ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Informações rápidas da aposta */}
          <div className="flex flex-wrap items-center justify-between text-xs gap-2 px-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>Aposta da mesa:</span>
              <strong className="text-white tabular-nums font-bold">{formatBRLShort(currentBet)}</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Para Pagar:</span>
              <strong className="text-emerald-400 text-sm font-black tabular-nums">
                {formatBRLShort(toCall)}
              </strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Pote Atual:</span>
              <strong className="text-amber-400 text-sm font-black tabular-nums">
                {formatBRLShort(potTotal)}
              </strong>
            </div>
          </div>

          {/* Atalhos de Pote Rápidos */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPresetRaise(-1)}
              className="h-7 text-[11px] font-bold border-white/20 hover:border-amber-400 hover:bg-amber-500/10"
            >
              Mín
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPresetRaise(0.5)}
              className="h-7 text-[11px] font-bold border-white/20 hover:border-amber-400 hover:bg-amber-500/10"
            >
              ½ Pote
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPresetRaise(0.75)}
              className="h-7 text-[11px] font-bold border-white/20 hover:border-amber-400 hover:bg-amber-500/10"
            >
              ¾ Pote
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPresetRaise(1)}
              className="h-7 text-[11px] font-bold border-white/20 hover:border-amber-400 hover:bg-amber-500/10"
            >
              Pote
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPresetRaise(2)}
              className="h-7 text-[11px] font-bold border-white/20 hover:border-amber-400 hover:bg-amber-500/10"
            >
              2x Pote
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPresetRaise(999)}
              className="h-7 text-[11px] font-black border-amber-500/60 bg-amber-500/15 text-amber-300 hover:bg-amber-500/30"
            >
              MÁX
            </Button>
          </div>

          {/* Slider de Aposta Dourado + Input */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Valor do Aumento:
              </span>

              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={raiseAmount}
                  min={minRaise}
                  max={maxRaise}
                  onChange={(e) => setRaiseAmount(Math.max(0, Number(e.target.value)))}
                  className="w-28 h-7 text-xs font-black text-amber-300 text-right bg-neutral-900 border-amber-500/40"
                />
                <span className="text-[11px] text-muted-foreground">
                  (máx {formatBRLShort(maxRaise)})
                </span>
              </div>
            </div>

            <Slider
              value={[raiseAmount]}
              min={minRaise}
              max={Math.max(minRaise, maxRaise)}
              step={Math.max(1, Math.round(bigBlind / 2))}
              onValueChange={handleSliderChange}
              className="cursor-pointer"
            />

            {/* Botoes de incremento rápido */}
            <div className="flex flex-wrap gap-1 justify-center pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addAmount(-bigBlind)}
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-white"
              >
                <Minus className="w-3 h-3 mr-0.5" /> {formatBRLShort(bigBlind)}
              </Button>
              {[50, 100, 500, 1000, 5000].map((step) =>
                step <= maxRaise ? (
                  <Button
                    key={step}
                    variant="ghost"
                    size="sm"
                    onClick={() => addAmount(step)}
                    className="h-6 px-2 text-[10px] text-amber-300/80 hover:text-amber-300 hover:bg-amber-500/10"
                  >
                    +{formatBRLShort(step)}
                  </Button>
                ) : null,
              )}
            </div>
          </div>

          {/* 4 GRANDES BOTÕES DE AÇÃO VIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {/* FOLD */}
            <Button
              type="button"
              onClick={() => {
                soundManager.playLose();
                onAct('fold');
              }}
              className="h-12 bg-gradient-to-b from-red-600 via-red-700 to-rose-950 hover:from-red-500 hover:to-rose-900 border border-red-500/60 shadow-[0_4px_15px_rgba(239,68,68,0.4)] text-white font-black text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <XCircle className="w-4 h-4" />
              <span>DESISTIR (FOLD)</span>
            </Button>

            {/* CHECK / CALL */}
            <Button
              type="button"
              onClick={() => {
                if (toCall === 0) soundManager.playChipClink();
                else soundManager.playChipSplash();
                onAct(toCall === 0 ? 'check' : 'call');
              }}
              className="h-12 bg-gradient-to-b from-sky-600 via-blue-700 to-indigo-950 hover:from-sky-500 hover:to-blue-900 border border-sky-400/60 shadow-[0_4px_15px_rgba(14,165,233,0.4)] text-white font-black text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-sky-200" />
              <span>{toCall === 0 ? 'MESA (CHECK)' : `PAGAR ${formatBRLShort(toCall)}`}</span>
            </Button>

            {/* RAISE */}
            <Button
              type="button"
              disabled={!actions.canRaise}
              onClick={() => {
                soundManager.playChipSplash();
                onAct('raise', raiseAmount);
              }}
              className="h-12 bg-gradient-to-b from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:to-yellow-500 border border-yellow-300/80 shadow-[0_4px_20px_rgba(251,191,36,0.6)] text-black font-black text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>AUMENTAR ({formatBRLShort(raiseAmount)})</span>
            </Button>

            {/* ALL-IN */}
            <Button
              type="button"
              onClick={() => {
                soundManager.playAllIn();
                onAct('allin');
              }}
              className="h-12 bg-gradient-to-b from-orange-500 via-amber-600 to-rose-900 hover:from-orange-400 hover:to-rose-800 border-2 border-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.7)] text-white font-black text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 animate-pulse"
            >
              <Crown className="w-4 h-4 text-yellow-300" />
              <span>ALL-IN ({formatBRLShort(playerChips)})</span>
            </Button>
          </div>
        </div>
      ) : (
        /* Status de Espera VIP */
        <div className="py-2 px-3 text-center flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{waitingMessage || 'Aguardando a jogada dos outros competidores…'}</span>
          </div>

          <div className="text-[11px] text-amber-300/90 font-semibold flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Suas Fichas: {formatBRLShort(playerChips)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PokerBetConsole;
