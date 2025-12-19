-- Create promo_codes table
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  bonus_amount NUMERIC NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create promo_code_redemptions table to track who used what
CREATE TABLE public.promo_code_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(code_id, user_id)
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Promo codes policies - anyone can view active codes, only CEO can manage
CREATE POLICY "Anyone can view active promo codes"
ON public.promo_codes
FOR SELECT
USING (true);

CREATE POLICY "CEO can insert promo codes"
ON public.promo_codes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can update promo codes"
ON public.promo_codes
FOR UPDATE
USING (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "CEO can delete promo codes"
ON public.promo_codes
FOR DELETE
USING (has_role(auth.uid(), 'ceo'::app_role));

-- Redemptions policies
CREATE POLICY "Users can view their own redemptions"
ON public.promo_code_redemptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "CEO can view all redemptions"
ON public.promo_code_redemptions
FOR SELECT
USING (has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Users can insert their own redemptions"
ON public.promo_code_redemptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);