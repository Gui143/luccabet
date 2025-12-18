-- Add separate odds columns for Team A win, Draw, and Team B win
ALTER TABLE public.cbfd_games 
ADD COLUMN odd_a numeric DEFAULT 2.00,
ADD COLUMN odd_draw numeric DEFAULT 3.00,
ADD COLUMN odd_b numeric DEFAULT 2.00;

-- Update existing rows to have default odds
UPDATE public.cbfd_games 
SET odd_a = COALESCE(odd, 2.00),
    odd_draw = 3.00,
    odd_b = 2.00
WHERE odd_a IS NULL;

-- Make the new columns NOT NULL after setting defaults
ALTER TABLE public.cbfd_games 
ALTER COLUMN odd_a SET NOT NULL,
ALTER COLUMN odd_draw SET NOT NULL,
ALTER COLUMN odd_b SET NOT NULL;

-- Update cbfd_bets to store bet_type (team_a, draw, team_b)
ALTER TABLE public.cbfd_bets 
ADD COLUMN bet_type text DEFAULT 'team_a';

-- Update existing bets
UPDATE public.cbfd_bets 
SET bet_type = 'team_a'
WHERE bet_type IS NULL;