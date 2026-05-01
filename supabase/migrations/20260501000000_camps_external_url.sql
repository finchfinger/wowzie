-- Allow manually-seeded "partner" listings to link out to the camp's own website
-- instead of going through the Wowzi booking flow.
-- When external_url is set, the card links directly to that URL and the
-- /camp/[slug] detail page redirects rather than rendering.
ALTER TABLE camps
  ADD COLUMN IF NOT EXISTS external_url text;
