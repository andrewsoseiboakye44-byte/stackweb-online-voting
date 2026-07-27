-- ============================================================
-- STACKWEB: logos storage bucket migration (FIXED)
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================

-- 1. Create the public logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152,
  ARRAY['image/png','image/jpeg','image/jpg','image/svg+xml','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Admin upload policy (safe: skips if already exists)
DO $$
BEGIN
  CREATE POLICY "Admin upload logos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'logos'
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Admin update/overwrite policy
DO $$
BEGIN
  CREATE POLICY "Admin update logos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'logos'
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Public read (voter pages fetch the logo publicly)
DO $$
BEGIN
  CREATE POLICY "Public read logos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'logos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
