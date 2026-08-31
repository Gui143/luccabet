/**
 * Motor de Poker Texas Hold'em — puro, determinístico e sem dependências.
 *
 * Motivo da reescrita: a versão antiga (src/games/pokerEngine.ts) guardava o
 * estado em dezenas de `useState` + `setTimeout` com closures obsoletas, o que
 * travava a mesa em "Pré-flop: Distribuição de cartas" (o round nunca era
 * considerado completo e o flop nunca era virado) enquanto o saldo já havia
 * sido debitado.
 *
 * Aqui o estado é um único objeto imutável e existe uma função `tick()` idempotente:
 * ela sempre faz a mesa avançar (vira o flop/turn/river, resolve all-ins,
 * faz o showdown e paga os potes) independente de quem a chame e quantas vezes.
 * Assim é impossível a mesa "travar".
 *
 * Este arquivo é compartilhado entre:
 *   - o app web            (import direto)
 *   - o servidor local     (server/index.ts, via tsx)
 *   - a edge function      (supabase/functions/_shared/poker-engine.ts, cópia
 *                           gerada por `npm run sync:engine`)
 */

// --------------------------------------------------------------------- cartas
export type Suit = 's' | 'h' | 'd' | 'c'; // s=espadas h=copas d=ouros c=paus
export type CardCode = string; // 'as', 'th', '2c'  (mesmo nome do asset public/cards/<code>.png)

export const RANK_KEYS = ['2', '3', '4', '5', '6', '7', '8', '9', 't', 'j', 'q', 'k', 'a'] as const;
export const SUIT_KEYS: Suit[] = ['s', 'h', 'd', 'c'];

const RANK_VALUE: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  t: 10, j: 11, q: 12, k: 13, a: 14,
};

export const RANK_LABEL: Record<string, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  t: '10', j: 'J', q: 'Q', k: 'K', a: 'A',
};

export const cardRank = (c: CardCode): number => RANK_VALUE[c[0]] ?? 0;
export const cardSuit = (c: CardCode): Suit => (c[1] as Suit) ?? 's';
export const cardLabel = (c: CardCode): string => `${RANK_LABEL[c[0]] ?? '?'}`;
export const cardAsset = (c: CardCode): string => `/cards/${c}.png`;
/** carta virada para baixo (usa o mesmo sprite do verso) */
export const BACK_CODE: CardCode = 'back';
export const isFaceDown = (c: CardCode | null | undefined): boolean => !c || c === BACK_CODE;

export function makeDeck(): CardCode[] {
  const deck: CardCode[] = [];
  for (const s of SUIT_KEYS) for (const r of RANK_KEYS) deck.push(`${r}${s}`);
  return deck;
}

/** PRNG determinístico (mulberry32) — permite replay/auditoria de uma mão. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------- avaliação de mão
export const HAND_NAMES = [
  'Carta alta',
  'Par',
  'Dois pares',
  'Trinca',
  'Sequência',
  'Flush',
  'Full House',
  'Quadra',
  'Straight Flush',
] as const;

export interface HandValue {
  /** número comparável: quanto maior, melhor */
  score: number;
  category: number;
  name: string;
  cards: CardCode[]; // melhores 5 cartas
}

const CAT = {
  HIGH: 0, PAIR: 1, TWO_PAIR: 2, TRIPS: 3, STRAIGHT: 4,
  FLUSH: 5, FULL_HOUSE: 6, QUADS: 7, STRAIGHT_FLUSH: 8,
};

