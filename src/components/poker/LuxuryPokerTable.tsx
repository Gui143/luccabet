import React, { useEffect, useState } from 'react';
import { Crown, Sparkles, Trophy, UserPlus, Volume2, Shield, Flame } from 'lucide-react';
import PlayingCard from './PlayingCard';
import { ChipStack, PokerChip } from './PokerChip';
import { formatBRLShort } from '@/lib/formatCurrency';
import type { PublicState, CardCode } from '@/games/poker/engine';
import { soundManager } from '@/lib/soundManager';

export type TableTheme = 'monte-carlo' | 'bellagio-obsidian' | 'macau-ruby' | 'dubai-sapphire' | 'monaco-amethyst';

export interface ThemeStyles {
  name: string;
  feltBg: string;
  railBorder: string;
  innerGlow: string;
  watermarkColor: string;
  labelColor: string;
}

export const THEME_CONFIGS: Record<TableTheme, ThemeStyles> = {
  'monte-carlo': {
    name: 'Monte Carlo Emerald',
    feltBg: 'radial-gradient(ellipse at center, #0e5436 0%, #093c26 55%, #042215 100%)',
    railBorder: 'border-[#451a03]',
    innerGlow: 'shadow-[inset_0_0_80px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(251,191,36,0.3)]',
    watermarkColor: 'rgba(251, 191, 36, 0.14)',
    labelColor: 'text-amber-300',
  },
  'bellagio-obsidian': {
    name: 'Bellagio Obsidian & Gold',
    feltBg: 'radial-gradient(ellipse at center, #1e1e24 0%, #111116 55%, #060608 100%)',
    railBorder: 'border-[#18181b]',
    innerGlow: 'shadow-[inset_0_0_80px_rgba(0,0,0,0.9),inset_0_0_25px_rgba(251,191,36,0.4)]',
    watermarkColor: 'rgba(251, 191, 36, 0.18)',
    labelColor: 'text-amber-400',
  },
  'macau-ruby': {
    name: 'Macau Imperial Ruby',
    feltBg: 'radial-gradient(ellipse at center, #5e111a 0%, #3e070d 55%, #200206 100%)',
    railBorder: 'border-[#3f0f15]',
    innerGlow: 'shadow-[inset_0_0_80px_rgba(0,0,0,0.85),inset_0_0_20px_rgba(251,191,36,0.35)]',
    watermarkColor: 'rgba(251, 191, 36, 0.16)',
    labelColor: 'text-amber-300',
  },
  'dubai-sapphire': {
    name: 'Dubai Royal Sapphire',
    feltBg: 'radial-gradient(ellipse at center, #0f3254 0%, #092037 55%, #04101d 100%)',
    railBorder: 'border-[#0a192f]',
    innerGlow: 'shadow-[inset_0_0_80px_rgba(0,0,0,0.85),inset_0_0_25px_rgba(56,189,248,0.35)]',
    watermarkColor: 'rgba(56, 189, 248, 0.15)',
    labelColor: 'text-cyan-300',
  },
  'monaco-amethyst': {
    name: 'Monaco Royal Amethyst',
    feltBg: 'radial-gradient(ellipse at center, #3b1450 0%, #250a34 55%, #13031c 100%)',
    railBorder: 'border-[#2e1065]',
    innerGlow: 'shadow-[inset_0_0_80px_rgba(0,0,0,0.85),inset_0_0_25px_rgba(216,180,254,0.35)]',
    watermarkColor: 'rgba(232, 121, 249, 0.15)',
    labelColor: 'text-purple-300',
  },
};

