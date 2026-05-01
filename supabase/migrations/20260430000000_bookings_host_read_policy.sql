-- Allow hosts to read bookings for camps they own.
-- Previously only the booking's user_id could see the row; hosts saw nothing.
CREATE POLICY "Hosts can view bookings for their camps"
  ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM camps
      WHERE camps.id = bookings.camp_id
        AND camps.host_id = auth.uid()
    )
  );
