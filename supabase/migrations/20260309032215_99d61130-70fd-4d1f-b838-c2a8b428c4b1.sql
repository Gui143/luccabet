-- Table for daily spin prizes
CREATE TABLE IF NOT EXISTS public.daily_spin_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prize_amount NUMERIC NOT NULL DEFAULT 0,
  spin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, spin_date)
);

-- Table for tracking user game wins (for leaderboard)
CREATE TABLE IF NOT EXISTS public.game_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  bet_amount NUMERIC NOT NULL,
  multiplier NUMERIC NOT NULL,
  win_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_spin_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_wins ENABLE ROW LEVEL SECURITY;

-- Policies for daily_spin_claims
CREATE POLICY "Users can view their own spin claims" ON public.daily_spin_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own spin claims" ON public.daily_spin_claims FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for game_wins
CREATE POLICY "Anyone can view game wins" ON public.game_wins FOR SELECT USING (true);
CREATE POLICY "Users can insert their own wins" ON public.game_wins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for game_wins (for live chat announcements)
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_wins;