/** Posições das 6 cadeiras em porcentagem (com margens seguras anti-overscan) */
const SEAT_POSITIONS = [
  { x: 50, y: 84, chipX: 50, chipY: 68, dealerX: 42, dealerY: 74 }, // Assento 0 (Você - Centro Inferior)
  { x: 86, y: 62, chipX: 74, chipY: 58, dealerX: 79, dealerY: 51 }, // Assento 1 (Direita Inferior)
  { x: 81, y: 18, chipX: 72, chipY: 28, dealerX: 76, dealerY: 34 }, // Assento 2 (Direita Superior)
  { x: 50, y: 10, chipX: 50, chipY: 23, dealerX: 50, dealerY: 30 }, // Assento 3 (Centro Superior)
  { x: 19, y: 18, chipX: 28, chipY: 28, dealerX: 24, dealerY: 34 }, // Assento 4 (Esquerda Superior)
  { x: 14, y: 62, chipX: 26, chipY: 58, dealerX: 21, dealerY: 51 }, // Assento 5 (Esquerda Inferior)
];

const VIP_AVATARS = [
  { emoji: '👑', rank: 'WHALE', color: 'from-amber-400 to-yellow-600' },
  { emoji: '💎', rank: 'DIAMOND', color: 'from-cyan-400 to-blue-600' },
  { emoji: '🦈', rank: 'SHARK', color: 'from-emerald-400 to-teal-700' },
  { emoji: '⚡', rank: 'PRO', color: 'from-purple-400 to-indigo-700' },
  { emoji: '🎩', rank: 'VIP', color: 'from-rose-400 to-red-700' },
  { emoji: '🪙', rank: 'HIGH ROLLER', color: 'from-yellow-300 to-amber-600' },
];

const PHASE_LABELS: Record<string, string> = {
  idle: 'AGUARDANDO JOGADORES',
  preflop: 'PRÉ-FLOP',
  flop: 'FLOP',
  turn: 'TURN',
  river: 'RIVER',
  showdown: 'SHOWDOWN',
  finished: 'MÃO ENCERRADA',
};

// ------------------------------------------------------------- Cronômetro Circular VIP
const RadialTurnTimer: React.FC<{ deadline: number | null; now: () => number; turnSeconds: number }> = ({
  deadline,
  now,
  turnSeconds,
}) => {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!deadline) {
      setLeft(0);
      return;
    }
    const update = () => setLeft(Math.max(0, (deadline - now()) / 1000));
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [deadline, now]);

  if (!deadline) return null;
  const pct = Math.max(0, Math.min(100, (left / turnSeconds) * 100));
  const strokeDash = 2 * Math.PI * 22;
  const strokeOffset = strokeDash - (pct / 100) * strokeDash;

  const isUrgent = left < 6;

  return (
    <div className="absolute -inset-1 pointer-events-none flex items-center justify-center">
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="50%"
          cy="50%"
          r="22"
          fill="none"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="3.5"
        />
        <circle
          cx="50%"
          cy="50%"
          r="22"
          fill="none"
          stroke={isUrgent ? '#ef4444' : left < 12 ? '#f59e0b' : '#fbbf24'}
          strokeWidth="3.5"
          strokeDasharray={strokeDash}
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
          className="transition-all duration-100"
        />
      </svg>
      {isUrgent && (
        <span className="absolute -top-3 text-[9px] font-black text-red-400 bg-black/90 px-1 rounded-full border border-red-500/50 animate-pulse">
          {left.toFixed(0)}s
        </span>
      )}
    </div>
  );
};

// ------------------------------------------------------------- Assento do Jogador VIP
interface LuxurySeatProps {
  seat: PublicState['seats'][number];
  isYou: boolean;
  isTurn: boolean;
  isDealer: boolean;
  now: () => number;
  turnSeconds: number;
  deadline: number | null;
  winning: boolean;
  winningCardsSet: Set<string>;
  cardWidth: number;
  onSitHere?: () => void;
}