function eval5(cards: CardCode[]): HandValue {
  const ranks = cards.map(cardRank).sort((a, b) => b - a);
  const suits = cards.map(cardSuit);
  const isFlush = suits.every((s) => s === suits[0]);

  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (unique.length >= 5) {
    for (let i = 0; i <= unique.length - 5; i++) {
      if (
        unique[i] - unique[i + 1] === 1 &&
        unique[i + 1] - unique[i + 2] === 1 &&
        unique[i + 2] - unique[i + 3] === 1 &&
        unique[i + 3] - unique[i + 4] === 1
      ) {
        straightHigh = unique[i];
        break;
      }
    }
    // "wheel": A-2-3-4-5 (5 alta)
    if (!straightHigh && unique.includes(14) && unique.includes(5) && unique.includes(4) && unique.includes(3) && unique.includes(2)) {
      straightHigh = 5;
    }
  }

  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const ordered = groups.flatMap(([r, c]) => Array.from({ length: c }, () => r));

  const enc = (...vals: number[]) => vals.reduce((acc, v, i) => acc + (v & 0xf) * Math.pow(16, 4 - i), 0);
  const score = (cat: number, ...vals: number[]) => (cat << 20) + enc(...vals);

  const build = (cat: number, ...vals: number[]): HandValue => ({
    score: score(cat, ...vals),
    category: cat,
    name: HAND_NAMES[cat],
    cards: [...cards].sort((a, b) => cardRank(b) - cardRank(a)),
  });

  if (isFlush && straightHigh) return build(straightHigh === 14 ? CAT.STRAIGHT_FLUSH : CAT.STRAIGHT_FLUSH, straightHigh);
  if (groups[0][1] === 4) return build(CAT.QUADS, groups[0][0], ordered[4]);
  if (groups[0][1] === 3 && groups[1]?.[1] >= 2) return build(CAT.FULL_HOUSE, groups[0][0], groups[1][0]);
  if (isFlush) return build(CAT.FLUSH, ...ordered.slice(0, 5));
  if (straightHigh) return build(CAT.STRAIGHT, straightHigh);
  if (groups[0][1] === 3) return build(CAT.TRIPS, groups[0][0], ordered[3], ordered[4]);
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) return build(CAT.TWO_PAIR, groups[0][0], groups[1][0], ordered[4]);
  if (groups[0][1] === 2) return build(CAT.PAIR, groups[0][0], ordered[2], ordered[3], ordered[4]);
  return build(CAT.HIGH, ...ordered.slice(0, 5));
}

/** Avalia a melhor mão de 5 entre 5..7 cartas. */
export function evaluateHand(cards: CardCode[]): HandValue {
  if (cards.length === 5) return eval5(cards);
  let best: HandValue | null = null;
  const n = cards.length;
  for (let i = 0; i < n - 4; i++) {
    for (let j = i + 1; j < n - 3; j++) {
      for (let k = j + 1; k < n - 2; k++) {
        for (let l = k + 1; l < n - 1; l++) {
          for (let m = l + 1; m < n; m++) {
            const v = eval5([cards[i], cards[j], cards[k], cards[l], cards[m]]);
            if (!best || v.score > best.score) best = v;
          }
        }
      }
    }
  }
  return best ?? eval5(cards.slice(0, 5));
}

// ------------------------------------------------------------------- estados
export type Phase = 'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';
export type SeatStatus = 'empty' | 'active' | 'folded' | 'allin' | 'waiting' | 'sitting-out';
export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export interface Seat {
  index: number;
  playerId: string | null;
  name: string;
  avatarSeed: number;
  chips: number;
  bet: number; // aposta da rodada atual
  committed: number; // total comprometido na mão (para potes laterais)
  status: SeatStatus;
  hole: CardCode[];
  acted: boolean;
  lastAction: string | null;
  isBot: boolean;
  connected: boolean;
  joinedAt: number;
  seatChipsIn: number; // buy-in original (para estatística)
  bestHand?: HandValue | null;
  won?: number;
}

export interface Pot {
  amount: number;
  eligible: number[]; // índices dos assentos elegíveis
  label: string;
}

export interface WinnerInfo {
  seat: number;
  playerId: string;
  name: string;
  amount: number;
  potLabel: string;
  handName: string;
  handCards: CardCode[];
}

export interface PokerState {
  tableId: string;
  tableName: string;
  handNo: number;
  phase: Phase;
  deck: CardCode[];
  community: CardCode[];
  seats: Seat[];
  dealerSeat: number;
  turnSeat: number | null;
  currentBet: number;
  minRaise: number;
  lastRaiseSize: number;
  pots: Pot[];
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxSeats: number;
  turnSeconds: number;
  actionDeadline: number | null;
  handStartedAt: number | null;
  nextHandAt: number | null;
  seed: number;
  revealAll: boolean;
  winners: WinnerInfo[];
  log: string[];
  updatedAt: number;
}

export interface TableConfig {
  tableId?: string;
  tableName?: string;
  maxSeats?: number;
  smallBlind?: number;
  bigBlind?: number;
  minBuyIn?: number;
  maxBuyIn?: number;
  turnSeconds?: number;
}

