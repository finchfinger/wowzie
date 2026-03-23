-- Attendance log: one row per child per session date
CREATE TABLE IF NOT EXISTS public.attendance (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id        uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  booking_id     uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  child_id       uuid REFERENCES public.children(id) ON DELETE SET NULL,
  child_name     text NOT NULL,
  date           date NOT NULL,
  checked_in_at  timestamptz,
  checked_out_at timestamptz,
  marked_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, child_id, date)
);

-- Index for fast lookups by camp + date
CREATE INDEX IF NOT EXISTS attendance_camp_date_idx ON public.attendance (camp_id, date);

-- RLS: hosts can manage attendance for their own camps
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'attendance' AND policyname = 'host_manage_attendance'
  ) THEN
    EXECUTE $p$
      CREATE POLICY host_manage_attendance ON public.attendance
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.camps c
            WHERE c.id = attendance.camp_id AND c.host_id = auth.uid()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.camps c
            WHERE c.id = attendance.camp_id AND c.host_id = auth.uid()
          )
        )
    $p$;
  END IF;
END;
$$;
