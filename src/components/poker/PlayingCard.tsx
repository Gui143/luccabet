/**
 * Carta de baralho renderizada com SPRITE ATLAS (um único PNG de 52 cartas).
 *
 * Por que atlas? Um request só, decodificado uma vez pelo navegador e desenhado
 * por GPU via background-position — muito mais rápido na web do que 52 <img>.
 * Fallback: se o atlas não carregar, usa o PNG individual (/cards/ah.png).
 */
import React from 'react';
import { BACK_CODE, type CardCode, isFaceDown } from '@/games/poker/engine';

const ATLAS = '/cards/atlas.png';
const FRAME_W = 200; // largura de uma carta no atlas
const FRAME_H = 280;
const COLS = 13;
const ROWS = 4;

/** Ordem das linhas/colunas do atlas (igual ao tools/generate-cards.mjs) */
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
  /** destaque (cartas que compõem a mão vencedora) */
  highlight?: boolean;
  dimmed?: boolean;
  style?: React.CSSProperties;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  code,
  width = 64,
  className = '',
  faceDown = false,
  highlight = false,
  dimmed = false,
  style,
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
    const col = RANK_COL[code![0]] ?? 0;
    const row = SUIT_ROW[code![1]] ?? 0;
    const scale = width / FRAME_W;
    return {
      backgroundImage: `url(${ATLAS}), url('/cards/${code}.png')`,
      backgroundSize: `${COLS * width}px ${ROWS * height}px, ${width}px ${height}px`,
      backgroundPosition: `${-col * width}px ${-row * height}px, center`,
      imageRendering: 'auto' as const,
      // guarda a escala para depuração
      ['--card-scale' as string]: String(scale),
    };
  }, [code, isBack, width, height]);

  return (
    <div
      className={`relative shrink-0 rounded-[${Math.max(3, Math.round(width / 14))}px] bg-no-repeat shadow-md ${
        highlight ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-emerald-900' : ''
      } ${dimmed ? 'opacity-45 grayscale' : ''} ${className}`}
      style={{
        width,
        height,
        borderRadius: Math.max(4, Math.round(width / 12)),
        boxShadow: highlight
          ? '0 0 12px rgba(252,211,77,0.85), 0 4px 10px rgba(0,0,0,0.5)'
          : '0 3px 8px rgba(0,0,0,0.45)',
        ...background,
        ...style,
      }}
      title={!isBack && code ? code : undefined}
      aria-label={isBack ? 'carta virada' : `carta ${code}`}
    />
  );
};

/** Verso da carta (usado nos assentos dos adversários) */
export const CardBack: React.FC<{ width?: number; className?: string }> = ({ width = 48, className = '' }) => (
  <PlayingCard code={BACK_CODE} width={width} className={className} />
);

export default PlayingCard;
