/**
 * Transporte OFFLINE (sem rede): o motor roda no próprio navegador.
 * Serve para o jogo nunca ficar "morto" se não houver servidor nem Supabase —
 * as cadeiras vazias são preenchidas por bots e está claro na tela que é treino.
 */
import {
  applyAction, createState, findSeatByPlayer, legalActions, sitDown, standUp, startHand, tick, toPublicState,
  type ActionType, type PokerState, type PublicState,
} from '@/games/poker/engine';
import { decideBot } from '@/games/poker/bot';
import {
  Emitter, type AviatorBetView, type AviatorView, type ClientEvents, type GameClient, type Player, type PokerTableInfo, type PokerView,
} from './types';

const BALANCE_KEY = 'luccabet:offline-balance';
const NAME_KEY = 'luccabet:guest-name';
const START_BALANCE = 1000;

const BOT_NAMES = ['Ana', 'Bruno', 'Caio', 'Duda', 'Elisa', 'Felipe', 'Gabi', 'Henrique', 'Isabela', 'João'];

const TABLES = [
  { tableId: 'offline-2-5', tableName: 'Mesa Treino • R$ 2 / R$ 5', smallBlind: 2, bigBlind: 5, minBuyIn: 100, maxBuyIn: 500 },
  { tableId: 'offline-5-10', tableName: 'Mesa Treino • R$ 5 / R$ 10', smallBlind: 5, bigBlind: 10, minBuyIn: 200, maxBuyIn: 1000 },
];

const readBalance = () => Number(localStorage.getItem(BALANCE_KEY) ?? START_BALANCE);
const writeBalance = (v: number) => localStorage.setItem(BALANCE_KEY, String(Math.round(v * 100) / 100));

/** hash determinístico simples (modo offline não precisa de provable fairness forte) */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0').repeat(8).slice(0, 64);
}

function crashFromHash(hash: string): number {
  const r = parseInt(hash.slice(0, 13), 16) / 0xfffffffffffff;
  if (r < 0.06) return 1.0;
  return Math.max(1.0, Math.min(1000, Math.round(((1 - 0.06) / (1 - r)) * 100) / 100));
}

export class OfflineGameClient implements GameClient {
  readonly mode = 'offline' as const;
  readonly player: Player;
  private emitter = new Emitter<ClientEvents>();
  private pokerTimers = new Map<string, ReturnType<typeof setInterval>>();
  private states = new Map<string, PokerState>();
  private botThinkAt = new Map<string, number>();
  private botsEnabled = new Map<string, boolean>();
  private aviatorTimer: ReturnType<typeof setInterval> | null = null;
  private aviatorState: AviatorView;
  private bet: AviatorBetView & { auto: number | null } | null = null;
  private seed = Math.random().toString(36).slice(2);
  private roundNo = 1;
  private hash = '';
  private crashPoint = 2;
  private phaseStartedAt = Date.now();
  private startedAt = 0;
  private multiplier = 1;
  private history: number[] = [];

  constructor() {
    const name = localStorage.getItem(NAME_KEY) ?? 'Você';
    this.player = { playerId: 'you', name, balance: readBalance() };
    this.aviatorState = this.buildAviatorView();
    this.newRound();
  }

  // ------------------------------------------------------------- conexão
  async connect() {
    this.emitter.emit('status', 'open');
  }
  disconnect() {
    for (const timer of this.pokerTimers.values()) clearInterval(timer);
    this.pokerTimers.clear();
    if (this.aviatorTimer) clearInterval(this.aviatorTimer);
    this.aviatorTimer = null;
  }

  refreshBalance() {
    this.emitter.emit('wallet', this.player.balance);
  }

  private setBalance(v: number) {
    this.player.balance = Math.round(v * 100) / 100;
    writeBalance(this.player.balance);
    this.emitter.emit('wallet', this.player.balance);
  }

