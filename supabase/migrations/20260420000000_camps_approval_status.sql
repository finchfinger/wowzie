-- Add approval_status to camps for the listing review gate.
-- All existing camps default to 'approved' so nothing currently live breaks.
-- New camps will default to 'pending_review' once the host submit flow is wired.

ALTER TABLE camps
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

-- Update constraint: only valid values allowed
ALTER TABLE camps
  DROP CONSTRAINT IF EXISTS camps_approval_status_check;

ALTER TABLE camps
  ADD CONSTRAINT camps_approval_status_check
  CHECK (approval_status IN ('pending_review', 'approved', 'rejected'));

-- New listings created after this migration should start as pending_review.
-- We set the column default to 'pending_review' here so INSERT without the
-- field gets the right value going forward.
ALTER TABLE camps
  ALTER COLUMN approval_status SET DEFAULT 'pending_review';

-- Index for the admin "pending review" filter
CREATE INDEX IF NOT EXISTS camps_approval_status_idx ON camps (approval_status);
