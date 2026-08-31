/**
 * Transporte LOCAL: conversa com o servidor de jogos do repositório
 * (server/index.ts) por WebSocket. É autoritativo (o servidor embaralha,
 * valida ações, resolve o pote e devolve fichas) e multiplayer de verdade:
 * dois navegadores/abas diferentes jogam na mesma mesa.
 */
import {
  Emitter, type AviatorView, type ClientEvents, type GameClient, type Player, type PokerTableInfo, type PokerView,
} from './types';

const TOKEN_KEY = 'luccabet:guest-token';
const NAME_KEY = 'luccabet:guest-name';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearStoredToken = () => localStorage.removeItem(TOKEN_KEY);
export const getStoredName = () => localStorage.getItem(NAME_KEY);
export const setStoredName = (n: string) => localStorage.setItem(NAME_KEY, n);

const apiBase = () => `${window.location.origin}/api`;

export async function healthCheck(): Promise<{ ok: boolean; tables: PokerTableInfo[] } | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${apiBase()}/health`, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    const data = await res.json();
    return { ok: true, tables: data.tables ?? [] };
  } catch {
    return null;
  }
}

export interface LocalSession {
  token: string;
  playerId: string;
  name: string;
  balance: number;
}

export async function createOrRestoreSession(name?: string): Promise<LocalSession> {
  const token = getStoredToken();
  const res = await fetch(`${apiBase()}/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token ?? undefined, name: name ?? getStoredName() ?? undefined }),
  });
  if (!res.ok) throw new Error('Não foi possível criar a sessão local');
  const data = (await res.json()) as LocalSession;
  setStoredToken(data.token);
  if (name) setStoredName(name);
  return data;
}

export class LocalGameClient implements GameClient {
  readonly mode = 'local' as const;
  readonly player: Player;
  private ws: WebSocket | null = null;
  private emitter = new Emitter<ClientEvents>();
  private queue: unknown[] = [];
  private reconnectDelay = 500;
  private closedByUser = false;

  constructor(private session: LocalSession) {
    this.player = { playerId: session.playerId, name: session.name, balance: session.balance };
  }

  // ------------------------------------------------------------- conexão
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
      this.ws = ws;
      this.closedByUser = false;
      this.emitter.emit('status', 'connecting');

      ws.onopen = () => {
        this.reconnectDelay = 500;
        this.emitter.emit('status', 'open');
        this.send({ t: 'auth', token: this.session.token });
        for (const msg of this.queue.splice(0)) this.send(msg);
        resolve();
      };
      ws.onerror = () => reject(new Error('Falha na conexão com o servidor de jogos'));
      ws.onclose = () => {
        this.emitter.emit('status', 'closed');
        if (this.closedByUser) return;
        setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 8000);
          this.connect().catch(() => undefined);
        }, this.reconnectDelay);
      };
      ws.onmessage = (ev) => this.handleMessage(ev.data);
    });
  }

  disconnect() {
    this.closedByUser = true;
    this.ws?.close();
    this.ws = null;
  }

  private send(msg: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    else this.queue.push(msg);
  }

  private handleMessage(raw: unknown) {
    let msg: any;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    switch (msg?.t) {
      case 'poker:state':
        this.emitter.emit('pokerState', msg as PokerView);
        if (msg.you?.balance != null) {
          this.player.balance = msg.you.balance;
          this.emitter.emit('wallet', msg.you.balance);
        }
        break;
      case 'aviator:state':
        this.emitter.emit('aviatorState', msg.snapshot as AviatorView);
        break;
      case 'aviator:cashed':
        this.emitter.emit('aviatorEvent', { type: 'cashed', payload: msg });
        break;
      case 'aviator:lost':
        this.emitter.emit('aviatorEvent', { type: 'lost', payload: msg });
        break;
      case 'aviator:error':
        this.emitter.emit('error', String(msg.message ?? 'Erro no Aviator'));
        break;
      case 'poker:error':
        this.emitter.emit('error', String(msg.message ?? 'Erro na mesa'));
        break;
      case 'poker:left':
        this.emitter.emit('pokerEvent', { type: 'left', payload: msg });
        break;
      case 'wallet':
        this.player.balance = msg.balance;
        this.emitter.emit('wallet', msg.balance);
        break;
      case 'error':
        this.emitter.emit('error', String(msg.message ?? 'Erro'));
        break;
      default:
        break;
    }
  }

  // ---------------------------------------------------------------- API
  refreshBalance() {
    this.send({ t: 'wallet:sync' });
  }

  async tables(): Promise<PokerTableInfo[]> {
    const res = await fetch(`${apiBase()}/tables`);
    const data = await res.json();
    return (data.tables ?? []) as PokerTableInfo[];
  }

  poker = {
    join: (tableId: string, opts?: { seat?: number; buyIn?: number }) =>
      this.send({ t: 'poker:join', tableId, seat: opts?.seat, buyIn: opts?.buyIn }),
    leave: (tableId: string) => this.send({ t: 'poker:leave', tableId }),
    action: (tableId: string, action: string, amount?: number) =>
      this.send({ t: 'poker:action', tableId, action, amount: amount ?? 0 }),
    setBots: (tableId: string, enabled: boolean) => this.send({ t: 'poker:bots', tableId, enabled }),
    start: (tableId: string) => this.send({ t: 'poker:start', tableId }),
    sync: (tableId: string) => this.send({ t: 'poker:sync', tableId }),
  };

  aviator = {
    join: () => this.send({ t: 'aviator:join' }),
    bet: (amount: number, auto?: number | null) => this.send({ t: 'aviator:bet', amount, auto: auto ?? null }),
    cancel: () => this.send({ t: 'aviator:cancel' }),
    cashout: () => this.send({ t: 'aviator:cashout' }),
    sync: () => this.send({ t: 'aviator:sync' }),
  };

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
