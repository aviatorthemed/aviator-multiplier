
-- Store completed game rounds so all users see the same history
CREATE TABLE public.game_rounds (
  id SERIAL PRIMARY KEY,
  crash_multiplier NUMERIC(8,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow anyone to read rounds (public game history)
CREATE POLICY "Anyone can view game rounds"
  ON public.game_rounds
  FOR SELECT
  USING (true);

-- Only service role / edge functions can insert (not anon users)
-- No INSERT policy for anon = anon can't insert

-- Index for fast ordering
CREATE INDEX idx_game_rounds_created_at ON public.game_rounds (created_at DESC);