  async tables(): Promise<PokerTableInfo[]> {
    return TABLES.map((t) => ({
      ...t,
      maxSeats: 6,
      botsEnabled: true,
      players: this.states.get(t.tableId)?.seats.filter((s) => s.playerId).length ?? 0,
      phase: this.states.get(t.tableId)?.phase ?? 'idle',
    }));
  }

  // ---------------------------------------------------------------- poker
  private ensureTable(tableId: string): PokerState {
    let state = this.states.get(tableId);
    if (!state) {
      const cfg = TABLES.find((t) => t.tableId === tableId) ?? TABLES[0];
      state = createState({ ...cfg, maxSeats: 6, turnSeconds: 30 });
      this.states.set(tableId, state);
      this.botsEnabled.set(tableId, true);
    }
    if (!this.pokerTimers.has(tableId)) {
      const timer = setInterval(() => this.pokerLoop(tableId), 200);
      this.pokerTimers.set(tableId, timer);
    }
    return state;
  }

  private emitPoker(tableId: string) {
    const state = this.states.get(tableId);
    if (!state) return;
    const view: PokerView = {
      tableId,
      state: toPublicState(state, this.player.playerId) as PublicState,
      you: { seat: findSeatByPlayer(state, this.player.playerId), balance: this.player.balance },
      botsEnabled: this.botsEnabled.get(tableId) ?? true,
    };
    this.emitter.emit('pokerState', view);
  }

  private manageBots(tableId: string, state: PokerState) {
    if (!(this.botsEnabled.get(tableId) ?? true)) return;
    const humans = state.seats.filter((s) => s.playerId && !s.isBot).length;
    if (humans === 0) return;
    const bots = state.seats.filter((s) => s.isBot && s.playerId).length;
    const target = Math.max(0, Math.min(6 - humans, 5 - humans));
    if (bots < target) {
      const free = state.seats.findIndex((s) => !s.playerId);
      if (free >= 0) {
        const buyIn = state.minBuyIn + Math.floor(Math.random() * (state.maxBuyIn - state.minBuyIn));
        const res = sitDown(state, free, {
          playerId: `bot_${free}_${Math.random().toString(36).slice(2, 6)}`,
          name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
          buyIn,
          isBot: true,
        });
        if (!res.error) this.states.set(tableId, res.state);
      }
    }
    if (bots > target) {
      const bot = state.seats.find((s) => s.isBot && s.playerId);
      if (bot?.playerId) {
        const { state: next } = standUp(state, bot.playerId);
        this.states.set(tableId, next);
      }
    }
  }

  private pokerLoop(tableId: string) {
    const current = this.ensureTable(tableId);
    this.manageBots(tableId, current);
    let state = this.states.get(tableId)!;
    let changed = false;
    const now = Date.now();

    const turn = state.turnSeat;
    if (turn !== null && state.seats[turn]?.isBot) {
      const thinkAt = this.botThinkAt.get(tableId) ?? now + 600 + Math.random() * 900;
      this.botThinkAt.set(tableId, thinkAt);
      if (now >= thinkAt) {
        const d = decideBot(state, turn);
        const res = applyAction(state, turn, d.action, d.amount, now);
        if (res.ok) state = res.state;
        else {
          const legal = legalActions(state, turn);
          const fb = applyAction(state, turn, legal.canCheck ? 'check' : 'fold', 0, now);
          if (fb.ok) state = fb.state;
        }
        this.botThinkAt.delete(tableId);
        changed = true;
      }
    }

    const t = tick(state, now);
    if (t.changed) {
      state = t.state;
      changed = true;
    }
    this.states.set(tableId, state);
    if (changed) this.emitPoker(tableId);
  }

