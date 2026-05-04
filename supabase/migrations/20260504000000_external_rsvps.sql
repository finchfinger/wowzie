-- Lightweight RSVP for externally-booked camps.
-- Lets parents mark "I'm going" on Wowzi even when they book on the camp's own site.
CREATE TABLE IF NOT EXISTS external_rsvps (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  camp_id    uuid        NOT NULL REFERENCES camps(id)    ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, camp_id)
);

ALTER TABLE external_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own RSVPs"
  ON external_rsvps FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
