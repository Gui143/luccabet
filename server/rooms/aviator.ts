/**
 * Sala do Aviator autoritativa (servidor).
 *
 * Regras pedidas: SEM BOTS. Nenhum jogador falso, nenhum multiplicador ou
 * cash-out automático é injetado na tela — a lista de apostas ao vivo mostra
 * apenas as apostas dos jogadores REAIS conectados por WebSocket.
 *
 * O crash point é gerado no servidor a partir de um seed + hash SHA-256
 * (provably fair: o hash é publicado antes da rodada e o seed revelado depois).
 */
import { createHash, randomBytes } from 'node:crypto';
import type { WalletApi, PokerClient } from './poker';

export type AviatorPhase = 'waiting' | 'flying' | 'crashed';

export interface AviatorBet {
  playerId: string;
  name: string;
  amount: number;
  autoCashout: number | null;
  cashedOutAt: number | null;
  roundId: number;
}

export interface AviatorSnapshot {
  phase: AviatorPhase;
  countdown: number;
  multiplier: number;
  crashPoint: number | null;
  roundId: number;
  serverHash: string;
  serverSeed: string | null;
  history: number[];
  bets: { name: string; amount: number; cashedOutAt: number | null; you: boolean }[];
  totals: { players: number; totalBet: number; cashedOut: number };
}

const COUNTDOWN_MS = 6000;
const CRASHED_MS = 3200;
const GROWTH = 0.15; // multiplicador = e^(0.15 * t)
const HOUSE_EDGE = 0.06;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Crash point derivado do hash (determinístico e auditável). */
export function crashFromHash(hash: string): number {
  const r = parseInt(hash.slice(0, 13), 16) / 0xfffffffffffff; // ~0..1
  if (r < HOUSE_EDGE) return 1.0;
  const cp = (1 - HOUSE_EDGE) / (1 - r);
  return Math.max(1.0, Math.min(1000, Math.round(cp * 100) / 100));
}

export class AviatorRoom {
  private clients = new Map<string, PokerClient>();
  private bets = new Map<string, AviatorBet>();
  private history: number[] = [];

  private phase: AviatorPhase = 'waiting';
  private roundId = 1;
  private serverSeed = randomBytes(12).toString('hex');
  private serverHash = '';
  private crashPoint = 2;
  private phaseStartedAt = Date.now();
  private startedAt = 0;
  private multiplier = 1;
  private timer: NodeJS.Timeout | null = null;