const emptySeat = (index: number): Seat => ({
  index,
  playerId: null,
  name: '',
  avatarSeed: index,
  chips: 0,
  bet: 0,
  committed: 0,
  status: 'empty',
  hole: [],
  acted: false,
  lastAction: null,
  isBot: false,
  connected: false,
  joinedAt: 0,
  seatChipsIn: 0,
  bestHand: null,
  won: 0,
});

export function createState(cfg: TableConfig = {}): PokerState {
  const maxSeats = cfg.maxSeats ?? 6;
  return {
    tableId: cfg.tableId ?? 'texas-1',
    tableName: cfg.tableName ?? `Texas Hold'em R$ ${cfg.smallBlind ?? 2}/${cfg.bigBlind ?? 5}`,
    handNo: 0,
    phase: 'idle',
    deck: [],
    community: [],
    seats: Array.from({ length: maxSeats }, (_, i) => emptySeat(i)),
    dealerSeat: -1,
    turnSeat: null,
    currentBet: 0,
    minRaise: cfg.bigBlind ?? 5,
    lastRaiseSize: cfg.bigBlind ?? 5,
    pots: [],
    smallBlind: cfg.smallBlind ?? 2,
    bigBlind: cfg.bigBlind ?? 5,
    minBuyIn: cfg.minBuyIn ?? 100,
    maxBuyIn: cfg.maxBuyIn ?? 500,
    maxSeats,
    turnSeconds: cfg.turnSeconds ?? 30,
    actionDeadline: null,
    handStartedAt: null,
    nextHandAt: null,
    seed: 1,
    revealAll: false,
    winners: [],
    log: [],
    updatedAt: 0,
  };
}

export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// -------------------------------------------------------------- assentos
export function findSeatByPlayer(state: PokerState, playerId: string): number {
  return state.seats.findIndex((s) => s.playerId === playerId);
}

export function sitDown(
  state: PokerState,
  seatIndex: number,
  player: { playerId: string; name: string; buyIn: number; isBot?: boolean },
): { state: PokerState; error?: string } {
  const s = clone(state);
  const seat = s.seats[seatIndex];
  if (!seat) return { state, error: 'Assento inexistente' };
  if (seat.playerId && seat.playerId !== player.playerId) return { state, error: 'Assento ocupado' };
  if (player.buyIn < s.minBuyIn) return { state, error: `Buy-in mínimo é R$ ${s.minBuyIn.toFixed(2)}` };
  if (player.buyIn > s.maxBuyIn) return { state, error: `Buy-in máximo é R$ ${s.maxBuyIn.toFixed(2)}` };

  const existing = findSeatByPlayer(s, player.playerId);
  if (existing >= 0 && existing !== seatIndex) return { state, error: 'Você já está sentado em outra cadeira' };

  if (seat.playerId === player.playerId) {
    // top-up / rebuy: volta a poder jogar (agora ou na próxima mão)
    seat.chips += player.buyIn;
    seat.seatChipsIn += player.buyIn;
    const handRunning = s.phase !== 'idle' && s.phase !== 'finished';
    if (seat.status === 'sitting-out' || seat.status === 'allin' || seat.status === 'empty' || seat.status === 'folded') {
      seat.status = handRunning ? 'waiting' : 'active';
    }
    if (seat.hole.length === 0 && handRunning) seat.status = 'waiting';
    seat.connected = true;
    seat.isBot = !!player.isBot;
    s.log.unshift(`${player.name} fez rebuy de R$ ${player.buyIn.toFixed(2)}`);
    s.log = s.log.slice(0, 40);
    return { state: s };
  }

  seat.playerId = player.playerId;
  seat.name = player.name;
  seat.avatarSeed = Math.floor(Math.random() * 9999);
  seat.chips = player.buyIn;
  seat.seatChipsIn = player.buyIn;
  seat.bet = 0;
  seat.committed = 0;
  seat.hole = [];
  seat.acted = false;
  seat.lastAction = null;
  seat.status = s.phase === 'idle' || s.phase === 'finished' ? 'active' : 'waiting';
  seat.isBot = !!player.isBot;
  seat.connected = true;
  seat.joinedAt = Date.now();
  seat.bestHand = null;
  seat.won = 0;
  s.log.unshift(`${player.name} sentou na cadeira ${seatIndex + 1} com R$ ${player.buyIn.toFixed(2)}`);
  s.log = s.log.slice(0, 40);
  return { state: s };
}

