import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'ceo');
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { 
      game_id, winner_team, score_a, score_b,
      total_corners_a, total_corners_b,
      total_yellow_cards_a, total_yellow_cards_b,
      total_red_cards_a, total_red_cards_b,
      scorer_ids
    } = await req.json();

    if (!game_id || !winner_team) {
      return new Response(JSON.stringify({ error: 'Missing game_id or winner_team' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: game, error: gameError } = await supabase
      .from('cbfd_games').select('*').eq('id', game_id).single();

    if (gameError || !game) {
      return new Response(JSON.stringify({ error: 'Game not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (game.settled_at) {
      return new Response(JSON.stringify({ error: 'Game already settled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update game
    await supabase.from('cbfd_games').update({
      winner_team, score_a: score_a ?? null, score_b: score_b ?? null,
      settled_at: new Date().toISOString(), is_active: false
    }).eq('id', game_id);

    // Save detailed results
    const cornersA = total_corners_a ?? 0;
    const cornersB = total_corners_b ?? 0;
    const yellowA = total_yellow_cards_a ?? 0;
    const yellowB = total_yellow_cards_b ?? 0;
    const redA = total_red_cards_a ?? 0;
    const redB = total_red_cards_b ?? 0;
    const totalGoals = (score_a ?? 0) + (score_b ?? 0);
    const totalCorners = cornersA + cornersB;
    const totalCards = yellowA + yellowB + redA + redB;
    const bothScored = (score_a ?? 0) > 0 && (score_b ?? 0) > 0;
    const scorerIdsList: string[] = scorer_ids ?? [];

    await supabase.from('cbfd_game_results').upsert({
      game_id,
      total_corners_a: cornersA, total_corners_b: cornersB,
      total_yellow_cards_a: yellowA, total_yellow_cards_b: yellowB,
      total_red_cards_a: redA, total_red_cards_b: redB,
    }, { onConflict: 'game_id' });

    // Save scorers
    if (scorerIdsList.length > 0) {
      const scorerInserts = scorerIdsList.map(pid => ({ game_id, player_id: pid }));
      await supabase.from('cbfd_game_scorers').insert(scorerInserts);
    }

    // Get all open bets
    const { data: bets } = await supabase
      .from('cbfd_bets').select('*').eq('game_id', game_id).eq('status', 'open');

    let winnersCount = 0;
    let losersCount = 0;
    let totalPaidOut = 0;

    for (const bet of bets || []) {
      let isWinner = false;
      const marketType = bet.market_type || 'match_result';
      const detail = bet.market_detail as Record<string, any> || {};

      switch (marketType) {
        case 'match_result': {
          if (winner_team === 'draw') {
            isWinner = bet.bet_type === 'draw' || detail?.selection === 'draw';
          } else if (winner_team === game.team_a) {
            isWinner = bet.bet_type === 'team_a' || detail?.selection === 'team_a' || 
                       (bet.bet_type === null && bet.selected_team === game.team_a);
          } else if (winner_team === game.team_b) {
            isWinner = bet.bet_type === 'team_b' || detail?.selection === 'team_b' ||
                       (bet.bet_type === null && bet.selected_team === game.team_b);
          }
          break;
        }
        case 'over_under': {
          const line = detail?.line;
          const sel = detail?.selection;
          if (sel === 'over') isWinner = totalGoals > line;
          else if (sel === 'under') isWinner = totalGoals < line;
          break;
        }
        case 'btts': {
          const sel = detail?.selection;
          if (sel === 'yes') isWinner = bothScored;
          else if (sel === 'no') isWinner = !bothScored;
          break;
        }
        case 'total_corners': {
          const line = detail?.line;
          const sel = detail?.selection;
          if (sel === 'over') isWinner = totalCorners > line;
          else if (sel === 'under') isWinner = totalCorners < line;
          break;
        }
        case 'total_cards': {
          const line = detail?.line;
          const sel = detail?.selection;
          if (sel === 'over') isWinner = totalCards > line;
          else if (sel === 'under') isWinner = totalCards < line;
          break;
        }
        case 'scorer': {
          const playerId = detail?.player_id;
          isWinner = scorerIdsList.includes(playerId);
          break;
        }
        case 'exact_score': {
          isWinner = detail?.score_a === (score_a ?? 0) && detail?.score_b === (score_b ?? 0);
          break;
        }
      }

      await supabase.from('cbfd_bets').update({ status: isWinner ? 'won' : 'lost' }).eq('id', bet.id);

      if (isWinner) {
        const winAmount = parseFloat(bet.potential_win);
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', bet.user_id).single();
        if (profile) {
          await supabase.from('profiles').update({ balance: parseFloat(profile.balance) + winAmount }).eq('id', bet.user_id);
          totalPaidOut += winAmount;
        }
        winnersCount++;
      } else {
        losersCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true, game_id, winner_team,
      bets_processed: bets?.length || 0, winners: winnersCount, losers: losersCount, total_paid_out: totalPaidOut
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
