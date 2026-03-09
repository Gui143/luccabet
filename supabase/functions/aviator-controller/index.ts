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

// Calculate how long (ms) until a crash point is reached
function timeToMultiplier(mult: number): number {
  // mult = e^(0.08*t) => t = ln(mult)/0.08
  return (Math.log(mult) / 0.08) * 1000
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const body = await req.json()
    const action = body.action

    if (action === 'get_or_create_round') {
      const { data: active } = await supabase
        .from('aviator_rounds')
        .select('*')
        .in('status', ['waiting', 'countdown', 'flying'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (active) return json({ round: active })

      const crashPoint = generateCrashPoint()
      const { data: newRound, error } = await supabase
        .from('aviator_rounds')
        .insert({ crash_point: crashPoint, status: 'waiting' })
        .select()
        .single()

      if (error) throw error
      return json({ round: newRound })
    }

    if (action === 'start_countdown') {
      const { data: round } = await supabase
        .from('aviator_rounds')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!round) return json({ error: 'No waiting round' }, 400)

      const { error } = await supabase
        .from('aviator_rounds')
        .update({ status: 'countdown' })
        .eq('id', round.id)

      if (error) throw error
      return json({ success: true, round_id: round.id })
    }

    if (action === 'start_flight') {
      const { data: round } = await supabase
        .from('aviator_rounds')
        .select('*')
        .eq('status', 'countdown')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!round) return json({ error: 'No countdown round' }, 400)

      const now = new Date().toISOString()
      const { error } = await supabase
        .from('aviator_rounds')
        .update({ status: 'flying', started_at: now })
        .eq('id', round.id)

      if (error) throw error
      return json({ success: true, round_id: round.id, crash_point: round.crash_point, started_at: now })
    }

    if (action === 'crash') {
      const { data: round } = await supabase
        .from('aviator_rounds')
        .select('*')
        .eq('status', 'flying')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!round) return json({ error: 'No flying round' }, 400)

      const { error } = await supabase
        .from('aviator_rounds')
        .update({ status: 'crashed' })
        .eq('id', round.id)

      if (error) throw error

      // Auto-create next round
      const nextCrash = generateCrashPoint()
      await supabase
        .from('aviator_rounds')
        .insert({ crash_point: nextCrash, status: 'waiting' })

      return json({ success: true, crash_point: round.crash_point })
    }

    // Server-driven tick: runs full game loop
    if (action === 'tick') {
      const { data: active } = await supabase
        .from('aviator_rounds')
        .select('*')
        .in('status', ['waiting', 'countdown', 'flying'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!active) {
        // Create a new round
        const cp = generateCrashPoint()
        await supabase.from('aviator_rounds').insert({ crash_point: cp, status: 'waiting' })
        return json({ action: 'created_round' })
      }

      if (active.status === 'waiting') {
        // Transition to countdown
        await supabase.from('aviator_rounds').update({ status: 'countdown' }).eq('id', active.id)
        return json({ action: 'started_countdown', round_id: active.id })
      }

      if (active.status === 'countdown') {
        // Transition to flying
        const now = new Date().toISOString()
        await supabase.from('aviator_rounds').update({ status: 'flying', started_at: now }).eq('id', active.id)
        return json({ action: 'started_flight', round_id: active.id, crash_point: active.crash_point, started_at: now })
      }

      if (active.status === 'flying' && active.started_at) {
        const elapsed = Date.now() - new Date(active.started_at).getTime()
        const crashTime = timeToMultiplier(Number(active.crash_point))
        if (elapsed >= crashTime) {
          // Crash!
          await supabase.from('aviator_rounds').update({ status: 'crashed' }).eq('id', active.id)
          const nextCp = generateCrashPoint()
          await supabase.from('aviator_rounds').insert({ crash_point: nextCp, status: 'waiting' })
          return json({ action: 'crashed', crash_point: active.crash_point })
        }
        return json({ action: 'still_flying', elapsed })
      }

      return json({ action: 'no_op' })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})
