/**
 * Sets up the `avatars` Supabase Storage bucket + prints RLS policies.
 * Run once:  node scripts/create-avatars-bucket.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  /* 1 ── Create bucket (public so avatar URLs work without signed URLs) */
  const { error: bucketErr } = await supabase.storage.createBucket("avatars", {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });

  if (bucketErr?.message?.includes("already exists")) {
    console.log("✓ Bucket already exists.");
  } else if (bucketErr) {
    console.error("✗ Failed to create bucket:", bucketErr.message);
    process.exit(1);
  } else {
    console.log("✓ Bucket created.");
  }

  /* 2 ── Print SQL to run in Supabase SQL editor */
  console.log("\n──────────────────────────────────────────────────────────");
  console.log("Paste the following into Supabase → SQL Editor → New Query:");
  console.log("──────────────────────────────────────────────────────────\n");

  console.log(`-- Allow anyone to read avatars (public bucket)
CREATE POLICY IF NOT EXISTS "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder
CREATE POLICY IF NOT EXISTS "avatars_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can replace their own avatar
CREATE POLICY IF NOT EXISTS "avatars_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can delete their own avatar
CREATE POLICY IF NOT EXISTS "avatars_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
`);

  console.log("──────────────────────────────────────────────────────────");
  console.log("✓ Done — bucket is ready, paste the SQL above to lock it down.\n");
}

main();