  constructor(private wallet: WalletApi) {
    this.newRound();
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.loop(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private newRound() {
    this.serverSeed = randomBytes(12).toString('hex');
    this.serverHash = sha256(`${this.serverSeed}:${this.roundId}`);
    this.crashPoint = crashFromHash(this.serverHash);
    this.phase = 'waiting';
    this.multiplier = 1;
    this.phaseStartedAt = Date.now();
    this.bets.clear();
  }

  // ------------------------------------------------------------- conexões
  addClient(client: PokerClient) {
    this.clients.set(client.playerId, client);
    this.sendState(client);
  }

  removeClient(playerId: string) {
    this.clients.delete(playerId);
  }

  // -------------------------------------------------------------- comandos
  placeBet(client: PokerClient, amount: number, autoCashout: number | null) {
    if (this.phase !== 'waiting') {
      client.send({ t: 'aviator:error', message: 'Apostas encerradas para esta rodada' });
      return;
    }
    if (!Number.isFinite(amount) || amount < 1) {
      client.send({ t: 'aviator:error', message: 'Valor mínimo é R$ 1,00' });
      return;
    }
    const amt = Math.round(amount * 100) / 100;
    if (amt > this.wallet.getBalance(client.playerId)) {
      client.send({ t: 'aviator:error', message: 'Saldo insuficiente' });
      return;
    }
    const existing = this.bets.get(client.playerId);
    if (existing) {
      // devolve a aposta anterior e substitui
      this.wallet.credit(client.playerId, existing.amount);
    }
    if (!this.wallet.debit(client.playerId, amt)) {
      client.send({ t: 'aviator:error', message: 'Não foi possível debitar a aposta' });
      return;
    }
    this.bets.set(client.playerId, {
      playerId: client.playerId,
      name: client.name,
      amount: amt,
      autoCashout: autoCashout && autoCashout > 1.01 ? Math.round(autoCashout * 100) / 100 : null,
      cashedOutAt: null,
      roundId: this.roundId,
    });
    client.send({ t: 'wallet', balance: this.wallet.getBalance(client.playerId) });
    this.broadcastState();
  }

  cancelBet(client: PokerClient) {
    const bet = this.bets.get(client.playerId);
    if (!bet || this.phase !== 'waiting') {
      client.send({ t: 'aviator:error', message: 'Não há aposta para cancelar' });
      return;
    }
    this.bets.delete(client.playerId);
    this.wallet.credit(client.playerId, bet.amount);
    client.send({ t: 'wallet', balance: this.wallet.getBalance(client.playerId) });
    this.broadcastState();
  }

  cashout(client: PokerClient) {
    const bet = this.bets.get(client.playerId);
    if (!bet || bet.cashedOutAt !== null) {
      client.send({ t: 'aviator:error', message: 'Nenhuma aposta ativa' });
      return;
    }
    if (this.phase !== 'flying') {
      client.send({ t: 'aviator:error', message: 'O avião ainda não decolou' });
      return;
    }
    const at = Math.round(this.currentMultiplier() * 100) / 100;
    bet.cashedOutAt = at;
    const win = Math.round(bet.amount * at * 100) / 100;
    this.wallet.credit(client.playerId, win);
    client.send({ t: 'aviator:cashed', multiplier: at, amount: bet.amount, win });
    client.send({ t: 'wallet', balance: this.wallet.getBalance(client.playerId) });
    this.broadcastState();
  }

  private currentMultiplier(): number {
    if (this.phase !== 'flying') return this.multiplier;
    const t = (Date.now() - this.startedAt) / 1000;
    return Math.exp(GROWTH * t);
  }

  // ------------------------------------------------------------------ loop
  private loop() {
    const now = Date.now();
    const elapsed = now - this.phaseStartedAt;

    if (this.phase === 'waiting' && elapsed >= COUNTDOWN_MS) {
      this.phase = 'flying';
      this.startedAt = now;
      this.phaseStartedAt = now;
      this.multiplier = 1;
      this.broadcastState();
      return;
    }

    if (this.phase === 'flying') {
      const m = this.currentMultiplier();

      // auto cashout (configurado pelo próprio jogador)
      for (const bet of this.bets.values()) {
        if (bet.cashedOutAt === null && bet.autoCashout !== null && m >= bet.autoCashout) {
          bet.cashedOutAt = bet.autoCashout;
          const win = Math.round(bet.amount * bet.autoCashout * 100) / 100;
          this.wallet.credit(bet.playerId, win);
          const client = this.clients.get(bet.playerId);
          if (client) {
            client.send({ t: 'aviator:cashed', multiplier: bet.autoCashout, amount: bet.amount, win, auto: true });
            client.send({ t: 'wallet', balance: this.wallet.getBalance(bet.playerId) });
          }
        }
      }

      if (m >= this.crashPoint) {
        this.multiplier = this.crashPoint;
        this.phase = 'crashed';
        this.phaseStartedAt = now;
        this.history = [this.crashPoint, ...this.history].slice(0, 40);
        // perde quem não sacou (o valor já foi debitado na aposta)
        for (const bet of this.bets.values()) {
          if (bet.cashedOutAt === null) {
            const client = this.clients.get(bet.playerId);
            if (client) client.send({ t: 'aviator:lost', amount: bet.amount, crashPoint: this.crashPoint });
          }
        }
        this.broadcastState();
        return;
      }

      this.multiplier = m;
      this.broadcastState();
      return;
    }

    if (this.phase === 'crashed' && elapsed >= CRASHED_MS) {
      this.roundId += 1;
      this.newRound();
      this.broadcastState();
    }
  }

  // ------------------------------------------------------------- broadcast
  snapshot(viewerId?: string): AviatorSnapshot {
    const bets = [...this.bets.values()].map((b) => ({
      name: b.name,
      amount: b.amount,
      cashedOutAt: b.cashedOutAt,
      you: b.playerId === viewerId,
    }));
    return {
      phase: this.phase,
      countdown:
        this.phase === 'waiting'
          ? Math.max(0, Math.ceil((COUNTDOWN_MS - (Date.now() - this.phaseStartedAt)) / 1000))
          : this.phase === 'crashed'
            ? Math.max(0, Math.ceil((CRASHED_MS - (Date.now() - this.phaseStartedAt)) / 1000))
            : 0,
      multiplier: Math.round(this.currentMultiplier() * 100) / 100,
      crashPoint: this.phase === 'crashed' ? this.crashPoint : null,
      roundId: this.roundId,
      serverHash: this.serverHash,
      serverSeed: this.phase === 'crashed' ? this.serverSeed : null,
      history: this.history,
      bets,
      totals: {
        players: this.bets.size,
        totalBet: bets.reduce((a, b) => a + b.amount, 0),
        cashedOut: bets.filter((b) => b.cashedOutAt !== null).length,
      },
    };
  }

  private sendState(client: PokerClient) {
    client.send({ t: 'aviator:state', snapshot: this.snapshot(client.playerId) });
  }

  broadcastState() {
    for (const client of this.clients.values()) this.sendState(client);
  }
}
