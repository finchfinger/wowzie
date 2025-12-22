import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fzdhexysoleaegzwtryf.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6ZGhleHlzb2xlYWVnend0cnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzE2MDYsImV4cCI6MjA3ODEwNzYwNn0.kEU-hZW2TJ2sNz_TDPo_lNu0OYu6GKfn1t5Sv-UVj6U";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
