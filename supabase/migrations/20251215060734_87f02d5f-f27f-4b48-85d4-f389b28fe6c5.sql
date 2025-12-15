-- Create bet status enum
CREATE TYPE public.cbfd_bet_status AS ENUM ('open', 'won', 'lost');

-- Create cbfd_bets table for storing user bets
CREATE TABLE public.cbfd_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.cbfd_games(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  odd NUMERIC NOT NULL,
  selected_team TEXT NOT NULL,
  status cbfd_bet_status NOT NULL DEFAULT 'open',
  potential_win NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add result columns to cbfd_games for match settlement
ALTER TABLE public.cbfd_games 
ADD COLUMN IF NOT EXISTS winner_team TEXT,
ADD COLUMN IF NOT EXISTS score_a INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS score_b INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Enable Row Level Security
ALTER TABLE public.cbfd_bets ENABLE ROW LEVEL SECURITY;

-- Users can view their own bets
CREATE POLICY "Users can view their own bets"
ON public.cbfd_bets
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own bets
CREATE POLICY "Users can create their own bets"
ON public.cbfd_bets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- CEO can view all bets
CREATE POLICY "CEO can view all bets"
ON public.cbfd_bets
FOR SELECT
USING (has_role(auth.uid(), 'ceo'::app_role));

-- CEO can update bets (for settlement)
CREATE POLICY "CEO can update bets"
ON public.cbfd_bets
FOR UPDATE
USING (has_role(auth.uid(), 'ceo'::app_role));

-- Enable realtime for bets
ALTER PUBLICATION supabase_realtime ADD TABLE public.cbfd_bets;

-- CEO can view all games (including settled ones)
DROP POLICY IF EXISTS "Anyone can view active CBFD games" ON public.cbfd_games;
CREATE POLICY "Anyone can view CBFD games"
ON public.cbfd_games
FOR SELECT
USING (true);