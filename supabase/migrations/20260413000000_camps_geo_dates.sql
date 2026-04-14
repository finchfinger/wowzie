-- Add geolocation and session date range columns to camps table
-- lat/lng: stored when host saves a listing with an address (from Google Places)
-- session_start/session_end: earliest/latest session dates across all campSessions

ALTER TABLE camps
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS session_start date,
  ADD COLUMN IF NOT EXISTS session_end date;

-- Index for future geospatial queries
CREATE INDEX IF NOT EXISTS camps_lat_lng_idx ON camps (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Index for date range queries
CREATE INDEX IF NOT EXISTS camps_session_dates_idx ON camps (session_start, session_end)
  WHERE session_start IS NOT NULL;
