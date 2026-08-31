/**
 * Sala de Poker autoritativa (servidor).
 *
 * O servidor é a ÚNICA fonte de verdade: baralho, pote, fichas e showdown são
 * resolvidos aqui e só o que cada jogador pode ver é transmitido para ele
 * (`toPublicState`). Isso impede trapaça e, principalmente, impede a mesa de
 * travar: um loop de 200ms chama `tick()` continuamente até a mão terminar.
 */
import {
  applyAction, createState, findSeatByPlayer, legalActions, sitDown, standUp, startHand,
  tick, toPublicState, type ActionType, type PokerState, type PublicState,
} from '../../src/games/poker/engine';
import { decideBot } from '../../src/games/poker/bot';

export interface PokerRoomConfig {
  tableId: string;
  tableName: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxSeats: number;
  turnSeconds: number;
  botsEnabled: boolean;
}

export interface WalletApi {
  debit(playerId: string, amount: number): boolean;
  credit(playerId: string, amount: number): number;
  getBalance(playerId: string): number;
}

export interface PokerClient {
  playerId: string;
  name: string;
  send(msg: unknown): void;
}

const BOT_NAMES = [
  'Ana', 'Bruno', 'Caio', 'Duda', 'Elisa', 'Felipe', 'Gabi', 'Henrique',
  'Isabela', 'João', 'Karina', 'Lucas', 'Mariana', 'Nando', 'Otávio', 'Paula',
];

export class PokerRoom {
  private state: PokerState;
  private clients = new Map<string, PokerClient>();
  private botSeats = new Map<number, string>(); // seatIndex -> bot playerId
  private botThinkAt = 0;
  private botSeq = 0;
  private timer: NodeJS.Timeout | null = null;
  public botsEnabled: boolean;

  constructor(private cfg: PokerRoomConfig, private wallet: WalletApi) {
    this.botsEnabled = cfg.botsEnabled;
    this.state = createState({ ...cfg });
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.loop(), 200);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  get tableId() {
    return this.cfg.tableId;
  }

  public info() {
    return {
      tableId: this.cfg.tableId,
      tableName: this.cfg.tableName,
      smallBlind: this.cfg.smallBlind,
      bigBlind: this.cfg.bigBlind,
      minBuyIn: this.cfg.minBuyIn,
      maxBuyIn: this.cfg.maxBuyIn,
      maxSeats: this.cfg.maxSeats,
      botsEnabled: this.botsEnabled,
      players: this.state.seats.filter((s) => s.playerId).length,
      phase: this.state.phase,
    };
  }

  // ------------------------------------------------------------- conexões
  addClient(client: PokerClient) {
    this.clients.set(client.playerId, client);
    // marca assento como conectado
    const idx = findSeatByPlayer(this.state, client.playerId);
    if (idx >= 0) this.state.seats[idx].connected = true;
    this.sendState(client);
  }

  removeClient(playerId: string) {
    this.clients.delete(playerId);
    const idx = findSeatByPlayer(this.state, playerId);
    if (idx >= 0) {
      this.state.seats[idx].connected = false;
      // devolve as fichas da mesa para a carteira e libera a cadeira
      const { state, returned } = standUp(this.state, playerId);
      if (returned > 0) {
        this.wallet.credit(playerId, returned);
        this.broadcast({ t: 'wallet', balance: this.wallet.getBalance(playerId) });
      }
      this.state = state;
    }
    this.broadcastState();
  }

  // ---------------------------------------------------------------- comandos
  sit(player: PokerClient, seatIndex: number, buyIn: number) {
    const balance = this.wallet.getBalance(player.playerId);
    if (buyIn > balance) {
      player.send({ t: 'poker:error', message: 'Saldo insuficiente para o buy-in' });
      return;
    }
    if (!this.wallet.debit(player.playerId, buyIn)) {
      player.send({ t: 'poker:error', message: 'Não foi possível debitar o buy-in' });
      return;
    }

    const res = sitDown(this.state, seatIndex, { playerId: player.playerId, name: player.name, buyIn });
    if (res.error) {
      this.wallet.credit(player.playerId, buyIn); // estorna
      player.send({ t: 'poker:error', message: res.error });
      return;
    }
    this.state = res.state;
    this.broadcast({ t: 'wallet', balance: this.wallet.getBalance(player.playerId) });
    this.broadcastState();
  }

  leave(player: PokerClient) {
    const { state, returned } = standUp(this.state, player.playerId);
    this.state = state;
    if (returned > 0) {
      this.wallet.credit(player.playerId, returned);
      player.send({ t: 'wallet', balance: this.wallet.getBalance(player.playerId) });
      player.send({ t: 'poker:left', returned });
    }
    this.broadcastState();
  }

  action(player: PokerClient, action: ActionType, amount = 0) {
    const seat = findSeatByPlayer(this.state, player.playerId);
    if (seat < 0) {
      player.send({ t: 'poker:error', message: 'Você não está sentado' });
      return;
    }
    const res = applyAction(this.state, seat, action, amount, Date.now());
    if (!res.ok) {
      player.send({ t: 'poker:error', message: res.error ?? 'Ação inválida' });
      return;
    }
    this.state = res.state;
    this.broadcastState();
  }