/** Remove o jogador da mesa e devolve as fichas (inclui o que está na mesa). */
export function standUp(state: PokerState, playerId: string): { state: PokerState; returned: number } {
  const s = clone(state);
  const idx = findSeatByPlayer(s, playerId);
  if (idx < 0) return { state, returned: 0 };
  const seat = s.seats[idx];
  const returned = seat.chips;
  s.log.unshift(`${seat.name} saiu da mesa com R$ ${returned.toFixed(2)}`);
  s.log = s.log.slice(0, 40);
  s.seats[idx] = emptySeat(idx);
  if (s.turnSeat === idx) s.turnSeat = null;
  if (s.dealerSeat === idx) s.dealerSeat = -1;
  return { state: s, returned };
}

export function setConnected(state: PokerState, playerId: string, connected: boolean): PokerState {
  const s = clone(state);
  const idx = findSeatByPlayer(s, playerId);
  if (idx >= 0) s.seats[idx].connected = connected;
  return s;
}

// ------------------------------------------------------------- fluxo da mão
const activeSeats = (s: PokerState) => s.seats.filter((x) => x.playerId && x.chips > 0);
const inHandSeats = (s: PokerState) => s.seats.filter((x) => x.hole.length === 2 && x.status !== 'folded');
const canActSeats = (s: PokerState) => inHandSeats(s).filter((x) => x.status === 'active');

function nextSeatFrom(s: PokerState, from: number, predicate: (seat: Seat) => boolean): number | null {
  for (let i = 1; i <= s.maxSeats; i++) {
    const idx = (from + i) % s.maxSeats;
    const seat = s.seats[idx];
    if (seat && predicate(seat)) return idx;
  }
  return null;
}

/**
 * Jogadores aptos a começar a próxima mão: sentados e com fichas.
 * `status` da mão anterior (folded/allin) é irrelevante — `startHand` limpa tudo.
 * Só quem pediu para sair da mesa (`sitting-out`) fica de fora.
 */
function readySeats(s: PokerState): Seat[] {
  return s.seats.filter((x) => x.playerId && x.chips > 0 && x.status !== 'sitting-out');
}

export function startHand(state: PokerState, now = Date.now(), force = false): PokerState {
  // proteção: nunca reiniciar uma mão em andamento (isso comeria as cegas já apostadas)
  if (!force && state.phase !== 'idle' && state.phase !== 'finished') return state;
  const s = clone(state);
  const ready = readySeats(s);
  if (ready.length < 2) {
    s.phase = 'idle';
    s.turnSeat = null;
    s.actionDeadline = null;
    s.nextHandAt = null;
    return s;
  }

  s.handNo += 1;
  s.seed = (s.seed * 1664525 + 1013904223) >>> 0;
  const rand = mulberry32(s.seed ^ (s.handNo * 2654435761));
  s.seats = s.seats.map((seat) => ({
    ...seat,
    hole: [],
    bet: 0,
    committed: 0,
    acted: false,
    lastAction: null,
    bestHand: null,
    won: 0,
    status: seat.playerId && seat.chips > 0 ? 'active' : seat.playerId ? 'sitting-out' : 'empty',
  }));

  // botão do dealer
  const order = s.seats.map((x) => x.index);
  let dealer = s.dealerSeat;
  for (let i = 0; i < s.maxSeats; i++) {
    const cand = order[(order.indexOf(dealer) + 1 + i) % s.maxSeats] ?? order[i];
    const seat = s.seats[cand];
    if (seat && seat.playerId && seat.chips > 0) {
      dealer = cand;
      break;
    }
  }
  s.dealerSeat = dealer;

  const players = s.seats.filter((x) => x.status === 'active');
  const headsUp = players.length === 2;
  const sbSeat = headsUp ? dealer : nextSeatFrom(s, dealer, (x) => x.status === 'active');
  const bbSeat = sbSeat === null ? null : nextSeatFrom(s, sbSeat, (x) => x.status === 'active' && x.index !== sbSeat);

  // distribui 2 cartas
  const deck = shuffle(makeDeck(), rand);
  let cursor = 0;
  for (const seat of players) seat.hole = [deck[cursor++], deck[cursor++]];

  // blinds
  s.pots = [];
  let pot = 0;
  if (sbSeat !== null) {
    const sb = s.seats[sbSeat];
    const amt = Math.min(sb.chips, s.smallBlind);
    sb.chips -= amt;
    sb.bet = amt;
    sb.committed = amt;
    sb.lastAction = 'Small blind';
    pot += amt;
  }
  if (bbSeat !== null) {
    const bb = s.seats[bbSeat];
    const amt = Math.min(bb.chips, s.bigBlind);
    bb.chips -= amt;
    bb.bet = amt;
    bb.committed = amt;
    bb.lastAction = 'Big blind';
    pot += amt;
    if (bb.chips === 0) bb.status = 'allin';
  }
  if (sbSeat !== null && s.seats[sbSeat].chips === 0) s.seats[sbSeat].status = 'allin';

  s.deck = deck.slice(cursor);
  s.community = [];
  s.phase = 'preflop';
  s.currentBet = s.bigBlind;
  s.minRaise = s.bigBlind;
  s.lastRaiseSize = s.bigBlind;
  s.pots = [{ amount: pot, eligible: players.map((p) => p.index), label: 'Pote' }];
  s.winners = [];
  s.revealAll = false;
  s.handStartedAt = now;
  s.nextHandAt = null;
  s.updatedAt = now;

  const firstActor = headsUp ? dealer : bbSeat !== null ? nextSeatFrom(s, bbSeat, (x) => x.status === 'active') : null;
  s.turnSeat = firstActor;
  s.actionDeadline = firstActor === null ? null : now + s.turnSeconds * 1000;
  s.log.unshift(`Mão #${s.handNo}: ${players.length} jogadores • blinds R$ ${s.smallBlind}/${s.bigBlind}`);
  s.log = s.log.slice(0, 40);
  return s;
}

