-- Add org claim fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wowzi_managed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS claim_token text UNIQUE;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS profiles_claim_token_idx ON profiles (claim_token) WHERE claim_token IS NOT NULL;

-- Allow public read of wowzi-managed profiles (unclaimed orgs visible without auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public can read wowzi-managed profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can read wowzi-managed profiles" ON profiles FOR SELECT USING (wowzi_managed = true)';
  END IF;
END $$;
