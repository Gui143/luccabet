/**
 * aviator-controller — rodadas do Aviator no servidor (Lovable Cloud).
 *
 * SEM BOTS: nenhum jogador falso, nenhum multiplicador ou saque inventado.
 * A lista de apostas vem de public.aviator_bets (só apostas reais) e o crash
 * point é derivado de um hash SHA-256 publicado antes da rodada (provably fair).
 *
 * Ações: snapshot | place_bet | cancel_bet | cashout | tick | get_or_create_round
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const COUNTDOWN_MS = 6000;
const CRASHED_MS = 3200;
const GROWTH = 0.15; // multiplicador = e^(0.15 * t)
const HOUSE_EDGE = 0.06;

async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const randomSeed = () => crypto.getRandomValues(new Uint32Array(3)).join('');

/** Crash point determinístico a partir do hash publicado antes da rodada. */
function crashFromHash(hash: string): number {
  const r = parseInt(hash.slice(0, 13), 16) / 0xfffffffffffff;
  if (r < HOUSE_EDGE) return 1.0;
  return Math.max(1.0, Math.min(1000, Math.round(((1 - HOUSE_EDGE) / (1 - r)) * 100) / 100));
}

const multiplierOf = (startedAt: string | null, nowMs: number) =>
  startedAt ? Math.exp((GROWTH * (nowMs - new Date(startedAt).getTime())) / 1000) : 1;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const authHeader = req.headers.get('Authorization') ?? '';
  const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  const userId = userData?.user?.id ?? null;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* corpo vazio */
  }
  const action = body.action as string;

  // ------------------------------------------------------------- helpers
  const activeRound = async () => {
    const { data } = await supabase
      .from('aviator_rounds')
      .select('*')
      .in('status', ['waiting', 'flying'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as any;
  };

  const createRound = async () => {
    const seed = randomSeed();
    const hash = await sha256(`${seed}:${Date.now()}`);
    const { data } = await supabase
      .from('aviator_rounds')
      .insert({ crash_point: crashFromHash(hash), status: 'waiting', server_hash: hash, server_seed: seed })
      .select()
      .single();
    return data as any;
  };

  /** Avança a máquina de estados da rodada (idempotente, guiada pelo banco). */
  const advance = async () => {
    let round = await activeRound();
    if (!round) round = await createRound();
    const now = Date.now();

    if (round.status === 'waiting') {
      const elapsed = now - new Date(round.created_at).getTime();
      if (elapsed < COUNTDOWN_MS) return round;
      const { data } = await supabase
        .from('aviator_rounds')
        .update({ status: 'flying', started_at: new Date().toISOString() })
        .eq('id', round.id)
        .select()
        .single();
      return (data ?? round) as any;
    }

    if (round.status === 'flying') {
      const m = multiplierOf(round.started_at, now);
      // auto cashout configurado pelo próprio jogador
      const { data: pending } = await supabase
        .from('aviator_bets')
        .select('*')
        .eq('round_id', round.id)
        .is('cashed_out_at', null)
        .not('auto_cashout', 'is', null);
      for (const bet of (pending ?? []) as any[]) {
        if (Number(bet.auto_cashout) > 0 && m >= Number(bet.auto_cashout)) {
          const win = Math.round(Number(bet.amount) * Number(bet.auto_cashout) * 100) / 100;
          await supabase.from('aviator_bets').update({ cashed_out_at: Number(bet.auto_cashout) }).eq('id', bet.id);
          await creditUser(supabase, bet.user_id, win);
        }
      }

      if (m < Number(round.crash_point)) return round;
      const { data } = await supabase
        .from('aviator_rounds')
        .update({ status: 'crashed', ends_at: new Date().toISOString() })
        .eq('id', round.id)
        .select()
        .single();
      return (data ?? round) as any;
    }

    return round;
  };

  const snapshot = async () => {
    const round = await advance();
    const now = Date.now();
    const mult = round.status === 'flying' ? multiplierOf(round.started_at, now) : round.status === 'crashed' ? Number(round.crash_point) : 1;

    const { data: bets } = await supabase
      .from('aviator_bets')
      .select('id, user_id, amount, auto_cashout, cashed_out_at, profiles(username)')
      .eq('round_id', round.id);

    const betRows = (bets ?? []) as any[];

    const { data: historyRows } = await supabase
      .from('aviator_rounds')
      .select('crash_point')
      .eq('status', 'crashed')
      .order('created_at', { ascending: false })
      .limit(40);

    return {
      phase: round.status,
      countdown:
        round.status === 'waiting'
          ? Math.max(0, Math.ceil((COUNTDOWN_MS - (now - new Date(round.created_at).getTime())) / 1000))
          : round.status === 'crashed'
            ? Math.max(0, Math.ceil((CRASHED_MS - (now - new Date(round.ends_at ?? new Date().toISOString()).getTime())) / 1000))
            : 0,
      multiplier: Math.round(mult * 100) / 100,
      crashPoint: round.status === 'crashed' ? Number(round.crash_point) : null,
      roundId: round.id,
      serverHash: round.server_hash ?? '',
      serverSeed: round.status === 'crashed' ? (round.server_seed ?? null) : null,
      history: ((historyRows ?? []) as any[]).map((h) => Number(h.crash_point)),
      bets: betRows.map((b) => ({
        name: b.profiles?.username ?? 'Jogador',
        amount: Number(b.amount),
        cashedOutAt: b.cashed_out_at === null ? null : Number(b.cashed_out_at),
        you: b.user_id === userId,
      })),
      totals: {
        players: betRows.length,
        totalBet: betRows.reduce((a, b) => a + Number(b.amount), 0),
        cashedOut: betRows.filter((b) => b.cashed_out_at !== null).length,
      },
    };
  };

  try {
    if (action === 'snapshot') return json({ ok: true, snapshot: await snapshot() });
    if (action === 'tick') return json({ ok: true, snapshot: await snapshot() });
    if (action === 'get_or_create_round') return json({ ok: true, round: await advance() });
    if (action === 'start_countdown' || action === 'start_flight' || action === 'crash') {
      return json({ ok: true, snapshot: await snapshot() });
    }

    if (!userId) return json({ error: 'Não autenticado' }, 401);

    const balanceOf = async (uid: string) => {
      const { data } = await supabase.from('profiles').select('balance').eq('id', uid).single();
      return Number((data as any)?.balance ?? 0);
    };

    // ------------------------------------------------------------ apostar
    if (action === 'place_bet') {
      const amount = Math.round(Number(body.amount) * 100) / 100;
      const auto = body.auto_cashout ? Math.round(Number(body.auto_cashout) * 100) / 100 : null;
      if (!Number.isFinite(amount) || amount < 1) return json({ error: 'Aposta mínima é R$ 1,00' }, 400);

      const round = await advance();
      if (round.status !== 'waiting') return json({ error: 'Apostas encerradas para esta rodada' }, 400);

      const balance = await balanceOf(userId);
      if (balance < amount) return json({ error: 'Saldo insuficiente' }, 400);

      const { data: existing } = await supabase
        .from('aviator_bets')
        .select('id, amount')
        .eq('round_id', round.id)
        .eq('user_id', userId)
        .maybeSingle();
      if (existing) {
        // substitui a aposta anterior
        await creditUser(supabase, userId, Number((existing as any).amount));
        await supabase.from('aviator_bets').delete().eq('id', (existing as any).id);
      }

      const { error } = await supabase
        .from('aviator_bets')
        .insert({ round_id: round.id, user_id: userId, amount, auto_cashout: auto });
      if (error) return json({ error: error.message }, 400);

      await creditUser(supabase, userId, -amount);
      return json({ ok: true, balance: await balanceOf(userId), snapshot: await snapshot() });
    }

    // ----------------------------------------------------------- cancelar
    if (action === 'cancel_bet') {
      const round = await advance();
      if (round.status !== 'waiting') return json({ error: 'Rodada já iniciada' }, 400);
      const { data: bet } = await supabase
        .from('aviator_bets')
        .select('id, amount')
        .eq('round_id', round.id)
        .eq('user_id', userId)
        .maybeSingle();
      if (!bet) return json({ error: 'Nenhuma aposta para cancelar' }, 400);
      await supabase.from('aviator_bets').delete().eq('id', (bet as any).id);
      await creditUser(supabase, userId, Number((bet as any).amount));
      return json({ ok: true, balance: await balanceOf(userId), snapshot: await snapshot() });
    }

    // ------------------------------------------------------------- sacar
    if (action === 'cashout') {
      const round = await advance();
      if (round.status !== 'flying') return json({ error: 'O avião ainda não decolou' }, 400);
      const mult = Math.round(multiplierOf(round.started_at, Date.now()) * 100) / 100;
      const { data: bet } = await supabase
        .from('aviator_bets')
        .select('id, amount, cashed_out_at')
        .eq('round_id', round.id)
        .eq('user_id', userId)
        .maybeSingle();
      if (!bet) return json({ error: 'Nenhuma aposta ativa' }, 400);
      if ((bet as any).cashed_out_at !== null) return json({ error: 'Você já sacou nesta rodada' }, 400);

      const amount = Number((bet as any).amount);
      const win = Math.round(amount * mult * 100) / 100;
      await supabase.from('aviator_bets').update({ cashed_out_at: mult }).eq('id', (bet as any).id);
      await creditUser(supabase, userId, win);
      return json({ ok: true, multiplier: mult, win, balance: await balanceOf(userId), snapshot: await snapshot() });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err) {
    return json({ error: (err as Error).message ?? 'Erro interno' }, 500);
  }
});

/** Credita (ou debita, se negativo) o saldo do jogador. */
async function creditUser(supabase: any, userId: string, amount: number) {
  const { data } = await supabase.from('profiles').select('balance').eq('id', userId).single();
  const current = Number((data as any)?.balance ?? 0);
  await supabase
    .from('profiles')
    .update({ balance: Math.round((current + amount) * 100) / 100 })
    .eq('id', userId);
}