// ----------------------------------------------------------------- ações
export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  callAmount: number;
  minRaiseTo: number;
  maxRaiseTo: number;
}

export function legalActions(state: PokerState, seatIndex: number): LegalActions {
  const seat = state.seats[seatIndex];
  const base: LegalActions = {
    canFold: false, canCheck: false, canCall: false, canRaise: false,
    callAmount: 0, minRaiseTo: state.minRaise, maxRaiseTo: 0,
  };
  if (!seat || seat.status !== 'active' || state.turnSeat !== seatIndex) return base;

  const toCall = Math.max(0, state.currentBet - seat.bet);
  const othersMax = state.seats
    .filter((s) => s.index !== seatIndex && s.hole.length === 2 && s.status !== 'folded')
    .reduce((acc, s) => Math.max(acc, s.chips + s.bet), 0);
  const maxTo = Math.min(seat.chips + seat.bet, othersMax);
  const minRaiseTo = Math.min(state.currentBet + state.lastRaiseSize, maxTo);

  return {
    canFold: true,
    canCheck: toCall === 0,
    canCall: toCall > 0,
    canRaise: maxTo > toCall,
    callAmount: toCall,
    minRaiseTo,
    maxRaiseTo: maxTo,
  };
}

export interface ActionResult {
  state: PokerState;
  ok: boolean;
  error?: string;
}

