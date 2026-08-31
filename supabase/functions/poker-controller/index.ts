/**
 * poker-controller — mesa de Texas Hold'em autoritativa (Lovable Cloud).
 *
 * Estado completo (baralho + cartas de cada jogador) fica em
 * public.poker_table_secrets, que NÃO tem policy de SELECT: só esta função
 * (service role) lê. O que vai para o cliente, via Realtime, é
 * public.poker_tables.state = toPublicState(estado) — cartas alheias viram
 * 'back'. Cada jogador recebe as próprias cartas por public.poker_hole_cards
 * (RLS por user_id).
 *
 * Ações: list_tables | state | join | leave | act | set_bots | start_hand | tick
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  applyAction,
  createState,
  findSeatByPlayer,
  sitDown,
  standUp,
  startHand,
  tick,
  toPublicState,
  type ActionType,
  type PokerState,
} from '../_shared/poker-engine.ts';
import { decideBot } from '../_shared/poker-bot.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const BOT_NAMES = ['Ana', 'Bruno', 'Caio', 'Duda', 'Elisa', 'Felipe', 'Gabi', 'Henrique'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // usuário que está chamando (JWT do cliente)
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const { data: userData } = await supabase.auth.getUser(token);
  const userId = userData?.user?.id ?? null;
  if (!userId) return json({ error: 'Não autenticado' }, 401);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* corpo vazio */
  }
  const action = body.action as string;

  // ------------------------------------------------------------ helpers
  const loadTable = async (tableKey: string) => {
    const { data: table, error } = await supabase
      .from('poker_tables')
      .select('*')
      .eq('table_key', tableKey)
      .single();
    if (error || !table) throw new Error('Mesa não encontrada');
    const { data: secret } = await supabase
      .from('poker_table_secrets')
      .select('state, deck, seed')
      .eq('table_id', table.id)
      .single();

    const state: PokerState = (secret?.state as unknown as PokerState) ??
      createState({
        tableId: table.table_key,
        tableName: table.name,
        maxSeats: table.max_seats,
        smallBlind: Number(table.small_blind),
        bigBlind: Number(table.big_blind),
        minBuyIn: Number(table.min_buy_in),
        maxBuyIn: Number(table.max_buy_in),
        turnSeconds: table.turn_seconds,
      });
    return { table, state };
  };

  const saveTable = async (tableId: string, state: PokerState) => {
    const { deck, ...publicWithoutDeck } = state;
    const publicState = toPublicState(state, null);

    await supabase
      .from('poker_table_secrets')
      .update({ state: state as unknown as Record<string, unknown>, deck, updated_at: new Date().toISOString() })
      .eq('table_id', tableId);

    await supabase
      .from('poker_tables')
      .update({
        state: publicState as unknown as Record<string, unknown>,
        hand_no: state.handNo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tableId);

    // fichas + status por jogador
    for (const seat of state.seats) {
      if (!seat.playerId || seat.isBot) continue;
      await supabase
        .from('poker_players')
        .update({ chips: seat.chips, status: seat.status, username: seat.name, updated_at: new Date().toISOString() })
        .eq('table_id', tableId)
        .eq('user_id', seat.playerId);

      await supabase
        .from('poker_hole_cards')
        .upsert(
          {
            table_id: tableId,
            user_id: seat.playerId,
            seat: seat.index,
            cards: seat.hole,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'table_id,user_id' },
        );
    }

    void publicWithoutDeck;
  };

  const getBalance = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('balance').eq('id', uid).single();
    return Number((data as any)?.balance ?? 0);
  };

  const setBalance = async (uid: string, value: number) => {
    await supabase.from('profiles').update({ balance: Math.round(value * 100) / 100 }).eq('id', uid);
  };

  const publicPayload = async (tableKey: string, state: PokerState, uid: string) => ({
    ok: true,
    state: toPublicState(state, uid),
    you: { seat: findSeatByPlayer(state, uid), balance: await getBalance(uid) },
    tableKey,
  });

  // robôs: preenchem cadeiras vazias e jogam sozinhos quando habilitado
  const runBots = (table: any, state: PokerState, now: number): PokerState => {
    if (!table.bots_enabled) return state;
    let s = state;
    const humans = s.seats.filter((x) => x.playerId && !x.isBot).length;
    if (humans === 0) return s;
    const bots = s.seats.filter((x) => x.isBot && x.playerId).length;
    const target = Math.max(0, Math.min(s.maxSeats - humans, 5 - humans));
    if (bots < target) {
      const free = s.seats.findIndex((x) => !x.playerId);
      if (free >= 0) {
        const buyIn = s.minBuyIn + Math.floor(Math.random() * (s.maxBuyIn - s.minBuyIn));
        const res = sitDown(s, free, {
          playerId: `bot:${table.id}:${Math.random().toString(36).slice(2, 8)}`,
          name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
          buyIn,
          isBot: true,
        });
        if (!res.error) s = res.state;
      }
    }
    if (bots > target) {
      const bot = s.seats.find((x) => x.isBot && x.playerId);
      if (bot?.playerId) s = standUp(s, bot.playerId).state;
    }
    // vez do bot
    let guard = 0;
    while (s.turnSeat !== null && s.seats[s.turnSeat]?.isBot && guard < 8) {
      guard += 1;
      const d = decideBot(s, s.turnSeat);
      const res = applyAction(s, s.turnSeat, d.action, d.amount, now);
      if (!res.ok) break;
      s = res.state;
    }
    return s;
  };

  try {
    // ------------------------------------------------------- listar mesas
    if (action === 'list_tables') {
      const { data: tables } = await supabase.from('poker_tables').select('*').order('min_buy_in');
      const { data: players } = await supabase.from('poker_players').select('table_id, user_id');
      const list = (tables ?? []).map((t: any) => ({
        tableId: t.table_key,
        tableName: t.name,
        smallBlind: Number(t.small_blind),
        bigBlind: Number(t.big_blind),
        minBuyIn: Number(t.min_buy_in),
        maxBuyIn: Number(t.max_buy_in),
        maxSeats: t.max_seats,
        botsEnabled: t.bots_enabled,
        players: (players ?? []).filter((p: any) => p.table_id === t.id).length,
        phase: (t.state as any)?.phase ?? 'idle',
      }));
      return json({ ok: true, tables: list });
    }

    const tableKey = String(body.table_key ?? 'texas-2-5');
    const { table, state: initial } = await loadTable(tableKey);
    const now = Date.now();
    let state = initial;

    // ------------------------------------------------------------- estado
    if (action === 'state') return json(await publicPayload(tableKey, state, userId));

    // -------------------------------------------------------------- entrar
    if (action === 'join') {
      const buyIn = Number(body.buy_in ?? table.min_buy_in);
      const seat = Number.isFinite(body.seat) ? Number(body.seat) : state.seats.findIndex((s) => !s.playerId);
      if (seat < 0 || seat >= state.maxSeats) return json({ error: 'Cadeira inválida' }, 400);
      if (buyIn < Number(table.min_buy_in) || buyIn > Number(table.max_buy_in)) {
        return json({ error: `Buy-in deve estar entre R$ ${table.min_buy_in} e R$ ${table.max_buy_in}` }, 400);
      }
      const balance = await getBalance(userId);
      if (balance < buyIn) return json({ error: 'Saldo insuficiente' }, 400);

      const { data: profile } = await supabase.from('profiles').select('username').eq('id', userId).single();
      const name = (profile as any)?.username ?? 'Jogador';

      const res = sitDown(state, seat, { playerId: userId, name, buyIn });
      if (res.error) return json({ error: res.error }, 400);
      state = res.state;

      await setBalance(userId, balance - buyIn);
      await supabase.from('poker_players').upsert(
        {
          table_id: table.id,
          user_id: userId,
          seat,
          username: name,
          chips: state.seats[seat].chips,
          status: state.seats[seat].status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'table_id,user_id' },
      );

      // sempre roda um tick para a mesa andar sozinha
      state = runBots(table, state, now);
      state = tick(state, now).state;
      await saveTable(table.id, state);
      return json(await publicPayload(tableKey, state, userId));
    }

    // --------------------------------------------------------------- sair
    if (action === 'leave') {
      const { state: next, returned } = standUp(state, userId);
      state = next;
      if (returned > 0) await setBalance(userId, (await getBalance(userId)) + returned);
      await supabase.from('poker_players').delete().eq('table_id', table.id).eq('user_id', userId);
      await supabase.from('poker_hole_cards').delete().eq('table_id', table.id).eq('user_id', userId);
      state = runBots(table, state, now);
      state = tick(state, now).state;
      await saveTable(table.id, state);
      return json({ ...(await publicPayload(tableKey, state, userId)), returned });
    }

    // -------------------------------------------------------------- agir
    if (action === 'act') {
      const seat = findSeatByPlayer(state, userId);
      if (seat < 0) return json({ error: 'Você não está sentado nesta mesa' }, 400);
      const move = String(body.move ?? 'check') as ActionType;
      const amount = Number(body.amount ?? 0);
      const res = applyAction(state, seat, move, amount, now);
      if (!res.ok) return json({ error: res.error ?? 'Ação inválida' }, 400);
      state = res.state;
      state = runBots(table, state, now);
      state = tick(state, now).state;
      await saveTable(table.id, state);
      return json(await publicPayload(tableKey, state, userId));
    }

    // -------------------------------------------------------------- bots
    if (action === 'set_bots') {
      await supabase.from('poker_tables').update({ bots_enabled: Boolean(body.enabled) }).eq('id', table.id);
      table.bots_enabled = Boolean(body.enabled);
      state = runBots(table, state, now);
      state = tick(state, now).state;
      await saveTable(table.id, state);
      return json(await publicPayload(tableKey, state, userId));
    }

    // -------------------------------------------------- iniciar nova mão
    if (action === 'start_hand') {
      if (state.phase !== 'idle' && state.phase !== 'finished') {
        return json({ error: 'Ainda há uma mão em andamento' }, 400);
      }
      state = startHand(state, now, true);
      state = runBots(table, state, now);
      await saveTable(table.id, state);
      return json(await publicPayload(tableKey, state, userId));
    }

    // -------------------------------------------------------------- tick
    if (action === 'tick') {
      const before = JSON.stringify(toPublicState(state, null));
      state = runBots(table, state, now);
      state = tick(state, now).state;
      const after = JSON.stringify(toPublicState(state, null));
      if (before !== after) await saveTable(table.id, state);
      return json(await publicPayload(tableKey, state, userId));
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err) {
    return json({ error: (err as Error).message ?? 'Erro interno' }, 500);
  }
});
