
-- Players table (generic, not tied to teams)
CREATE TABLE public.cbfd_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cbfd_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view players" ON public.cbfd_players FOR SELECT USING (true);
CREATE POLICY "CEO can insert players" ON public.cbfd_players FOR INSERT WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));
CREATE POLICY "CEO can update players" ON public.cbfd_players FOR UPDATE USING (has_role(auth.uid(), 'ceo'::app_role));
CREATE POLICY "CEO can delete players" ON public.cbfd_players FOR DELETE USING (has_role(auth.uid(), 'ceo'::app_role));

-- Game-Player assignment (which players are in which game/team side)
CREATE TABLE public.cbfd_game_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.cbfd_games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.cbfd_players(id) ON DELETE CASCADE,
  team_side TEXT NOT NULL CHECK (team_side IN ('a', 'b')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, player_id)
);

ALTER TABLE public.cbfd_game_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game players" ON public.cbfd_game_players FOR SELECT USING (true);
CREATE POLICY "CEO can insert game players" ON public.cbfd_game_players FOR INSERT WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));
CREATE POLICY "CEO can update game players" ON public.cbfd_game_players FOR UPDATE USING (has_role(auth.uid(), 'ceo'::app_role));
CREATE POLICY "CEO can delete game players" ON public.cbfd_game_players FOR DELETE USING (has_role(auth.uid(), 'ceo'::app_role));

-- Game results (detailed stats for settlement)
CREATE TABLE public.cbfd_game_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.cbfd_games(id) ON DELETE CASCADE UNIQUE,
  total_corners_a INT NOT NULL DEFAULT 0,
  total_corners_b INT NOT NULL DEFAULT 0,
  total_yellow_cards_a INT NOT NULL DEFAULT 0,
  total_yellow_cards_b INT NOT NULL DEFAULT 0,
  total_red_cards_a INT NOT NULL DEFAULT 0,
  total_red_cards_b INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cbfd_game_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game results" ON public.cbfd_game_results FOR SELECT USING (true);
CREATE POLICY "CEO can insert game results" ON public.cbfd_game_results FOR INSERT WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));
CREATE POLICY "CEO can update game results" ON public.cbfd_game_results FOR UPDATE USING (has_role(auth.uid(), 'ceo'::app_role));

-- Game scorers (which players scored)
CREATE TABLE public.cbfd_game_scorers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.cbfd_games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.cbfd_players(id) ON DELETE CASCADE,
  minute INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cbfd_game_scorers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game scorers" ON public.cbfd_game_scorers FOR SELECT USING (true);
CREATE POLICY "CEO can insert game scorers" ON public.cbfd_game_scorers FOR INSERT WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));
CREATE POLICY "CEO can delete game scorers" ON public.cbfd_game_scorers FOR DELETE USING (has_role(auth.uid(), 'ceo'::app_role));

-- Expand bet_type options by adding a market_type column to cbfd_bets
ALTER TABLE public.cbfd_bets ADD COLUMN market_type TEXT NOT NULL DEFAULT 'match_result';
ALTER TABLE public.cbfd_bets ADD COLUMN market_detail JSONB;

-- market_type values: 'match_result', 'over_under', 'btts', 'total_cards', 'total_corners', 'scorer', 'exact_score'
-- market_detail stores specifics like {"line": 2.5, "selection": "over"} or {"player_id": "uuid", "player_name": "Ronaldo"}
