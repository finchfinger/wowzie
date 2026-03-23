/**
 * Creates the `attendance` table in Supabase (runs once).
 * Run: node scripts/create-attendance-table.mjs
 */

const SUPABASE_URL = "https://fzdhexysoleaegzwtryf.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6ZGhleHlzb2xlYWVnend0cnlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUzMTYwNiwiZXhwIjoyMDc4MTA3NjA2fQ.4OENHB-IyF-HveV8AShMnP2RaMNuPqcs6dnnVuWX6uI";

const sql = `
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

-- RLS: enabled, but hosts can read/write via service-role API route
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Allow the host (via service role bypass in API route) — no anon policy needed.
-- If you want direct client reads for the host, add a policy like:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'attendance' AND policyname = 'host_manage_attendance'
  ) THEN
    EXECUTE $policy$
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
    $policy$;
  END IF;
END;
$$;
`;

async function run() {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!resp.ok) {
    // Try the pg-meta SQL endpoint instead
    const resp2 = await fetch(`${SUPABASE_URL}/pg-meta/v1/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    const text2 = await resp2.text();
    console.log("pg-meta response:", resp2.status, text2.slice(0, 500));
    return;
  }

  const text = await resp.text();
  console.log("Response:", resp.status, text.slice(0, 500));
}

run().catch(console.error);
