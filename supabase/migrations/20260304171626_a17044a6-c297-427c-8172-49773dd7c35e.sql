-- Fix: The existing SELECT policy is RESTRICTIVE, which blocks access when no permissive policy exists
-- Drop the restrictive policy and create a permissive one
DROP POLICY IF EXISTS "Anyone can view game rounds" ON public.game_rounds;

CREATE POLICY "Anyone can view game rounds"
  ON public.game_rounds
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Ensure table is published for Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rounds;