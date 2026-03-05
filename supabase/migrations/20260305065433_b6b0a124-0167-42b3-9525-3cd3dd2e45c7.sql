
-- Table to store authoritative current round state for all clients
CREATE TABLE public.current_round (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  crash_point numeric NOT NULL DEFAULT 2.00,
  phase text NOT NULL DEFAULT 'countdown',
  phase_started_at timestamptz NOT NULL DEFAULT now(),
  round_number integer NOT NULL DEFAULT 1
);

-- Seed with initial row
INSERT INTO public.current_round (id, crash_point, phase, phase_started_at, round_number)
VALUES (1, 2.00, 'countdown', now(), 1);

-- RLS policies
CREATE POLICY "Anyone can view current round"
  ON public.current_round FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can update current round"
  ON public.current_round FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Auto-set phase_started_at on phase/round transitions
CREATE OR REPLACE FUNCTION update_phase_started_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phase != OLD.phase OR NEW.round_number != OLD.round_number THEN
    NEW.phase_started_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_phase_started_at
  BEFORE UPDATE ON current_round
  FOR EACH ROW
  EXECUTE FUNCTION update_phase_started_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.current_round;
