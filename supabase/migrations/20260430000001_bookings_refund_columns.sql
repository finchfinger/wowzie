-- Track refund details on bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS refund_amount_cents integer,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