  poker = {
    join: (tableId: string, opts?: { seat?: number; buyIn?: number }) => {
      const state = this.ensureTable(tableId);
      if (typeof opts?.buyIn === 'number' && typeof opts?.seat === 'number') {
        const buyIn = opts.buyIn;
        if (buyIn > this.player.balance) {
          this.emitter.emit('error', 'Saldo insuficiente para o buy-in');
          return;
        }
        const res = sitDown(state, opts.seat, { playerId: this.player.playerId, name: this.player.name, buyIn });
        if (res.error) {
          this.emitter.emit('error', res.error);
          return;
        }
        this.states.set(tableId, res.state);
        this.setBalance(this.player.balance - buyIn);
      }
      this.emitPoker(tableId);
    },
    leave: (tableId: string) => {
      const state = this.states.get(tableId);
      if (!state) return;
      const { state: next, returned } = standUp(state, this.player.playerId);
      this.states.set(tableId, next);
      if (returned > 0) {
        this.setBalance(this.player.balance + returned);
        this.emitter.emit('pokerEvent', { type: 'left', payload: { returned } });
      }
      this.emitPoker(tableId);
    },
    action: (tableId: string, action: ActionType, amount?: number) => {
      const state = this.states.get(tableId);
      if (!state) return;
      const seat = findSeatByPlayer(state, this.player.playerId);
      const res = applyAction(state, seat, action, amount ?? 0, Date.now());
      if (!res.ok) {
        this.emitter.emit('error', res.error ?? 'Ação inválida');
        return;
      }
      this.states.set(tableId, res.state);
      this.emitPoker(tableId);
    },
    setBots: (tableId: string, enabled: boolean) => {
      this.botsEnabled.set(tableId, enabled);
      if (!enabled) {
        const state = this.states.get(tableId);
        if (state) {
          let next = state;
          for (const seat of state.seats.filter((s) => s.isBot && s.playerId)) {
            next = standUp(next, seat.playerId!).state;
          }
          this.states.set(tableId, next);
        }
      }
      this.emitPoker(tableId);
    },
    start: (tableId: string) => {
      const state = this.ensureTable(tableId);
      this.states.set(tableId, startHand(state, Date.now(), true));
      this.emitPoker(tableId);
    },
    sync: (tableId: string) => this.emitPoker(tableId),
  };

  // -------------------------------------------------------------- aviator
  private newRound() {
    this.seed = Math.random().toString(36).slice(2) + Date.now().toString(36);
    this.hash = fnv1a(`${this.seed}:${this.roundNo}`);
    this.crashPoint = crashFromHash(this.hash);
    this.multiplier = 1;
    this.phaseStartedAt = Date.now();
    this.bet = null;
  }

  private currentMultiplier() {
    if (this.aviatorState.phase !== 'flying') return this.multiplier;
    return Math.exp(0.15 * ((Date.now() - this.startedAt) / 1000));
  }

  private buildAviatorView(): AviatorView {
    const bets: AviatorBetView[] = this.bet ? [{ ...this.bet, you: true }] : [];
    return {
      phase: this.aviatorState.phase,
      countdown: this.aviatorState.countdown,
      multiplier: Math.round(this.currentMultiplier() * 100) / 100,
      crashPoint: this.aviatorState.crashPoint,
      roundId: this.roundNo,
      serverHash: this.hash,
      serverSeed: this.aviatorState.serverSeed,
      history: this.history,
      bets,
      totals: { players: bets.length, totalBet: bets.reduce((a, b) => a + b.amount, 0), cashedOut: bets.filter((b) => b.cashedOutAt !== null).length },
    };
  }

  private emitAviator() {
    this.aviatorState = this.buildAviatorView();
    this.emitter.emit('aviatorState', this.aviatorState);
  }

