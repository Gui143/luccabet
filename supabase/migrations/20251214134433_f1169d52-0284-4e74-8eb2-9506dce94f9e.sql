-- Create table for CBFD games (admin-managed fictional games)
CREATE TABLE public.cbfd_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  odd NUMERIC(5,2) NOT NULL DEFAULT 1.50,
  championship TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.cbfd_games ENABLE ROW LEVEL SECURITY;

-- Everyone can view active games
CREATE POLICY "Anyone can view active CBFD games"
ON public.cbfd_games
FOR SELECT
USING (is_active = true);

-- Only CEO can insert games
CREATE POLICY "CEO can insert CBFD games"
ON public.cbfd_games
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'ceo'));

-- Only CEO can update games
CREATE POLICY "CEO can update CBFD games"
ON public.cbfd_games
FOR UPDATE
USING (public.has_role(auth.uid(), 'ceo'));

-- Only CEO can delete games
CREATE POLICY "CEO can delete CBFD games"
ON public.cbfd_games
FOR DELETE
USING (public.has_role(auth.uid(), 'ceo'));