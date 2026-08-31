-- =====================================================================
-- Aviator: apenas jogadores reais (apostas e saques de verdade no banco)
-- =====================================================================

-- Colunas de auditoria (provably fair) na rodada
ALTER TABLE public.aviator_rounds ADD COLUMN IF NOT EXISTS server_hash text;
ALTER TABLE public.aviator_rounds ADD COLUMN IF NOT EXISTS server_seed text;
ALTER TABLE public.aviator_rounds ADD COLUMN IF NOT EXISTS ends_at timestamptz;

-- ------------------------------------------------------------- apostas
CREATE TABLE IF NOT EXISTS public.aviator_bets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id uuid NOT NULL REFERENCES public.aviator_rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  auto_cashout numeric,
  cashed_out_at numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, user_id)
);

ALTER TABLE public.aviator_bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos veem as apostas da rodada" ON public.aviator_bets;
CREATE POLICY "Todos veem as apostas da rodada" ON public.aviator_bets FOR SELECT USING (true);

-- INSERT/UPDATE apenas pelo service role (edge function valida saldo e saque).
-- Nenhuma policy de escrita para anon/authenticated: RLS nega.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'aviator_bets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.aviator_bets;
  END IF;
END $$;
