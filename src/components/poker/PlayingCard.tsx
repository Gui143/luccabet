/**
 * Carta de Baralho Luxury High-Definition para Cassino VIP.
 *
 * Suporta renderização com sprite atlas de alta velocidade com fallback para PNG individual,
 * além de bordas em folha de ouro, efeitos 3D, cartas vencedoras brilhantes e verso VIP.
 */
import React from 'react';
import { BACK_CODE, type CardCode, isFaceDown } from '@/games/poker/engine';

const ATLAS = '/cards/atlas.png';
const FRAME_W = 200;
const FRAME_H = 280;
const COLS = 13;
const ROWS = 4;

const SUIT_ROW: Record<string, number> = { s: 0, h: 1, d: 2, c: 3 };
const RANK_COL: Record<string, number> = {
  '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7,
  t: 8, j: 9, q: 10, k: 11, a: 12,
};

export interface PlayingCardProps {
  code: CardCode | null | undefined;
  /** largura em px (a altura segue a proporção 1:1.4) */
  width?: number;
  className?: string;
  faceDown?: boolean;
  /** destaque dourado (cartas que compõem a mão vencedora) */
  highlight?: boolean;
  dimmed?: boolean;
  tilt?: number; // ângulo de rotação em graus
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  code,
  width = 64,
  className = '',
  faceDown = false,
  highlight = false,
  dimmed = false,
  tilt = 0,
  style,
  onClick,
}) => {
  const height = Math.round(width * (FRAME_H / FRAME_W));
  const isBack = faceDown || isFaceDown(code);

  const background = React.useMemo(() => {
    if (isBack) {
      return {
        backgroundImage: `url(${ATLAS}), url('/cards/back.png')`,
        backgroundSize: `${width}px ${height}px, cover`,
        backgroundPosition: `-9999px -9999px, center`,
      };
    }
    const rank = code ? code[0] : 'a';
    const suit = code ? code[1] : 's';
    const col = RANK_COL[rank] ?? 0;
    const row = SUIT_ROW[suit] ?? 0;
    return {
      backgroundImage: `url(${ATLAS}), url('/cards/${code}.png')`,
      backgroundSize: `${COLS * width}px ${ROWS * height}px, ${width}px ${height}px`,
      backgroundPosition: `${-col * width}px ${-row * height}px, center`,
      imageRendering: 'auto' as const,
    };
  }, [code, isBack, width, height]);

  const radius = Math.max(4, Math.round(width / 12));

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 select-none transition-all duration-300 ${
        highlight
          ? 'scale-105 z-20 animate-pulse'
          : ''
      } ${
        dimmed ? 'opacity-40 grayscale -translate-y-1' : 'hover:-translate-y-1 hover:shadow-2xl'
      } ${className}`}
      style={{
        width,
        height,
        borderRadius: radius,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        boxShadow: highlight
          ? '0 0 20px rgba(251,191,36,0.9), 0 0 35px rgba(245,158,11,0.6), 0 8px 18px rgba(0,0,0,0.8)'
          : '0 4px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)',
        ...style,
      }}
      title={!isBack && code ? code.toUpperCase() : undefined}
      aria-label={isBack ? 'carta virada' : `carta ${code}`}
    >
      {/* Moldura / textura da carta */}
      <div
        className="w-full h-full bg-no-repeat overflow-hidden relative"
        style={{
          borderRadius: radius,
          border: highlight
            ? '2px solid #fde047'
            : isBack
              ? '1px solid rgba(251,191,36,0.4)'
              : '1px solid rgba(255,255,255,0.25)',
          ...background,
        }}
      >
        {/* Se for carta virada, renderiza padrão elegante com selo VIP caso a imagem demore */}
        {isBack && (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-neutral-900 to-black flex items-center justify-center p-1">
            <div
              className="w-full h-full rounded border border-amber-500/40 flex flex-col items-center justify-center relative overflow-hidden"
              style={{
                backgroundImage: 'radial-gradient(circle at center, rgba(251,191,36,0.15) 0%, transparent 70%)',
              }}
            >
              <div className="text-amber-400 font-black text-[9px] tracking-widest leading-none drop-shadow">
                VIP
              </div>
              <div className="text-amber-500/70 text-[7px] font-bold tracking-tighter">
                BRAZUCA BET
              </div>
            </div>
          </div>
        )}

        {/* Brilho de luxo em cartas destacadas / vencedoras */}
        {highlight && (
          <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 via-transparent to-amber-300/30 pointer-events-none" />
        )}
      </div>

      {/* Brilho especular sutil na borda superior */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
        style={{ borderRadius: radius }}
      />
    </div>
  );
};

export const CardBack: React.FC<{ width?: number; className?: string; tilt?: number }> = ({
  width = 48,
  className = '',
  tilt = 0,
}) => <PlayingCard code={BACK_CODE} width={width} className={className} tilt={tilt} />;

export default PlayingCard;
