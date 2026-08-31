/**
 * IA dos bots (usada apenas para preencher cadeiras vazias — "modo treino").
 * Nada aqui é injetado no Aviator: lá só existem jogadores reais.
 *
 * A IA é heurística: força da mão (Chen no pré-flop, categoria feita + draws no
 * post-flop) comparada com as odds do pote, com um pouco de aleatoriedade.
 */
import { evaluateHand, legalActions, cardRank, cardSuit, type ActionType, type CardCode, type PokerState } from './engine';

function preflopStrength(hole: CardCode[]): number {
  if (hole.length !== 2) return 0.3;
  const [a, b] = hole.map(cardRank).sort((x, y) => y - x);
  const suited = cardSuit(hole[0]) === cardSuit(hole[1]);
  const pair = a === b;
  const high = Math.max(a, b);
  const low = Math.min(a, b);
  const gap = high - low;

  let s = 0.1;
  if (pair) s = 0.5 + (high - 2) * 0.035; // par: 22 fraco, AA forte
  else {
    s = (high - 2) * 0.03 + (low - 2) * 0.015;
    if (suited) s += 0.06;
    if (gap <= 1) s += 0.05;
    if (gap >= 5) s -= 0.04;
  }
  if (pair && high >= 10) s += 0.12;
  if (high === 14 && low === 13) s += 0.08; // AK
  return Math.max(0.05, Math.min(0.98, s));
}

function postflopStrength(hole: CardCode[], community: CardCode[]): number {
  const all = [...hole, ...community];
  const hand = evaluateHand(all);
  const cat = hand.category; // 0 alta .. 8 straight flush
  let s = 0.12 + cat * 0.1;
  // bônus para trinca/quadra cheia feita com a própria mão
  const hasPairInHand = cardRank(hole[0]) === cardRank(hole[1]);
  if (hasPairInHand && cat >= 3) s += 0.12;
  // draws: flush draw / straight draw
  const suits = all.map(cardSuit);
  const suitCount = suits.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x]: (acc[x] ?? 0) + 1 }), {});
  if (Math.max(...Object.values(suitCount)) === 4) s += 0.12;
  const ranks = [...new Set(all.map(cardRank))].sort((x, y) => x - y);
  let maxSeq = 1;
  let cur = 1;
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] - ranks[i - 1] === 1) cur += 1;
    else cur = 1;
    maxSeq = Math.max(maxSeq, cur);
  }
  if (maxSeq === 4) s += 0.1;
  if (maxSeq === 3 && community.length >= 3) s += 0.04;
  return Math.max(0.05, Math.min(0.98, s));
}

export interface BotDecision {
  action: ActionType;
  amount: number;
}

export function decideBot(state: PokerState, seatIndex: number): BotDecision {
  const seat = state.seats[seatIndex];
  const legal = legalActions(state, seatIndex);
  const community = state.community;
  const strength =
    community.length === 0 ? preflopStrength(seat.hole) : postflopStrength(seat.hole, community);

  const pot = state.seats.reduce((acc, s) => acc + s.committed, 0) + state.seats.reduce((acc, s) => acc + s.bet, 0);
  const toCall = legal.callAmount;
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
  const noise = (Math.random() - 0.5) * 0.14;
  const eff = strength + noise;

  if (!legal.canCall && !legal.canRaise) return { action: 'check', amount: 0 };

  if (eff > 0.72 && legal.canRaise && Math.random() < 0.75) {
    const target = Math.min(
      legal.maxRaiseTo,
      Math.max(legal.minRaiseTo, Math.round(state.currentBet + pot * (0.5 + Math.random() * 0.5))),
    );
    return { action: 'raise', amount: target };
  }

  if (toCall === 0) return { action: 'check', amount: 0 };

  if (eff >= potOdds + 0.02) return { action: 'call', amount: 0 };
  if (toCall <= state.bigBlind && eff > 0.35) return { action: 'call', amount: 0 };
  if (Math.random() < 0.08 && legal.canRaise) return { action: 'raise', amount: legal.minRaiseTo }; // blefe
  return { action: 'fold', amount: 0 };
}