export function applyAction(
  state: PokerState,
  seatIndex: number,
  action: ActionType,
  amount = 0,
  now = Date.now(),
): ActionResult {
  const s = clone(state);
  if (s.phase === 'idle' || s.phase === 'finished' || s.phase === 'showdown') {
    return { state, ok: false, error: 'Não há mão em andamento' };
  }
  if (s.turnSeat !== seatIndex) return { state, ok: false, error: 'Não é a sua vez' };

  const seat = s.seats[seatIndex];
  if (!seat || seat.status !== 'active') return { state, ok: false, error: 'Você não pode agir agora' };

  const legal = legalActions(s, seatIndex);
  const toCall = Math.max(0, s.currentBet - seat.bet);

  if (action === 'fold') {
    seat.status = 'folded';
    seat.lastAction = 'Fold';
    seat.acted = true;
  } else if (action === 'check') {
    if (toCall > 0) return { state, ok: false, error: 'Não é possível dar mesa: há aposta para pagar' };
    seat.lastAction = 'Mesa';
    seat.acted = true;
  } else if (action === 'call') {
    if (toCall <= 0) return { state, ok: false, error: 'Nada para pagar — use mesa' };
    const pay = Math.min(seat.chips, toCall);
    seat.chips -= pay;
    seat.bet += pay;
    seat.committed += pay;
    seat.lastAction = pay >= toCall ? 'Pagar' : 'Pagar (all-in)';
    seat.acted = true;
    if (seat.chips === 0) seat.status = 'allin';
  } else if (action === 'raise' || action === 'allin') {
    const target = action === 'allin' ? seat.chips + seat.bet : Math.round(amount);
    const maxTo = legal.maxRaiseTo;
    const minTo = legal.minRaiseTo;
    if (action === 'raise' && (target < minTo || target > maxTo)) {
      return { state, ok: false, error: `Aumento inválido (mínimo R$ ${minTo.toFixed(2)}, máximo R$ ${maxTo.toFixed(2)})` };
    }
    const total = Math.min(target, seat.chips + seat.bet);
    const add = total - seat.bet;
    seat.chips -= add;
    seat.bet = total;
    seat.committed += add;
    seat.acted = true;
    const raiseSize = total - s.currentBet;
    if (total > s.currentBet) {
      s.lastRaiseSize = Math.max(raiseSize, s.bigBlind);
      s.currentBet = total;
      s.minRaise = total;
      // quem já tinha agido precisa agir de novo
      s.seats.forEach((other) => {
        if (other.index !== seatIndex && other.status === 'active' && other.hole.length === 2) other.acted = false;
      });
    }
    seat.lastAction = seat.chips === 0 ? 'All-in' : raiseSize > 0 ? 'Aumentar' : 'Pagar';
    if (seat.chips === 0) seat.status = 'allin';
  } else {
    return { state, ok: false, error: 'Ação desconhecida' };
  }

  s.updatedAt = now;
  s.log.unshift(`${seat.name}: ${seat.lastAction}${seat.bet ? ` (R$ ${seat.bet.toFixed(2)})` : ''}`);
  s.log = s.log.slice(0, 40);

  // próximo a agir (se a rodada não terminou)
  const next = isRoundComplete(s) ? null : nextSeatFrom(s, seatIndex, (x) => x.status === 'active' && x.hole.length === 2 && !x.acted);
  s.turnSeat = next;
  s.actionDeadline = next === null ? null : now + s.turnSeconds * 1000;

  return { state: s, ok: true };
}

/** Rodada de apostas encerrada? */
export function isRoundComplete(s: PokerState): boolean {
  const contenders = inHandSeats(s);
  if (contenders.length <= 1) return true;
  const actors = canActSeats(s);
  if (actors.length === 0) return true; // todos all-in: corre o board
  if (actors.length === 1) {
    const p = actors[0];
    return p.acted && p.bet >= s.currentBet;
  }
  return actors.every((p) => p.acted && p.bet >= s.currentBet);
}

function resetRoundBets(s: PokerState) {
  s.seats.forEach((seat) => {
    seat.bet = 0;
    seat.acted = false;
    if (seat.status === 'active') seat.lastAction = null;
  });
  s.currentBet = 0;
  s.lastRaiseSize = s.bigBlind;
  s.minRaise = s.bigBlind;
}

function setTurnAfterDealer(s: PokerState, now: number) {
  const next = nextSeatFrom(s, s.dealerSeat, (x) => x.status === 'active' && x.hole.length === 2);
  s.turnSeat = next;
  s.actionDeadline = next === null ? null : now + s.turnSeconds * 1000;
}

// -------------------------------------------------------------- potes/pagamento
export function buildPots(s: PokerState): Pot[] {
  const contributors = s.seats.filter((x) => x.committed > 0);
  if (!contributors.length) return [];
  const levels = [...new Set(contributors.map((x) => x.committed))].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    const amount = contributors.reduce((acc, x) => acc + Math.max(0, Math.min(x.committed, level) - prev), 0);
    const eligible = s.seats
      .filter((x) => x.status !== 'folded' && x.hole.length === 2 && x.committed >= level)
      .map((x) => x.index);
    if (amount > 0) pots.push({ amount, eligible, label: pots.length === 0 ? 'Pote' : `Pote lateral ${pots.length}` });
    prev = level;
  }
  // potes órfãos (todos os elegíveis folded) vão para o pote principal
  if (pots.length > 1) {
    const main = pots[0];
    for (let i = pots.length - 1; i >= 1; i--) {
      if (pots[i].eligible.length === 0) {
        main.amount += pots[i].amount;
        pots.splice(i, 1);
      }
    }
  }
  return pots;
}

