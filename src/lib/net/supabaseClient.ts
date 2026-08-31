/**
 * Transporte SUPABASE (Lovable Cloud) — caminho de produção.
 *
 * Comandos vão para a edge function `poker-controller` (autoritativa, roda com
 * service role) e o estado volta pelo Realtime:
 *   - public.poker_tables   → estado público da mesa (cartas alheias ocultas)
 *   - public.poker_hole_cards → só a sua mão (RLS por user_id)
 *   - public.aviator_rounds / public.aviator_bets → rodada e apostas reais
 *
 * As migrations estão em supabase/migrations/20260831000100_poker_multiplayer.sql
 * e 20260831000200_aviator_real_players.sql — aplique-as no projeto.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  Emitter, type AviatorBetView, type AviatorView, type ClientEvents, type GameClient, type Player, type PokerTableInfo, type PokerView,
} from './types';
import type { PublicState } from '@/games/poker/engine';

interface PokerControllerResponse {
  ok?: boolean;
  error?: string;
  state?: PublicState;
  you?: { seat: number; balance: number };
  botsEnabled?: boolean;
  table?: PokerTableInfo;
  tables?: PokerTableInfo[];
  balance?: number;
}

async function call<T = PokerControllerResponse>(fn: 'poker-controller' | 'aviator-controller', body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message ?? 'Falha ao chamar o servidor');
  const res = data as T & { error?: string };
  if (res?.error) throw new Error(res.error);
  return res as T;
}

/** As tabelas de poker existem no projeto do Lovable Cloud? (cache de 60s) */
let tablesCheckedAt = 0;
let tablesExist: boolean | null = null;

export async function supabasePokerReady(): Promise<boolean> {
  if (tablesExist !== null && Date.now() - tablesCheckedAt < 60_000) return tablesExist;
  try {
    const { error } = await supabase.from('poker_tables').select('id').limit(1);
    tablesExist = !error;
  } catch {
    tablesExist = false;
  }
  tablesCheckedAt = Date.now();
  return tablesExist;
}

export class SupabaseGameClient implements GameClient {
  readonly mode = 'supabase' as const;
  readonly player: Player;
  private emitter = new Emitter<ClientEvents>();
  private pokerChannels = new Map<string, ReturnType<typeof supabase.channel>>();
  private holeChannel: ReturnType<typeof supabase.channel> | null = null;
  private aviatorChannel: ReturnType<typeof supabase.channel> | null = null;
  private myHole: string[] = [];
  private currentTableId: string | null = null;

  constructor(player: Player) {
    this.player = player;
  }

  async connect() {
    this.emitter.emit('status', 'open');
  }

  disconnect() {
    for (const ch of this.pokerChannels.values()) supabase.removeChannel(ch);
    this.pokerChannels.clear();
    if (this.holeChannel) supabase.removeChannel(this.holeChannel);
    if (this.aviatorChannel) supabase.removeChannel(this.aviatorChannel);
    this.holeChannel = null;
    this.aviatorChannel = null;
    this.emitter.emit('status', 'closed');
  }

  refreshBalance() {
    void this.loadBalance();
  }

  private async loadBalance() {
    const { data } = await supabase.from('profiles').select('balance').eq('id', this.player.playerId).single();
    if (data) {
      this.player.balance = Number((data as { balance: number }).balance ?? 0);
      this.emitter.emit('wallet', this.player.balance);
    }
  }

  async tables(): Promise<PokerTableInfo[]> {
    const res = await call<{ tables: PokerTableInfo[] }>('poker-controller', { action: 'list_tables' });
    return res.tables ?? [];
  }

  // ---------------------------------------------------------------- poker
  poker = {
    join: async (tableId: string, opts?: { seat?: number; buyIn?: number }) => {
      this.currentTableId = tableId;
      const res = await call('poker-controller', {
        action: 'join',
        table_key: tableId,
        seat: opts?.seat,
        buy_in: opts?.buyIn,
      });
      if (res.balance != null) {
        this.player.balance = res.balance;
        this.emitter.emit('wallet', res.balance);
      }
      this.subscribePoker(tableId);
      if (res.state) this.pushPoker(tableId, res.state, res.you, res.botsEnabled);
      else void this.refreshPoker(tableId);
    },
    leave: async (tableId: string) => {
      const res = await call('poker-controller', { action: 'leave', table_key: tableId });
      if (res.balance != null) {
        this.player.balance = res.balance;
        this.emitter.emit('wallet', res.balance);
        this.emitter.emit('pokerEvent', { type: 'left', payload: { returned: res.balance } });
      }
      this.unsubscribePoker(tableId);
    },
    action: async (tableId: string, action: string, amount?: number) => {
      const res = await call('poker-controller', {
        action: 'act',
        table_key: tableId,
        move: action,
        amount: amount ?? 0,
      });
      if (res.state) this.pushPoker(tableId, res.state, res.you, res.botsEnabled);
    },
    setBots: async (tableId: string, enabled: boolean) => {
      await call('poker-controller', { action: 'set_bots', table_key: tableId, enabled });
    },
    start: async (tableId: string) => {
      const res = await call('poker-controller', { action: 'start_hand', table_key: tableId });
      if (res.state) this.pushPoker(tableId, res.state, res.you, res.botsEnabled);
    },
    sync: async (tableId: string) => {
      this.subscribePoker(tableId);
      await this.refreshPoker(tableId);
    },
  };

