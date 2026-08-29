export type Suit = '♠' | '♥' | '♦' | '♣';
export type CardValue = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  value: CardValue;
  hidden?: boolean;
}

export type HandRankType = 
  | 'Royal Flush'
  | 'Straight Flush'
  | 'Four of a Kind'
  | 'Full House'
  | 'Flush'
  | 'Straight'
  | 'Three of a Kind'
  | 'Two Pair'
  | 'One Pair'
  | 'High Card';

export interface EvaluatedHand {
  rank: HandRankType;
  score: number;
  name: string;
  cards: Card[];
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  chips: number;
  bet: number;
  hand: Card[];
  folded: boolean;
  allIn: boolean;
  actedInRound: boolean;
  statusText?: string;
  bestHand?: EvaluatedHand;
}

export type GamePhase = 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';

const VALUES_MAP: Record<CardValue, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export function createDeck(): Card[] {
  const suits: Suit[] = ['♠', '♥', '♦', '♣'];
  const values: CardValue[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function evaluate5Cards(cards: Card[]): EvaluatedHand {
  const sorted = [...cards].sort((a, b) => VALUES_MAP[b.value] - VALUES_MAP[a.value]);
  const values = sorted.map(c => VALUES_MAP[c.value]);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  let isStraight = false;
  let straightHigh = 0;
  const uniqueVals = Array.from(new Set(values));
  if (uniqueVals.length >= 5) {
    for (let i = 0; i <= uniqueVals.length - 5; i++) {
      if (
        uniqueVals[i] - uniqueVals[i + 1] === 1 &&
        uniqueVals[i + 1] - uniqueVals[i + 2] === 1 &&
        uniqueVals[i + 2] - uniqueVals[i + 3] === 1 &&
        uniqueVals[i + 3] - uniqueVals[i + 4] === 1
      ) {
        isStraight = true;
        straightHigh = uniqueVals[i];
        break;
      }
    }
    if (!isStraight && uniqueVals.includes(14) && uniqueVals.includes(5) && uniqueVals.includes(4) && uniqueVals.includes(3) && uniqueVals.includes(2)) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  const freq: Record<number, number> = {};
  for (const v of values) {
    freq[v] = (freq[v] || 0) + 1;
  }
  const freqEntries = Object.entries(freq).map(([v, count]) => ({ val: Number(v), count })).sort((a, b) => b.count - a.count || b.val - a.val);

  const isFour = freqEntries[0].count === 4;
  const isFullHouse = freqEntries[0].count === 3 && freqEntries[1]?.count >= 2;
  const isThree = freqEntries[0].count === 3;
  const isTwoPair = freqEntries[0].count === 2 && freqEntries[1]?.count === 2;
  const isOnePair = freqEntries[0].count === 2;

  if (isFlush && isStraight) {
    if (straightHigh === 14 && uniqueVals.includes(13)) {
      return { rank: 'Royal Flush', score: 10000000, name: 'Royal Flush', cards: sorted };
    }
    return { rank: 'Straight Flush', score: 9000000 + straightHigh, name: `Straight Flush (${straightHigh} high)`, cards: sorted };
  }
  if (isFour) {
    const kicker = freqEntries.find(e => e.count === 1)?.val || 0;
    return { rank: 'Four of a Kind', score: 8000000 + freqEntries[0].val * 100 + kicker, name: `Quadra de ${freqEntries[0].val}`, cards: sorted };
  }
  if (isFullHouse) {
    return { rank: 'Full House', score: 7000000 + freqEntries[0].val * 100 + freqEntries[1].val, name: `Full House (${freqEntries[0].val} sobre ${freqEntries[1].val})`, cards: sorted };
  }
  if (isFlush) {
    let score = 6000000;
    values.forEach((v, idx) => score += v * Math.pow(15, 4 - idx));
    return { rank: 'Flush', score, name: 'Flush', cards: sorted };
  }
  if (isStraight) {
    return { rank: 'Straight', score: 5000000 + straightHigh, name: `Sequência (${straightHigh} high)`, cards: sorted };
  }
  if (isThree) {
    const kickers = freqEntries.filter(e => e.count === 1).map(e => e.val);
    let score = 4000000 + freqEntries[0].val * 10000 + (kickers[0] || 0) * 100 + (kickers[1] || 0);
    return { rank: 'Three of a Kind', score, name: `Trinca de ${freqEntries[0].val}`, cards: sorted };
  }
  if (isTwoPair) {
    const kicker = freqEntries.find(e => e.count === 1)?.val || 0;
    let score = 3000000 + freqEntries[0].val * 10000 + freqEntries[1].val * 100 + kicker;
    return { rank: 'Two Pair', score, name: `Dois Pares (${freqEntries[0].val} e ${freqEntries[1].val})`, cards: sorted };
  }
  if (isOnePair) {
    const kickers = freqEntries.filter(e => e.count === 1).map(e => e.val).sort((a, b) => b - a);
    let score = 2000000 + freqEntries[0].val * 10000 + kickers[0] * 1000 + kickers[1] * 100 + kickers[2];
    return { rank: 'One Pair', score, name: `Par de ${freqEntries[0].val}`, cards: sorted };
  }

  let score = 1000000;
  values.forEach((v, idx) => score += v * Math.pow(15, 4 - idx));
  return { rank: 'High Card', score, name: `Carta Alta (${values[0]})`, cards: sorted };
}

export function evaluate7Cards(allCards: Card[]): EvaluatedHand {
  let best: EvaluatedHand | null = null;
  const combos = combinations(allCards, 5);
  for (const combo of combos) {
    const evalResult = evaluate5Cards(combo);
    if (!best || evalResult.score > best.score) {
      best = evalResult;
    }
  }
  return best || evaluate5Cards(allCards.slice(0, 5));
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = combinations(tail, k - 1).map(c => [head, ...c]);
  const withoutHead = combinations(tail, k);
  return [...withHead, ...withoutHead];
}