function awardPots(s: PokerState): WinnerInfo[] {
  const pots = buildPots(s);
  s.pots = pots;
  const winners: WinnerInfo[] = [];

  const evaluated = new Map<number, HandValue>();
  for (const seat of s.seats) {
    if (seat.status !== 'folded' && seat.hole.length === 2) {
      evaluated.set(seat.index, evaluateHand([...seat.hole, ...s.community]));
    }
  }

  for (const pot of pots) {
    const contenders = pot.eligible
      .map((i) => s.seats[i])
      .filter((seat) => seat && seat.status !== 'folded' && seat.hole.length === 2);

    if (contenders.length === 0) continue;
    let bestScore = -1;
    let potWinners: Seat[] = [];
    for (const seat of contenders) {
      const hv = evaluated.get(seat.index)!;
      seat.bestHand = hv;
      if (hv.score > bestScore) {
        bestScore = hv.score;
        potWinners = [seat];
      } else if (hv.score === bestScore) {
        potWinners.push(seat);
      }
    }

    const share = Math.floor(pot.amount / potWinners.length);
    let remainder = pot.amount - share * potWinners.length;
    for (const w of potWinners) {
      let amount = share;
      if (remainder > 0) {
        amount += 1;
        remainder -= 1;
      }
      w.chips += amount;
      w.won = (w.won ?? 0) + amount;
      winners.push({
        seat: w.index,
        playerId: w.playerId ?? '',
        name: w.name,
        amount,
        potLabel: pot.label,
        handName: w.bestHand?.name ?? '',
        handCards: w.bestHand?.cards ?? [],
      });
    }
  }
  return winners;
}

/** Termina a mão: único jogador vivo recebe o pote (sem showdown). */
function awardToLastPlayer(s: PokerState): WinnerInfo[] {
  const pots = buildPots(s);
  s.pots = pots;
  const alive = s.seats.filter((x) => x.status !== 'folded' && x.hole.length === 2);
  if (alive.length !== 1) return [];
  const winner = alive[0];
  const total = pots.reduce((acc, p) => acc + p.amount, 0);
  winner.chips += total;
  winner.won = (winner.won ?? 0) + total;
  return [
    {
      seat: winner.index,
      playerId: winner.playerId ?? '',
      name: winner.name,
      amount: total,
      potLabel: 'Pote',
      handName: 'Último jogador na mão',
      handCards: winner.hole,
    },
  ];
}

// ------------------------------------------------------------------- tick
/**
 * Avança o jogo o máximo possível.
 * Idempotente: pode ser chamado a qualquer momento (loop do servidor ou timer
 * do cliente) — se nada puder avançar, não faz nada.
 */
