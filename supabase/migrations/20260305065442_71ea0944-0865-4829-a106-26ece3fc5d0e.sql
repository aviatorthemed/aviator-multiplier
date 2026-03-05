
-- Fix function search path security warning
CREATE OR REPLACE FUNCTION update_phase_started_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phase != OLD.phase OR NEW.round_number != OLD.round_number THEN
    NEW.phase_started_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;
