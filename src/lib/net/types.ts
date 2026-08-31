/**
 * Contrato comum dos transportes de jogo.
 *
 * Três implementações, a mesma interface:
 *  - local    → servidor Node do repo (server/index.ts) — autoritativo, multiplayer real
 *  - supabase → Lovable Cloud (Supabase Realtime + edge function poker-controller)
 *  - offline  → motor rodando no próprio navegador (sem rede; só treino)
 */
import type { PublicState } from '@/games/poker/engine';

export type BackendMode = 'local' | 'supabase' | 'offline';

export interface PokerTableInfo {
  tableId: string;
  tableName: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxSeats: number;
  botsEnabled: boolean;
  players: number;
  phase: string;
}

export interface PokerView {
  tableId: string;
  state: PublicState;
  you: { seat: number; balance: number };
  botsEnabled: boolean;
}

export interface AviatorBetView {
  name: string;
  amount: number;
  cashedOutAt: number | null;
  you: boolean;
}

export interface AviatorView {
  phase: 'waiting' | 'flying' | 'crashed';
  countdown: number;
  multiplier: number;
  crashPoint: number | null;
  roundId: number;
  serverHash: string;
  serverSeed: string | null;
  history: number[];
  bets: AviatorBetView[];
  totals: { players: number; totalBet: number; cashedOut: number };
}

export interface Player {
  playerId: string;
  name: string;
  balance: number;
}

export type Unsubscribe = () => void;

export interface GameClient {
  readonly mode: BackendMode;
  readonly player: Player;
  connect(): Promise<void>;
  disconnect(): void;
  refreshBalance(): void;
  tables(): Promise<PokerTableInfo[]>;

  poker: {
    join(tableId: string, opts?: { seat?: number; buyIn?: number }): void;
    leave(tableId: string): void;
    action(tableId: string, action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number): void;
    setBots(tableId: string, enabled: boolean): void;
    start(tableId: string): void;
    sync(tableId: string): void;
  };

  aviator: {
    join(): void;
    bet(amount: number, auto?: number | null): void;
    cancel(): void;
    cashout(): void;
    sync(): void;
  };

  onPokerState(cb: (view: PokerView) => void): Unsubscribe;
  onAviatorState(cb: (view: AviatorView) => void): Unsubscribe;
  onWallet(cb: (balance: number) => void): Unsubscribe;
  onError(cb: (message: string) => void): Unsubscribe;
  onStatus(cb: (status: 'connecting' | 'open' | 'closed') => void): Unsubscribe;
  onPokerEvent(cb: (event: { type: string; payload?: any }) => void): Unsubscribe;
  onAviatorEvent(cb: (event: { type: string; payload?: any }) => void): Unsubscribe;
}

/** Emissor de eventos mínimo (sem dependências externas). */
export class Emitter<T extends Record<string, any>> {
  private map = new Map<keyof T, Set<(payload: any) => void>>();

  on<K extends keyof T>(key: K, cb: (payload: T[K]) => void): Unsubscribe {
    const set = this.map.get(key) ?? new Set();
    set.add(cb);
    this.map.set(key, set);
    return () => set.delete(cb);
  }

  emit<K extends keyof T>(key: K, payload: T[K]) {
    for (const cb of this.map.get(key) ?? []) cb(payload);
  }

  clear() {
    this.map.clear();
  }
}

export type ClientEvents = {
  pokerState: PokerView;
  aviatorState: AviatorView;
  wallet: number;
  error: string;
  status: 'connecting' | 'open' | 'closed';
  pokerEvent: { type: string; payload?: any };
  aviatorEvent: { type: string; payload?: any };
};
