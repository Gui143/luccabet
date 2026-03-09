-- Drop overly permissive policies
DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "System can update referrals" ON public.referrals;

-- Create proper policies - referrals are created via trigger/function, not direct insert
-- CEO can manage referrals
CREATE POLICY "CEO can manage referrals" ON public.referrals
  FOR ALL USING (has_role(auth.uid(), 'ceo'));

-- Users can view referrals they made
CREATE POLICY "Referrers can view their referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);

-- Create function to handle referral on signup
CREATE OR REPLACE FUNCTION public.handle_referral_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_code TEXT;
BEGIN
  -- Get referral code from user metadata
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    -- Find the referrer by referral_code
    SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_referral_code;
    
    IF v_referrer_id IS NOT NULL AND v_referrer_id != NEW.id THEN
      -- Update the new user's referred_by
      UPDATE public.profiles SET referred_by = v_referrer_id WHERE id = NEW.id;
      
      -- Create the referral record
      INSERT INTO public.referrals (referrer_id, referred_id, bonus_earned, first_deposit_completed)
      VALUES (v_referrer_id, NEW.id, 0, false);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for referral handling (runs after handle_new_user)
DROP TRIGGER IF EXISTS on_auth_user_created_referral ON auth.users;
CREATE TRIGGER on_auth_user_created_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_referral_signup();