  private async refreshPoker(tableId: string) {
    const res = await call('poker-controller', { action: 'state', table_key: tableId });
    if (res.state) this.pushPoker(tableId, res.state, res.you, res.botsEnabled);
  }

  private pushPoker(tableId: string, state: PublicState, you?: { seat: number; balance: number }, botsEnabled = true) {
    // injeta a própria mão recebida pelo canal privado
    const seat = you?.seat ?? state.seats.findIndex((s: any) => s.playerId === this.player.playerId);
    if (seat >= 0 && this.myHole.length === 2) {
      state = {
        ...state,
        seats: state.seats.map((s: any, i: number) => (i === seat ? { ...s, hole: this.myHole } : s)),
      };
    }
    this.emitter.emit('pokerState', {
      tableId,
      state,
      you: { seat, balance: you?.balance ?? this.player.balance },
      botsEnabled,
    } as PokerView);
  }

  private subscribePoker(tableId: string) {
    if (this.pokerChannels.has(tableId)) return;

    const channel = supabase
      .channel(`poker:${tableId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'poker_tables', filter: `table_key=eq.${tableId}` },
        (payload: any) => {
          const row = payload.new as { state?: PublicState };
          if (row?.state) this.pushPoker(tableId, row.state);
        },
      )
      .subscribe();
    this.pokerChannels.set(tableId, channel);

    // canal privado: só as minhas cartas (RLS garante)
    if (!this.holeChannel) {
      this.holeChannel = supabase
        .channel(`poker-hand:${this.player.playerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'poker_hole_cards', filter: `user_id=eq.${this.player.playerId}` },
          (payload: any) => {
            const cards = (payload.new as { cards?: string[] })?.cards ?? [];
            this.myHole = cards;
            if (this.currentTableId) void this.refreshPoker(this.currentTableId);
          },
        )
        .subscribe();
    }
  }

  private unsubscribePoker(tableId: string) {
    const ch = this.pokerChannels.get(tableId);
    if (ch) supabase.removeChannel(ch);
    this.pokerChannels.delete(tableId);
  }

  // -------------------------------------------------------------- aviator
  aviator = {
    join: () => {
      if (this.aviatorChannel) return;
      this.aviatorChannel = supabase
        .channel('aviator:live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'aviator_rounds' }, () => {
          void this.refreshAviator();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'aviator_bets' }, () => {
          void this.refreshAviator();
        })
        .subscribe();
      void this.refreshAviator();
    },
    bet: async (amount: number, auto?: number | null) => {
      const res = await call<{ balance?: number; error?: string }>('aviator-controller', {
        action: 'place_bet',
        amount,
        auto_cashout: auto ?? null,
      });
      if (res.balance != null) {
        this.player.balance = res.balance;
        this.emitter.emit('wallet', res.balance);
      }
      void this.refreshAviator();
    },
    cancel: async () => {
      const res = await call<{ balance?: number }>('aviator-controller', { action: 'cancel_bet' });
      if (res.balance != null) {
        this.player.balance = res.balance;
        this.emitter.emit('wallet', res.balance);
      }
      void this.refreshAviator();
    },
    cashout: async () => {
      try {
        const res = await call<{ multiplier?: number; win?: number; balance?: number }>('aviator-controller', {
          action: 'cashout',
        });
        if (res.multiplier) {
          this.emitter.emit('aviatorEvent', {
            type: 'cashed',
            payload: { multiplier: res.multiplier, win: res.win ?? 0, amount: 0 },
          });
        }
        if (res.balance != null) {
          this.player.balance = res.balance;
          this.emitter.emit('wallet', res.balance);
        }
      } catch (err) {
        this.emitter.emit('error', (err as Error).message);
      }
      void this.refreshAviator();
    },
    sync: () => {
      void this.refreshAviator();
    },
  };

  private async refreshAviator() {
    const res = await call<{ snapshot?: AviatorView }>('aviator-controller', { action: 'snapshot' });
    if (res.snapshot) this.emitter.emit('aviatorState', res.snapshot);
  }

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
