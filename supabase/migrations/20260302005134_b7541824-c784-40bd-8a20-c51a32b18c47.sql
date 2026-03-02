
-- Drop the overly permissive policy and replace with restrictive ones
DROP POLICY "Service role can manage rounds" ON public.aviator_rounds;

-- No insert/update/delete for regular users (only service_role via edge functions bypasses RLS)
-- The SELECT policy "Anyone can read rounds" remains