export function tick(state: PokerState, now = Date.now()): { state: PokerState; changed: boolean } {
  let s = clone(state);
  let changed = false;

  // proteção: nunca fique preso
  for (let guard = 0; guard < 12; guard++) {
    if (s.phase === 'idle') {
      if (readySeats(s).length >= 2 && (s.nextHandAt === null || now >= s.nextHandAt)) {
        s = startHand(s, now);
        changed = true;
        continue;
      }
      break;
    }

    // tempo esgotado para agir -> mesa se possível, senão fold
    if (s.actionDeadline !== null && now >= s.actionDeadline && s.turnSeat !== null) {
      const seat = s.seats[s.turnSeat];
      if (seat && seat.status === 'active') {
        const toCall = Math.max(0, s.currentBet - seat.bet);
        const res = applyAction(s, s.turnSeat, toCall === 0 ? 'check' : 'fold', 0, now);
        if (res.ok) {
          s = res.state;
          s.log.unshift(`${seat.name} estourou o tempo — ${toCall === 0 ? 'mesa' : 'fold automático'}`);
          s.log = s.log.slice(0, 40);
          changed = true;
          continue;
        }
      }
      s.actionDeadline = null;
      changed = true;
      continue;
    }

    // esperando jogador (só sai quando alguém age ou o tempo expira)
    if (s.turnSeat !== null && s.phase !== 'showdown' && s.phase !== 'finished') {
      const seat = s.seats[s.turnSeat];
      if (seat && seat.status !== 'active') {
        // jogador saiu/all-in: passa a vez
        const next = nextSeatFrom(s, s.turnSeat, (x) => x.status === 'active' && x.hole.length === 2 && !x.acted);
        s.turnSeat = next;
        s.actionDeadline = next === null ? null : now + s.turnSeconds * 1000;
        changed = true;
        continue;
      }
      break;
    }

    const contenders = inHandSeats(s);
    if (contenders.length <= 1 && s.phase !== 'finished' && s.phase !== 'showdown') {
      s.phase = 'showdown';
      s.revealAll = true;
      s.winners = awardToLastPlayer(s);
      s.turnSeat = null;
      s.actionDeadline = null;
      s.log.unshift(`${s.winners[0]?.name ?? 'Alguém'} levou o pote de R$ ${(s.winners[0]?.amount ?? 0).toFixed(2)}`);
      s.phase = 'finished';
      s.nextHandAt = now + 5000;
      s.updatedAt = now;
      changed = true;
      continue;
    }

    if (!isRoundComplete(s)) {
      // ninguém com a vez mas a rodada não acabou (ex.: todos all-in exceto um)
      const next = nextSeatFrom(s, s.turnSeat ?? s.dealerSeat, (x) => x.status === 'active' && x.hole.length === 2 && !x.acted);
      if (next !== null && s.turnSeat === null) {
        s.turnSeat = next;
        s.actionDeadline = now + s.turnSeconds * 1000;
        changed = true;
        continue;
      }
      break;
    }

    // rodada completa -> próxima street
    if (s.phase === 'preflop') {
      s.community = s.deck.slice(0, 3);
      s.deck = s.deck.slice(3);
      s.phase = 'flop';
    } else if (s.phase === 'flop') {
      s.community = [...s.community, s.deck[0]];
      s.deck = s.deck.slice(1);
      s.phase = 'turn';
    } else if (s.phase === 'turn') {
      s.community = [...s.community, s.deck[0]];
      s.deck = s.deck.slice(1);
      s.phase = 'river';
    } else if (s.phase === 'river' || s.phase === 'showdown') {
      s.phase = 'showdown';
      s.revealAll = true;
      s.turnSeat = null;
      s.actionDeadline = null;
      s.winners = awardPots(s);
      const names = [...new Set(s.winners.map((w) => w.name))].join(', ');
      s.log.unshift(`Showdown: ${names} levou R$ ${s.winners.reduce((a, w) => a + w.amount, 0).toFixed(2)}`);
      s.log = s.log.slice(0, 40);
      s.phase = 'finished';
      s.nextHandAt = now + 6000;
      s.updatedAt = now;
      changed = true;
      continue;
    } else {
      break;
    }

    resetRoundBets(s);
    setTurnAfterDealer(s, now);
    s.updatedAt = now;
    changed = true;
    continue;
  }

  if (s.phase === 'finished' && s.nextHandAt && now >= s.nextHandAt) {
    // limpa a mesa para a próxima mão
    const ready = readySeats(s);
    if (ready.length >= 2) {
      s = startHand(s, now);
      changed = true;
    } else {
      s.phase = 'idle';
      s.nextHandAt = null;
      changed = true;
    }
  }

  s.updatedAt = s.updatedAt || now;
  return { state: s, changed };
}

// --------------------------------------------------------- visão por jogador
export interface PublicSeat extends Omit<Seat, 'hole'> {
  hole: CardCode[]; // preenchido só para o próprio jogador ou no showdown
}

export interface PublicState extends Omit<PokerState, 'seats' | 'deck'> {
  seats: PublicSeat[];
}

/** Esconde as cartas alheias (o servidor só manda o que cada um pode ver). */
export function toPublicState(state: PokerState, viewerId?: string | null): PublicState {
  const { seats, deck, ...rest } = state;
  return {
    ...rest,
    seats: seats.map((seat) => {
      const { hole, ...restSeat } = seat;
      const isViewer = viewerId != null && seat.playerId === viewerId;
      const visible = isViewer || state.revealAll || state.phase === 'showdown' || state.phase === 'finished';
      // cartas alheias viram 'back' (renderizadas com o verso do sprite)
      return { ...restSeat, hole: visible ? hole : hole.map(() => BACK_CODE) };
    }),
  };
}

/** Comandos aceitos pelo transporte (servidor local ou edge function). */
export type PokerCommand =
  | { type: 'sit'; seatIndex: number; buyIn: number; name: string }
  | { type: 'stand' }
  | { type: 'action'; action: ActionType; amount?: number }
  | { type: 'sync' };
