import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'Código inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trimmedCode = code.trim().toUpperCase();

    // Find the promo code
    const { data: promoCode, error: codeError } = await supabaseClient
      .from('promo_codes')
      .select('*')
      .eq('code', trimmedCode)
      .maybeSingle();

    if (codeError) {
      console.error('Error finding code:', codeError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar código' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!promoCode) {
      return new Response(JSON.stringify({ error: 'Código não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if code is active
    if (!promoCode.is_active) {
      return new Response(JSON.stringify({ error: 'Código desativado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if expired
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Código expirado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check max uses
    if (promoCode.max_uses !== null && promoCode.current_uses >= promoCode.max_uses) {
      return new Response(JSON.stringify({ error: 'Código atingiu limite de usos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user already used this code
    const { data: existingRedemption } = await supabaseClient
      .from('promo_code_redemptions')
      .select('id')
      .eq('code_id', promoCode.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingRedemption) {
      return new Response(JSON.stringify({ error: 'Você já usou este código' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's current balance
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Perfil não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newBalance = Number(profile.balance) + Number(promoCode.bonus_amount);

    // Update user balance
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating balance:', updateError);
      return new Response(JSON.stringify({ error: 'Erro ao atualizar saldo' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record the redemption
    const { error: redemptionError } = await supabaseClient
      .from('promo_code_redemptions')
      .insert({
        code_id: promoCode.id,
        user_id: user.id
      });

    if (redemptionError) {
      console.error('Error recording redemption:', redemptionError);
    }

    // Increment current_uses
    await supabaseClient
      .from('promo_codes')
      .update({ current_uses: promoCode.current_uses + 1 })
      .eq('id', promoCode.id);

    console.log(`User ${user.id} redeemed code ${trimmedCode} for ${promoCode.bonus_amount}`);

    return new Response(JSON.stringify({ 
      success: true, 
      bonus: promoCode.bonus_amount,
      new_balance: newBalance
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Redeem code error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
