-- Create cbfd_teams table
CREATE TABLE public.cbfd_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cbfd_championships table
CREATE TABLE public.cbfd_championships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add match_date column to cbfd_games
ALTER TABLE public.cbfd_games ADD COLUMN match_date TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Enable RLS for teams
ALTER TABLE public.cbfd_teams ENABLE ROW LEVEL SECURITY;

-- Enable RLS for championships
ALTER TABLE public.cbfd_championships ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Anyone can view CBFD teams"
ON public.cbfd_teams
FOR SELECT
USING (true);

CREATE POLICY "CEO can insert CBFD teams"
ON public.cbfd_teams
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can update CBFD teams"
ON public.cbfd_teams
FOR UPDATE
USING (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can delete CBFD teams"
ON public.cbfd_teams
FOR DELETE
USING (has_role(auth.uid(), 'ceo'::app_role));

-- Championships policies
CREATE POLICY "Anyone can view CBFD championships"
ON public.cbfd_championships
FOR SELECT
USING (true);

CREATE POLICY "CEO can insert CBFD championships"
ON public.cbfd_championships
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can update CBFD championships"
ON public.cbfd_championships
FOR UPDATE
USING (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can delete CBFD championships"
ON public.cbfd_championships
FOR DELETE
USING (has_role(auth.uid(), 'ceo'::app_role));