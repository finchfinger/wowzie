-- Add structured min_age / max_age columns to camps.
-- These replace the client-side age filter that read meta.age_buckets.
-- Null means no age restriction (open to all ages).

ALTER TABLE camps
  ADD COLUMN IF NOT EXISTS min_age integer,
  ADD COLUMN IF NOT EXISTS max_age integer;

-- Index for age range queries
CREATE INDEX IF NOT EXISTS camps_age_range_idx ON camps (min_age, max_age)
  WHERE min_age IS NOT NULL OR max_age IS NOT NULL;
