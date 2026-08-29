-- Adiciona Sweet Bonanza (Pragmatic Play) às configurações de percentual de ganho
INSERT INTO public.game_odds_settings (game_key, display_name, win_chance)
VALUES ('sweet_bonanza', 'Sweet Bonanza', 40)
ON CONFLICT (game_key) DO NOTHING;
