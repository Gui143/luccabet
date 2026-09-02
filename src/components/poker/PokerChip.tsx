import React from 'react';

export type ChipDenomination = 1 | 5 | 25 | 100 | 500 | 1000 | 5000 | 25000 | 100000;

interface ChipConfig {
  value: ChipDenomination;
  label: string;
  bgGradient: string;
  borderColor: string;
  edgeStripes: string;
  textColor: string;
  rimColor: string;
  centerBg: string;
}

const CHIP_CONFIGS: Record<ChipDenomination, ChipConfig> = {
  1: {
    value: 1,
    label: '1',
    bgGradient: 'from-slate-100 via-slate-200 to-slate-300',
    borderColor: '#94a3b8',
    edgeStripes: '#475569',
    textColor: '#0f172a',
    rimColor: '#cbd5e1',
    centerBg: '#ffffff',
  },
  5: {
    value: 5,
    label: '5',
    bgGradient: 'from-red-600 via-red-700 to-red-900',
    borderColor: '#ef4444',
    edgeStripes: '#ffffff',
    textColor: '#ffffff',
    rimColor: '#fca5a5',
    centerBg: '#7f1d1d',
  },
  25: {
    value: 25,
    label: '25',
    bgGradient: 'from-emerald-600 via-emerald-700 to-emerald-900',
    borderColor: '#10b981',
    edgeStripes: '#fbbf24',
    textColor: '#ffffff',
    rimColor: '#6ee7b7',
    centerBg: '#064e3b',
  },
  100: {
    value: 100,
    label: '100',
    bgGradient: 'from-zinc-900 via-neutral-950 to-black',
    borderColor: '#fbbf24',
    edgeStripes: '#f59e0b',
    textColor: '#fbbf24',
    rimColor: '#fef08a',
    centerBg: '#18181b',
  },
  500: {
    value: 500,
    label: '500',
    bgGradient: 'from-purple-700 via-purple-900 to-indigo-950',
    borderColor: '#c084fc',
    edgeStripes: '#f43f5e',
    textColor: '#ffffff',
    rimColor: '#e9d5ff',
    centerBg: '#3b0764',
  },
  1000: {
    value: 1000,
    label: '1K',
    bgGradient: 'from-amber-400 via-amber-500 to-yellow-600',
    borderColor: '#fef08a',
    edgeStripes: '#000000',
    textColor: '#000000',
    rimColor: '#fffbeb',
    centerBg: '#78350f',
  },
  5000: {
    value: 5000,
    label: '5K',
    bgGradient: 'from-rose-800 via-rose-950 to-stone-900',
    borderColor: '#fda4af',
    edgeStripes: '#fbbf24',
    textColor: '#fbbf24',
    rimColor: '#ffe4e6',
    centerBg: '#4c0519',
  },
  25000: {
    value: 25000,
    label: '25K',
    bgGradient: 'from-cyan-500 via-teal-700 to-slate-950',
    borderColor: '#67e8f9',
    edgeStripes: '#ffffff',
    textColor: '#ffffff',
    rimColor: '#cffafe',
    centerBg: '#134e4a',
  },
  100000: {
    value: 100000,
    label: '100K',
    bgGradient: 'from-amber-300 via-neutral-900 to-black',
    borderColor: '#fde047',
    edgeStripes: '#ec4899',
    textColor: '#fde047',
    rimColor: '#fef9c3',
    centerBg: '#09090b',
  },
};

const DENOMINATIONS: ChipDenomination[] = [100000, 25000, 5000, 1000, 500, 100, 25, 5, 1];

export function getChipConfig(value: number): ChipConfig {
  for (const denom of DENOMINATIONS) {
    if (value >= denom) return CHIP_CONFIGS[denom];
  }
  return CHIP_CONFIGS[1];
}

