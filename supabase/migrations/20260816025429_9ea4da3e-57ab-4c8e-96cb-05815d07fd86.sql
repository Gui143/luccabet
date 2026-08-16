CREATE TABLE public.game_odds_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  win_chance numeric NOT NULL DEFAULT 45,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.game_odds_settings TO anon;
GRANT SELECT ON public.game_odds_settings TO authenticated;
GRANT ALL ON public.game_odds_settings TO service_role;

ALTER TABLE public.game_odds_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game odds" ON public.game_odds_settings FOR SELECT USING (true);
CREATE POLICY "CEO can insert game odds" ON public.game_odds_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO can update game odds" ON public.game_odds_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ceo')) WITH CHECK (public.has_role(auth.uid(), 'ceo'));
CREATE POLICY "CEO can delete game odds" ON public.game_odds_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ceo'));

CREATE TRIGGER game_odds_settings_updated_at BEFORE UPDATE ON public.game_odds_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.game_odds_settings (game_key, display_name, win_chance) VALUES
  ('slots', 'Slots', 40),
  ('mines', 'Mines', 45),
  ('roulette', 'Roulette', 45),
  ('blackjack', 'Blackjack', 45),
  ('baccarat', 'Baccarat', 45),
  ('fortune_tiger', 'Gates of Olympus', 40),
  ('aviator', 'Aviator', 45);