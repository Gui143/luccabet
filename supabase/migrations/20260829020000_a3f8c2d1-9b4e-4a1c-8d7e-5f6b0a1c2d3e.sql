-- =====================================================================
-- Temas de caça-níqueis do app (ativados pelo painel admin / CEO)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.app_themes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  image_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_themes TO anon;
GRANT SELECT ON public.app_themes TO authenticated;
GRANT ALL ON public.app_themes TO service_role;

ALTER TABLE public.app_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view app themes" ON public.app_themes;
CREATE POLICY "Anyone can view app themes" ON public.app_themes FOR SELECT USING (true);
DROP POLICY IF EXISTS "CEO can insert app themes" ON public.app_themes;
CREATE POLICY "CEO can insert app themes" ON public.app_themes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ceo'));
DROP POLICY IF EXISTS "CEO can update app themes" ON public.app_themes;
CREATE POLICY "CEO can update app themes" ON public.app_themes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ceo')) WITH CHECK (public.has_role(auth.uid(), 'ceo'));
DROP POLICY IF EXISTS "CEO can delete app themes" ON public.app_themes;
CREATE POLICY "CEO can delete app themes" ON public.app_themes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ceo'));

DROP TRIGGER IF EXISTS app_themes_updated_at ON public.app_themes;
CREATE TRIGGER app_themes_updated_at BEFORE UPDATE ON public.app_themes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.app_themes (theme_key, display_name, image_url, is_active, sort_order) VALUES
  ('classic_777', 'Clássico 777', '/themes/classic-777.jpg', false, 1),
  ('gold_jackpot', 'Jackpot Dourado', '/themes/gold-jackpot.jpg', false, 2),
  ('neon_vegas', 'Vegas Neon', '/themes/neon-vegas.jpg', false, 3),
  ('royal_diamonds', 'Diamantes Reais', '/themes/royal-diamonds.jpg', false, 4)
ON CONFLICT (theme_key) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_themes;

-- =====================================================================
-- Garante que TODOS os jogos tenham percentual configurável no painel
-- =====================================================================
INSERT INTO public.game_odds_settings (game_key, display_name, win_chance) VALUES
  ('aviator', 'Aviator', 45),
  ('sweet_bonanza', 'Sweet Bonanza', 40),
  ('gates_olympus', 'Gates of Olympus', 40),
  ('slots', 'Slots', 40),
  ('mines', 'Mines', 45),
  ('roulette', 'Roleta', 45),
  ('blackjack', 'Blackjack', 45),
  ('baccarat', 'Baccarat', 45)
ON CONFLICT (game_key) DO NOTHING;

-- Chave antiga "fortune_tiger" passa a se chamar Gates of Olympus (mantemos a row legada inativa)
UPDATE public.game_odds_settings
SET display_name = 'Gates of Olympus (legado)', is_active = false
WHERE game_key = 'fortune_tiger';
