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

    // Check if user is CEO
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify CEO role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'ceo');

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: CEO access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { game_id, winner_team, score_a, score_b } = await req.json();

    if (!game_id || !winner_team) {
      return new Response(
        JSON.stringify({ error: 'Missing game_id or winner_team' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Settling match ${game_id}, winner: ${winner_team}`);

    // Get the game
    const { data: game, error: gameError } = await supabase
      .from('cbfd_games')
      .select('*')
      .eq('id', game_id)
      .single();

    if (gameError || !game) {
      console.error('Game not found:', gameError);
      return new Response(
        JSON.stringify({ error: 'Game not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (game.settled_at) {
      return new Response(
        JSON.stringify({ error: 'Game already settled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the game with result
    const { error: updateGameError } = await supabase
      .from('cbfd_games')
      .update({
        winner_team,
        score_a: score_a ?? null,
        score_b: score_b ?? null,
        settled_at: new Date().toISOString(),
        is_active: false
      })
      .eq('id', game_id);

    if (updateGameError) {
      console.error('Error updating game:', updateGameError);
      return new Response(
        JSON.stringify({ error: 'Failed to update game' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all open bets for this game
    const { data: bets, error: betsError } = await supabase
      .from('cbfd_bets')
      .select('*')
      .eq('game_id', game_id)
      .eq('status', 'open');

    if (betsError) {
      console.error('Error fetching bets:', betsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${bets?.length || 0} open bets for this game`);

    let winnersCount = 0;
    let losersCount = 0;
    let totalPaidOut = 0;

    // Process each bet
    for (const bet of bets || []) {
      const isWinner = bet.selected_team === winner_team;
      const newStatus = isWinner ? 'won' : 'lost';

      // Update bet status
      await supabase
        .from('cbfd_bets')
        .update({ status: newStatus })
        .eq('id', bet.id);

      if (isWinner) {
        // Credit winnings to user
        const winAmount = parseFloat(bet.potential_win);
        
        // Get current balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', bet.user_id)
          .single();

        if (profile) {
          const newBalance = parseFloat(profile.balance) + winAmount;
          await supabase
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', bet.user_id);

          console.log(`Credited ${winAmount} to user ${bet.user_id}. New balance: ${newBalance}`);
          totalPaidOut += winAmount;
        }

        winnersCount++;
      } else {
        losersCount++;
      }
    }

    console.log(`Settlement complete. Winners: ${winnersCount}, Losers: ${losersCount}, Total paid: ${totalPaidOut}`);

    return new Response(
      JSON.stringify({
        success: true,
        game_id,
        winner_team,
        bets_processed: bets?.length || 0,
        winners: winnersCount,
        losers: losersCount,
        total_paid_out: totalPaidOut
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in settle-match function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