export function breakdownChips(amount: number, maxChips = 6): ChipDenomination[] {
  let remaining = Math.max(0, Math.round(amount));
  if (remaining === 0) return [];
  const result: ChipDenomination[] = [];

  for (const denom of DENOMINATIONS) {
    while (remaining >= denom && result.length < maxChips) {
      result.push(denom);
      remaining -= denom;
    }
  }

  // Se sobrou troco e a lista ainda tem espaço
  if (remaining > 0 && result.length < maxChips) {
    result.push(1);
  }

  return result;
}

export interface PokerChipProps {
  denom?: ChipDenomination;
  value?: number;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

export const PokerChip: React.FC<PokerChipProps> = ({
  denom,
  value,
  size = 32,
  className = '',
  showLabel = true,
}) => {
  const cfg = denom ? CHIP_CONFIGS[denom] : getChipConfig(value ?? 1);
  const displayLabel = denom ? cfg.label : value ? formatShortChip(value) : cfg.label;

  return (
    <div
      className={`relative select-none rounded-full flex items-center justify-center transition-transform ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 50%), ${cfg.borderColor}`,
        boxShadow: `0 3px 6px rgba(0,0,0,0.6), inset 0 2px 2px rgba(255,255,255,0.4), inset 0 -2px 3px rgba(0,0,0,0.6)`,
      }}
    >
      {/* Moldura externa do chip com bordas listradas */}
      <div
        className={`w-full h-full rounded-full bg-gradient-to-br ${cfg.bgGradient} p-[3px] flex items-center justify-center`}
        style={{
          border: `1.5px dashed ${cfg.edgeStripes}`,
        }}
      >
        {/* Anel interno dourado / metálico */}
        <div
          className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
          style={{
            background: cfg.centerBg,
            border: `1px solid ${cfg.rimColor}44`,
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          {/* Brilho especular */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />

          {showLabel && (
            <span
              className="font-black leading-none tracking-tighter"
              style={{
                color: cfg.textColor,
                fontSize: Math.max(9, Math.round(size * 0.32)),
                textShadow: cfg.textColor === '#000000' ? 'none' : '0 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {displayLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export interface ChipStackProps {
  amount: number;
  size?: number;
  maxChips?: number;
  showAmountBadge?: boolean;
  className?: string;
  align?: 'center' | 'left' | 'right';
}

export const ChipStack: React.FC<ChipStackProps> = ({
  amount,
  size = 28,
  maxChips = 5,
  showAmountBadge = true,
  className = '',
  align = 'center',
}) => {
  if (amount <= 0) return null;

  const chips = breakdownChips(amount, maxChips);
  const offsetStep = Math.max(3, Math.round(size * 0.14));

  return (
    <div className={`inline-flex flex-col items-${align} ${className}`}>
      {/* Pilha 3D de fichas */}
      <div
        className="relative select-none"
        style={{
          width: size,
          height: size + (chips.length - 1) * offsetStep,
        }}
      >
        {chips.map((denom, index) => {
          const bottomOffset = index * offsetStep;
          // Pequena variação aleatória determinística para dar realismo à pilha física
          const rot = ((index * 7) % 15) - 7;
          return (
            <div
              key={index}
              className="absolute left-0 transition-all duration-300"
              style={{
                bottom: bottomOffset,
                transform: `rotate(${rot}deg)`,
                zIndex: index,
              }}
            >
              <PokerChip denom={denom} size={size} showLabel={index === chips.length - 1} />
            </div>
          );
        })}
      </div>

      {showAmountBadge && (
        <div className="mt-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-amber-400/50 shadow-md flex items-center gap-0.5 z-10">
          <span className="text-[10px] font-black text-amber-300 tabular-nums leading-none">
            R$ {formatShortChip(amount)}
          </span>
        </div>
      )}
    </div>
  );
};

function formatShortChip(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(num % 1000 === 0 ? 0 : 1).replace('.0', '')}k`;
  return String(Math.round(num));
}

export default PokerChip;
