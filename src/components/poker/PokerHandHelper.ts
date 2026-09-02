import {
  type CardCode,
  evaluateHand,
  type HandValue,
  cardRank,
  cardSuit,
  HAND_NAMES,
} from '@/games/poker/engine';

export interface HandAnalysis {
  hand: HandValue | null;
  name: string;
  category: number; // 0 = Carta alta, 8 = Straight Flush
  strengthPct: number; // 0..100
  tierLabel: string;
  tierColor: string;
  bestCards: Set<CardCode>;
  drawHints: string[];
}

export function analyzeCurrentHand(
  holeCards: CardCode[],
  communityCards: CardCode[],
): HandAnalysis {
  const allCards = [...holeCards, ...communityCards].filter(
    (c) => c && c !== 'back',
  );

  if (allCards.length < 2) {
    return {
      hand: null,
      name: 'Aguardando cartas',
      category: 0,
      strengthPct: 0,
      tierLabel: 'Iniciando',
      tierColor: 'text-muted-foreground',
      bestCards: new Set(),
      drawHints: [],
    };
  }

  // Se tiver 5 ou mais cartas, usa o motor oficial
  if (allCards.length >= 5) {
    const evaluated = evaluateHand(allCards);
    const bestSet = new Set(evaluated.cards);

    let strength = 20;
    let tierLabel = 'Carta Alta';
    let tierColor = 'text-slate-300';

    switch (evaluated.category) {
      case 8: // Straight Flush
      case 7: // Quadra
        strength = 99;
        tierLabel = 'MONSTRO 💎💎💎';
        tierColor = 'text-amber-300 font-black animate-pulse';
        break;
      case 6: // Full House
        strength = 94;
        tierLabel = 'MONSTRO 💎';
        tierColor = 'text-amber-400 font-black';
        break;
      case 5: // Flush
        strength = 88;
        tierLabel = 'MUITO FORTE 🔥';
        tierColor = 'text-emerald-400 font-bold';
        break;
      case 4: // Straight
        strength = 80;
        tierLabel = 'FORTE ⚡';
        tierColor = 'text-emerald-300 font-bold';
        break;
      case 3: // Trinca
        strength = 68;
        tierLabel = 'MÃO FORTE ⚔️';
        tierColor = 'text-sky-300 font-semibold';
        break;
      case 2: // Dois Pares
        strength = 52;
        tierLabel = 'MÃO MÉDIA 🎯';
        tierColor = 'text-cyan-300 font-semibold';
        break;
      case 1: // Par
        strength = 35;
        tierLabel = 'PAR FORMADO 🛡️';
        tierColor = 'text-yellow-200';
        break;
      default:
        strength = 18;
        tierLabel = 'CARTA ALTA 🎲';
        tierColor = 'text-slate-300';
    }

    // Identificar draws no flop e turn
    const drawHints: string[] = [];
    if (communityCards.length < 5) {
      const suitsCount: Record<string, number> = {};
      allCards.forEach((c) => {
        const s = cardSuit(c);
        suitsCount[s] = (suitsCount[s] || 0) + 1;
      });
      for (const [, count] of Object.entries(suitsCount)) {
        if (count === 4) {
          drawHints.push('Flush Draw (9 outs) 💧');
        }
      }
    }

    return {
      hand: evaluated,
      name: evaluated.name,
      category: evaluated.category,
      strengthPct: strength,
      tierLabel,
      tierColor,
      bestCards: bestSet,
      drawHints,
    };
  }

  // Apenas 2 cartas (Pré-Flop)
  if (holeCards.length === 2) {
    const r1 = cardRank(holeCards[0]);
    const r2 = cardRank(holeCards[1]);
    const isPair = r1 === r2;
    const isSuited = cardSuit(holeCards[0]) === cardSuit(holeCards[1]);
    const isHigh = r1 >= 13 || r2 >= 13;

    let strength = 25;
    let name = 'Mão Inicial';
    let tierLabel = 'Mão Padrão';
    let tierColor = 'text-slate-300';

    if (isPair) {
      if (r1 >= 13) {
        strength = 92;
        name = 'Par Premium (AA / KK)';
        tierLabel = 'MONSTRO PRÉ-FLOP 💎';
        tierColor = 'text-amber-300 font-black';
      } else if (r1 >= 10) {
        strength = 75;
        name = 'Par Alto (QQ / JJ / TT)';
        tierLabel = 'MUITO FORTE 🔥';
        tierColor = 'text-amber-400 font-bold';
      } else {
        strength = 50;
        name = 'Par Inicial';
        tierLabel = 'PAR DE BOLSO 🛡️';
        tierColor = 'text-sky-300 font-semibold';
      }
    } else if (isHigh && isSuited) {
      strength = 68;
      name = 'Broadways do mesmo naipe (Suited)';
      tierLabel = 'PREMIUM SUITED 👑';
      tierColor = 'text-emerald-300 font-bold';
    } else if (isHigh) {
      strength = 45;
      name = 'Cartas Altas';
      tierLabel = 'CARTAS ALTAS ⚔️';
      tierColor = 'text-sky-200';
    }

    return {
      hand: null,
      name,
      category: isPair ? 1 : 0,
      strengthPct: strength,
      tierLabel,
      tierColor,
      bestCards: new Set(holeCards),
      drawHints: isSuited ? ['Naipe casado (Suited)'] : [],
    };
  }

  return {
    hand: null,
    name: 'Mão',
    category: 0,
    strengthPct: 10,
    tierLabel: '',
    tierColor: 'text-slate-400',
    bestCards: new Set(),
    drawHints: [],
  };
}
