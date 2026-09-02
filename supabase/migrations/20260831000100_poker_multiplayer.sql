-- =====================================================================
-- Poker Texas Hold'em multiplayer (Lovable Cloud / Supabase)
-- Estado da mesa no servidor, cartas alheias nunca saem do banco.
-- Aplique esta migration no projeto (Lovable Cloud → Database → SQL).
-- =====================================================================

-- ---------------------------------------------------------------- mesas
CREATE TABLE IF NOT EXISTS public.poker_tables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_key text NOT NULL UNIQUE,
  name text NOT NULL,
  small_blind numeric NOT NULL DEFAULT 2,
  big_blind numeric NOT NULL DEFAULT 5,
  min_buy_in numeric NOT NULL DEFAULT 100,
  max_buy_in numeric NOT NULL DEFAULT 500,
  max_seats integer NOT NULL DEFAULT 6,
  turn_seconds integer NOT NULL DEFAULT 30,
  bots_enabled boolean NOT NULL DEFAULT true,
  hand_no integer NOT NULL DEFAULT 0,
  state jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Segredo da mesa (baralho restante): nenhuma policy => só service_role lê
CREATE TABLE IF NOT EXISTS public.poker_table_secrets (
  table_id uuid NOT NULL PRIMARY KEY REFERENCES public.poker_tables(id) ON DELETE CASCADE,
  -- estado completo da mesa (inclui o baralho e as cartas de cada jogador).
  -- Nenhuma policy de SELECT: só a edge function (service role) consegue ler.
  state jsonb,
  deck jsonb NOT NULL DEFAULT '[]'::jsonb,
  seed integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------- jogadores
CREATE TABLE IF NOT EXISTS public.poker_players (
  table_id uuid NOT NULL REFERENCES public.poker_tables(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seat integer NOT NULL,
  username text,
  chips numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (table_id, user_id),
  UNIQUE (table_id, seat)
);

-- Cartas do jogador (só o próprio vê — RLS por user_id)
CREATE TABLE IF NOT EXISTS public.poker_hole_cards (
  table_id uuid NOT NULL REFERENCES public.poker_tables(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seat integer NOT NULL,
  cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (table_id, user_id)
);

-- ------------------------------------------------------------------ RLS
ALTER TABLE public.poker_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_table_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_hole_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um vê as mesas" ON public.poker_tables;
CREATE POLICY "Qualquer um vê as mesas" ON public.poker_tables FOR SELECT USING (true);

DROP POLICY IF EXISTS "Qualquer um vê os jogadores" ON public.poker_players;
CREATE POLICY "Qualquer um vê os jogadores" ON public.poker_players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Jogador atualiza a propria cadeira" ON public.poker_players;
CREATE POLICY "Jogador atualiza a propria cadeira" ON public.poker_players
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cada um ve apenas suas cartas" ON public.poker_hole_cards;
CREATE POLICY "Cada um ve apenas suas cartas" ON public.poker_hole_cards
  FOR SELECT USING (auth.uid() = user_id);

-- Escrita só pelo service role (edge function). Sem policies de INSERT/UPDATE
-- para anon/authenticated: RLS nega tudo.

-- ------------------------------------------------------------- realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'poker_tables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poker_tables;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'poker_hole_cards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poker_hole_cards;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'poker_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poker_players;
  END IF;
END $$;

-- ---------------------------------------------------------------- seed
INSERT INTO public.poker_tables (table_key, name, small_blind, big_blind, min_buy_in, max_buy_in, max_seats, turn_seconds, bots_enabled)
VALUES
  ('texas-2-5',  'Mesa Rio',    2,  5,  100, 500,  6, 40, true),
  ('texas-5-10', 'Mesa Vegas',  5,  10, 200, 1000, 6, 40, true)
ON CONFLICT (table_key) DO NOTHING;

INSERT INTO public.poker_table_secrets (table_id, deck, seed)
SELECT id, '[]'::jsonb, 1 FROM public.poker_tables
ON CONFLICT (table_id) DO NOTHING;
