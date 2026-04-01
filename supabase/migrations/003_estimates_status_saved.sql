-- Estimates: use status 'saved' instead of 'draft'.
-- Run in Supabase SQL Editor if migrations are not applied automatically.
-- If `estimates.status` is a PostgreSQL enum (not text), alter the enum type in the dashboard
-- (add value 'saved', migrate rows, then optionally drop 'draft') instead of the CHECK below.

ALTER TABLE public.estimates DROP CONSTRAINT IF EXISTS estimates_status_check;

UPDATE public.estimates SET status = 'saved' WHERE status = 'draft';

ALTER TABLE public.estimates
  ADD CONSTRAINT estimates_status_check
  CHECK (status IN ('saved', 'sent', 'accepted', 'declined', 'expired'));