  private aviatorLoop() {
    const now = Date.now();
    const elapsed = now - this.phaseStartedAt;

    if (this.aviatorState.phase === 'waiting' && elapsed >= 6000) {
      this.aviatorState.phase = 'flying';
      this.startedAt = now;
      this.phaseStartedAt = now;
      this.emitAviator();
      return;
    }
    if (this.aviatorState.phase === 'flying') {
      const m = this.currentMultiplier();
      if (this.bet && this.bet.cashedOutAt === null && this.bet.auto && m >= this.bet.auto) {
        this.cashoutAt(this.bet.auto, true);
      }
      if (m >= this.crashPoint) {
        this.multiplier = this.crashPoint;
        this.aviatorState.crashPoint = this.crashPoint;
        this.aviatorState.phase = 'crashed';
        this.aviatorState.serverSeed = this.seed;
        this.phaseStartedAt = now;
        this.history = [this.crashPoint, ...this.history].slice(0, 40);
        if (this.bet && this.bet.cashedOutAt === null) {
          this.emitter.emit('aviatorEvent', { type: 'lost', payload: { amount: this.bet.amount, crashPoint: this.crashPoint } });
        }
        this.emitAviator();
        return;
      }
      this.multiplier = m;
      this.emitAviator();
      return;
    }
    if (this.aviatorState.phase === 'crashed' && elapsed >= 3200) {
      this.roundNo += 1;
      this.aviatorState.serverSeed = null;
      this.aviatorState.crashPoint = null;
      this.aviatorState.phase = 'waiting';
      this.newRound();
      this.emitAviator();
    }
  }

  private cashoutAt(at: number, auto = false) {
    if (!this.bet || this.bet.cashedOutAt !== null) return;
    this.bet.cashedOutAt = at;
    const win = Math.round(this.bet.amount * at * 100) / 100;
    this.setBalance(this.player.balance + win);
    this.emitter.emit('aviatorEvent', { type: 'cashed', payload: { multiplier: at, amount: this.bet.amount, win, auto } });
    this.emitAviator();
  }

  aviator = {
    join: () => {
      if (!this.aviatorTimer) this.aviatorTimer = setInterval(() => this.aviatorLoop(), 100);
      this.emitAviator();
    },
    bet: (amount: number, auto?: number | null) => {
      if (this.aviatorState.phase !== 'waiting') {
        this.emitter.emit('error', 'Apostas encerradas para esta rodada');
        return;
      }
      const amt = Math.round(amount * 100) / 100;
      if (amt < 1 || amt > this.player.balance) {
        this.emitter.emit('error', amt < 1 ? 'Valor mínimo é R$ 1,00' : 'Saldo insuficiente');
        return;
      }
      if (this.bet) this.setBalance(this.player.balance + this.bet.amount);
      this.setBalance(this.player.balance - amt);
      this.bet = { name: this.player.name, amount: amt, cashedOutAt: null, you: true, auto: auto && auto > 1.01 ? auto : null };
      this.emitAviator();
    },
    cancel: () => {
      if (!this.bet || this.aviatorState.phase !== 'waiting') return;
      this.setBalance(this.player.balance + this.bet.amount);
      this.bet = null;
      this.emitAviator();
    },
    cashout: () => {
      if (this.aviatorState.phase !== 'flying') return;
      this.cashoutAt(Math.round(this.currentMultiplier() * 100) / 100);
    },
    sync: () => this.emitAviator(),
  };

  // -------------------------------------------------------------- eventos
  onPokerState(cb: (v: PokerView) => void) {
    return this.emitter.on('pokerState', cb);
  }
  onAviatorState(cb: (v: AviatorView) => void) {
    return this.emitter.on('aviatorState', cb);
  }
  onWallet(cb: (balance: number) => void) {
    return this.emitter.on('wallet', cb);
  }
  onError(cb: (message: string) => void) {
    return this.emitter.on('error', cb);
  }
  onStatus(cb: (status: 'connecting' | 'open' | 'closed') => void) {
    return this.emitter.on('status', cb);
  }
  onPokerEvent(cb: (event: { type: string; payload?: any }) => void) {
    return this.emitter.on('pokerEvent', cb);
  }
  onAviatorEvent(cb: (event: { type: string; payload?: any }) => void) {
    return this.emitter.on('aviatorEvent', cb);
  }
}