  /** Processa a mesa agora (usado pelo tick periódico do cliente). */
  tickNow() {
    this.loop();
  }

  /** Força o início de uma nova mão (só quando a mesa está livre/encerrada). */

  startNow(client?: PokerClient) {
    if (this.state.phase !== 'idle' && this.state.phase !== 'finished') {
      client?.send({ t: 'poker:error', message: 'Ainda há uma mão em andamento' });
      return;
    }
    this.state = startHand({ ...this.state, nextHandAt: null }, Date.now(), true);
    this.broadcastState();
  }

  setBots(enabled: boolean) {
    this.botsEnabled = enabled;
    if (!enabled) {
      for (const [, botId] of [...this.botSeats]) this.removeBot(botId);
    }
    this.broadcastState();
  }

  // ------------------------------------------------------------------- bots
  private addBot(): boolean {
    const freeSeat = this.state.seats.findIndex((s) => !s.playerId);
    if (freeSeat < 0) return false;
    this.botSeq += 1;
    const botId = `bot_${this.cfg.tableId}_${this.botSeq}`;
    const name = BOT_NAMES[(this.botSeq - 1) % BOT_NAMES.length];
    const buyIn = this.cfg.minBuyIn + Math.floor(Math.random() * (this.cfg.maxBuyIn - this.cfg.minBuyIn));
    const res = sitDown(this.state, freeSeat, { playerId: botId, name, buyIn, isBot: true });
    if (res.error) return false;
    this.state = res.state;
    this.botSeats.set(freeSeat, botId);
    return true;
  }

  private removeBot(botId: string) {
    const { state } = standUp(this.state, botId);
    this.state = state;
    for (const [seat, id] of [...this.botSeats]) if (id === botId) this.botSeats.delete(seat);
  }

  private manageBots() {
    if (!this.botsEnabled) return;
    const humans = this.state.seats.filter((s) => s.playerId && !s.isBot).length;
    const bots = this.state.seats.filter((s) => s.isBot && s.playerId).length;
    const target = humans === 0 ? 0 : Math.max(0, Math.min(this.cfg.maxSeats - humans, 5 - humans));
    if (bots < target) this.addBot();
    if (bots > target) {
      const bot = this.state.seats.find((s) => s.isBot && s.playerId);
      if (bot?.playerId) this.removeBot(bot.playerId);
    }
    // rebuy dos bots que quebraram
    for (const seat of this.state.seats) {
      if (seat.isBot && seat.playerId && seat.chips <= 0) {
        const buyIn = this.cfg.minBuyIn + Math.floor(Math.random() * (this.cfg.maxBuyIn - this.cfg.minBuyIn));
        const res = sitDown(this.state, seat.index, { playerId: seat.playerId, name: seat.name, buyIn, isBot: true });
        if (!res.error) this.state = res.state;
      }
    }
  }

  // ------------------------------------------------------------------- loop
  private loop() {
    const now = Date.now();
    let changed = false;

    this.manageBots();

    // vez do bot
    const turn = this.state.turnSeat;
    if (turn !== null && this.state.seats[turn]?.isBot) {
      if (!this.botThinkAt) this.botThinkAt = now + 600 + Math.random() * 900;
      if (now >= this.botThinkAt) {
        const decision = decideBot(this.state, turn);
        const res = applyAction(this.state, turn, decision.action, decision.amount, now);
        if (res.ok) this.state = res.state;
        else {
          const legal = legalActions(this.state, turn);
          const fb = applyAction(this.state, turn, legal.canCheck ? 'check' : 'fold', 0, now);
          if (fb.ok) this.state = fb.state;
        }
        this.botThinkAt = 0;
        changed = true;
      }
    } else if (this.botThinkAt) {
      this.botThinkAt = 0;
    }

    const t = tick(this.state, now);
    if (t.changed) {
      this.state = t.state;
      changed = true;
    }

    if (changed) this.broadcastState();
  }

  // -------------------------------------------------------------- broadcast
  private sendState(client: PokerClient) {
    const seat = findSeatByPlayer(this.state, client.playerId);
    client.send({
      t: 'poker:state',
      tableId: this.cfg.tableId,
      serverTime: Date.now(),
      state: toPublicState(this.state, client.playerId) as PublicState,
      you: {
        seat,
        balance: this.wallet.getBalance(client.playerId),
      },
      botsEnabled: this.botsEnabled,
    });
  }

  broadcastState() {
    for (const client of this.clients.values()) this.sendState(client);
  }

  private broadcast(msg: unknown) {
    for (const client of this.clients.values()) client.send(msg);
  }

  /** usado pelos testes/health */
  snapshot(): PublicState {
    return toPublicState(this.state, null) as PublicState;
  }

  forceStart() {
    this.state = startHand(this.state, Date.now(), true);
    this.broadcastState();
  }
}