const LuxurySeat: React.FC<LuxurySeatProps> = ({
  seat,
  isYou,
  isTurn,
  isDealer,
  now,
  turnSeconds,
  deadline,
  winning,
  winningCardsSet,
  cardWidth,
  onSitHere,
}) => {
  const isOccupied = !!seat.playerId;

  if (!isOccupied) {
    return (
      <button
        onClick={onSitHere}
        className="group flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
      >
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/60 border-2 border-dashed border-amber-400/40 group-hover:border-amber-400 group-hover:bg-amber-500/20 group-hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] flex items-center justify-center transition-all backdrop-blur-md">
          <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300/60 group-hover:text-amber-300" />
        </div>
        <span className="text-[10px] font-bold text-amber-300/70 group-hover:text-amber-300 mt-0.5 tracking-tight">
          Sentar
        </span>
      </button>
    );
  }

  const folded = seat.status === 'folded';
  const allIn = seat.status === 'allin';
  const avatarCfg = VIP_AVATARS[seat.avatarSeed % VIP_AVATARS.length];

  return (
    <div
      className={`flex flex-col items-center select-none transition-all duration-300 ${
        isTurn ? 'scale-110 z-30' : 'z-20'
      }`}
    >
      {/* Cartas do Jogador */}
      {seat.hole && seat.hole.length === 2 && (
        <div className="flex -space-x-4 mb-1 transition-transform">
          {seat.hole.map((c, i) => (
            <PlayingCard
              key={i}
              code={c}
              width={cardWidth}
              dimmed={folded}
              tilt={i === 0 ? -6 : 6}
              highlight={winning || winningCardsSet.has(c)}
              className="drop-shadow-lg"
            />
          ))}
        </div>
      )}

      {/* Avatar + Anel do Cronômetro */}
      <div className="relative flex items-center justify-center">
        {/* Spotlight ativo na vez do jogador */}
        {isTurn && (
          <div className="absolute -inset-2 rounded-full bg-amber-400/30 blur-md animate-ping" />
        )}

        <div
          className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr ${avatarCfg.color} p-[2px] shadow-xl flex items-center justify-center ${
            isTurn ? 'ring-2 ring-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.9)]' : ''
          }`}
        >
          <div className="w-full h-full rounded-full bg-neutral-950 flex items-center justify-center text-lg sm:text-xl">
            {avatarCfg.emoji}
          </div>
        </div>

        {/* Cronômetro circular na vez */}
        {isTurn && <RadialTurnTimer deadline={deadline} now={now} turnSeconds={turnSeconds} />}

        {/* Badge de Dealer (D) no Avatar se for o dealer */}
        {isDealer && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-black font-black text-[10px] border border-black flex items-center justify-center shadow-md z-30"
            title="Dealer"
          >
            D
          </div>
        )}
      </div>

      {/* Placa de Identificação VIP (Obsidian Glass) */}
      <div
        className={`relative mt-1 px-2.5 py-1 rounded-xl border backdrop-blur-md text-center min-w-[96px] sm:min-w-[110px] shadow-2xl transition-all ${
          folded
            ? 'bg-red-950/70 border-red-800/50 text-red-300'
            : isTurn
              ? 'bg-amber-400 text-black border-amber-200 font-black shadow-[0_0_25px_rgba(251,191,36,0.8)]'
              : winning
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.7)]'
                : 'bg-black/85 border-white/20 text-white'
        }`}
      >
        {/* Nome do Jogador */}
        <div className="flex items-center justify-center gap-1">
          <span className="truncate max-w-[75px] sm:max-w-[90px] text-[11px] font-black">
            {seat.name}
          </span>
          {isYou && (
            <span className="text-[9px] px-1 rounded bg-sky-500/80 text-white font-bold">
              VOCÊ
            </span>
          )}
          {seat.isBot && <span className="text-[8px] opacity-70 font-normal">bot</span>}
        </div>

        {/* Saldo de Fichas na Mesa */}
        <div
          className={`text-[11px] font-black tabular-nums ${
            folded
              ? 'text-red-400'
              : isTurn
                ? 'text-black'
                : winning
                  ? 'text-white'
                  : 'text-emerald-300'
          }`}
        >
          {formatBRLShort(seat.chips)}
        </div>

        {/* Status de Ação / All-in / Fold */}
        {allIn && (
          <div className="text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/80 rounded px-1 mt-0.5 animate-pulse">
            💥 ALL-IN
          </div>
        )}
        {folded && <div className="text-[9px] font-bold uppercase tracking-wider text-red-300">FOLD</div>}
        {seat.lastAction && !folded && !allIn && (
          <div className="text-[9px] font-bold uppercase tracking-wider opacity-80 mt-0.5">
            {seat.lastAction}
          </div>
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------------------- Mesa de Luxo Principal
export interface LuxuryPokerTableProps {
  state: PublicState | null;
  userId?: string;
  theme?: TableTheme;
  serverNow: () => number;
  onSit: (seatIndex: number) => void;
}

export const LuxuryPokerTable: React.FC<LuxuryPokerTableProps> = ({
  state,
  userId,
  theme = 'monte-carlo',
  serverNow,
  onSit,
}) => {
  const themeCfg = THEME_CONFIGS[theme] ?? THEME_CONFIGS['monte-carlo'];

  const potTotal = state ? state.seats.reduce((acc, s) => acc + s.committed, 0) : 0;
  const winners = state?.winners ?? [];
  const winningSeats = new Set(winners.map((w) => w.seat));

  // Cartas vencedoras para dar brilho dourado
  const winningCardsSet = new Set<string>();
  winners.forEach((w) => {
    if (w.handCards) w.handCards.forEach((c) => winningCardsSet.add(c));
  });

  const waitingForPlayers = state && state.phase === 'idle';

  return (
    <div className="relative w-full aspect-[16/11] sm:aspect-[16/10] max-h-[480px] xl:max-h-[520px] 2xl:max-h-[580px] select-none mx-auto">
      {/* -------------------- Moldura Externa de Couro Acolchoado com Costura Dupla Dourada */}
      <div
        className={`relative w-full h-full rounded-[48%]/[28%] sm:rounded-[50%] p-3 sm:p-5 bg-gradient-to-b from-[#2a1308] via-[#1a0c05] to-[#0d0602] shadow-[0_30px_90px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.2)] border-4 sm:border-8 border-[#381a0b]`}
      >
        {/* Linha de Costura Dourada do Couro */}
        <div className="absolute inset-1.5 sm:inset-2.5 rounded-[48%]/[28%] sm:rounded-[50%] border-2 border-dashed border-amber-500/30 pointer-events-none" />

        {/* -------------------- Pano de Feltro de Luxo (Veludo Imperial) */}
        <div
          className={`relative w-full h-full rounded-[48%]/[28%] sm:rounded-[50%] overflow-hidden ${themeCfg.innerGlow} flex items-center justify-center`}
          style={{ background: themeCfg.feltBg }}
        >
          {/* Padrão de Marca D'água Monograma / Brasão LuccaBet VIP */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div
              className="font-black text-center tracking-widest uppercase text-3xl sm:text-5xl opacity-40 select-none"
              style={{ color: themeCfg.watermarkColor }}
            >
              LUCCABET
            </div>
            <div
              className="font-bold text-center tracking-wider text-[10px] sm:text-xs uppercase opacity-30 mt-1"
              style={{ color: themeCfg.watermarkColor }}
            >
              VIP HIGH ROLLER LOUNGE • NO LIMIT HOLD'EM
            </div>
          </div>

          {/* Anel de laser suave no feltro */}
          <div className="absolute inset-6 sm:inset-10 rounded-[48%]/[28%] sm:rounded-[50%] border border-amber-400/20 pointer-events-none" />

          {/* -------------------- CENTRO DA MESA: Comunitárias + Pote Dourado 3D */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[72%] sm:w-[58%] flex flex-col items-center gap-2 z-10">
            {/* POTE TOTAL VIP */}
            <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/60 shadow-[0_0_25px_rgba(251,191,36,0.5)] animate-in fade-in">
              <Crown className="w-4 h-4 text-amber-300 animate-pulse" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-amber-300/80 font-bold tracking-wider uppercase">
                  POTE TOTAL:
                </span>
                <span className="text-amber-300 font-black text-base sm:text-xl tabular-nums drop-shadow">
                  {formatBRLShort(potTotal)}
                </span>
              </div>
            </div>

            {/* Fichas Físicas 3D no Pote */}
            {potTotal > 0 && (
              <div className="flex items-center justify-center -my-1">
                <ChipStack amount={potTotal} size={30} maxChips={7} showAmountBadge={false} />
              </div>
            )}

            {/* CARTAS COMUNITÁRIAS (FLOP • TURN • RIVER) COM SLOTS DOURADOS */}
            <div className="flex gap-1.5 sm:gap-2 justify-center items-center min-h-[58px] sm:min-h-[82px] p-1.5 rounded-2xl bg-black/40 border border-amber-500/20 shadow-inner">
              {[0, 1, 2, 3, 4].map((i) => {
                const card = state?.community?.[i];
                const slotLabel = i <= 2 ? 'FLOP' : i === 3 ? 'TURN' : 'RIVER';

                return card ? (
                  <PlayingCard
                    key={`${state?.handNo}-${i}`}
                    code={card}
                    width={56}
                    highlight={winningCardsSet.has(card)}
                    className="drop-shadow-2xl"
                  />
                ) : (
                  <div
                    key={`slot-${i}`}
                    className="w-10 h-14 sm:w-14 sm:h-20 rounded-lg border-2 border-dashed border-amber-400/20 bg-black/30 flex flex-col items-center justify-center text-[9px] font-bold text-amber-300/30 uppercase tracking-tighter"
                  >
                    {slotLabel}
                  </div>
                );
              })}
            </div>

            {/* Fase da mão / Mão # */}
            <div className="px-3 py-0.5 rounded-full bg-black/60 border border-white/10 text-[10px] sm:text-xs font-black text-white/90 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>{state ? PHASE_LABELS[state.phase] : 'CARREGANDO'}</span>
              {state && state.handNo > 0 && (
                <span className="text-amber-400/80">• MÃO #{state.handNo}</span>
              )}
            </div>

            {/* Potes Laterais (Side Pots) */}
            {state?.pots && state.pots.length > 1 && (
              <div className="flex flex-wrap gap-1 justify-center">
                {state.pots.map((p, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-black/70 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold"
                  >
                    {p.label}: {formatBRLShort(p.amount)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* -------------------- 6 ASSENTOS DOS JOGADORES VIP */}
          {state?.seats.map((seat, idx) => {
            const pos = SEAT_POSITIONS[idx % SEAT_POSITIONS.length];
            const isTurn = state.turnSeat === idx;
            const isDealer = state.dealerSeat === idx;
            const isYou = !!userId && seat.playerId === userId;

            return (
              <React.Fragment key={idx}>
                {/* Assento */}
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  <LuxurySeat
                    seat={seat}
                    isYou={isYou}
                    isTurn={isTurn}
                    isDealer={isDealer}
                    now={serverNow}
                    turnSeconds={state.turnSeconds}
                    deadline={isTurn ? state.actionDeadline : null}
                    winning={winningSeats.has(idx)}
                    winningCardsSet={winningCardsSet}
                    cardWidth={idx === 0 || isYou ? 46 : 38}
                    onSitHere={() => onSit(idx)}
                  />
                </div>

                {/* Fichas Apostadas na Mesa pelo Jogador */}
                {seat.bet > 0 && (
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 animate-in zoom-in-75 duration-200"
                    style={{ left: `${pos.chipX}%`, top: `${pos.chipY}%` }}
                  >
                    <ChipStack amount={seat.bet} size={24} maxChips={5} align="center" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LuxuryPokerTable;
