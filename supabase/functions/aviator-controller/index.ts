import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function generateCrashPoint(): number {
  const houseEdge = 0.06
  const r = Math.random()
  if (r < 0.08) return 1.00
  const adjusted = (r - 0.08) / 0.92
  const raw = 1 / (1 - adjusted * (1 - houseEdge))
  return Math.min(100, Math.max(1.01, parseFloat(raw.toFixed(2))))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { action } = await req.json()

    if (action === 'get_or_create_round') {
      // Check for active round
      const { data: active } = await supabase
        .from('aviator_rounds')
        .select('*')
        .in('status', ['waiting', 'countdown', 'flying'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (active) {
        return new Response(JSON.stringify({ round: active }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Create new round
      const crashPoint = generateCrashPoint()
      const { data: newRound, error } = await supabase
        .from('aviator_rounds')
        .insert({ crash_point: crashPoint, status: 'waiting' })
        .select()
        .single()

      if (error) throw error
      return new Response(JSON.stringify({ round: newRound }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'start_countdown') {
      const { round_id } = await req.json().catch(() => ({}))
      
      // Get current waiting round
      const { data: round } = await supabase
        .from('aviator_rounds')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!round) {
        return new Response(JSON.stringify({ error: 'No waiting round' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { error } = await supabase
        .from('aviator_rounds')
        .update({ status: 'countdown' })
        .eq('id', round.id)

      if (error) throw error
      return new Response(JSON.stringify({ success: true, round_id: round.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'start_flight') {
      const { round_id } = await req.json().catch(() => ({}))

      // Find countdown round
      const { data: round } = await supabase
        .from('aviator_rounds')
        .select('*')
        .eq('status', 'countdown')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!round) {
        return new Response(JSON.stringify({ error: 'No countdown round' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { error } = await supabase
        .from('aviator_rounds')
        .update({ status: 'flying', started_at: new Date().toISOString() })
        .eq('id', round.id)

      if (error) throw error
      return new Response(JSON.stringify({ success: true, round_id: round.id, crash_point: round.crash_point }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'crash') {
      const { round_id } = await req.json().catch(() => ({}))

      const { data: round } = await supabase
        .from('aviator_rounds')
        .select('*')
        .eq('status', 'flying')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!round) {
        return new Response(JSON.stringify({ error: 'No flying round' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { error } = await supabase
        .from('aviator_rounds')
        .update({ status: 'crashed' })
        .eq('id', round.id)

      if (error) throw error

      // Auto-create next round after marking crash
      const nextCrash = generateCrashPoint()
      await supabase
        .from('aviator_rounds')
        .insert({ crash_point: nextCrash, status: 'waiting' })

      return new Response(JSON.stringify({ success: true, crash_point: round.crash_point }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
