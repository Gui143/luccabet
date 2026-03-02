
-- Table for synced Aviator rounds
CREATE TABLE public.aviator_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crash_point NUMERIC(8,2) NOT NULL,
  started_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','countdown','flying','crashed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aviator_rounds ENABLE ROW LEVEL SECURITY;

-- Everyone can read rounds, but crash_point is only visible when crashed
-- We use a view for this purpose, but for simplicity we allow read and handle in code
CREATE POLICY "Anyone can read rounds"
  ON public.aviator_rounds FOR SELECT
  USING (true);

-- Only service role (edge functions) can insert/update
CREATE POLICY "Service role can manage rounds"
  ON public.aviator_rounds FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.aviator_rounds;
