-- ============================================================================
-- STORAGE RLS POLICIES FOR 'project-attachments' BUCKET
-- ============================================================================

-- 1. Ensure the bucket exists and is marked public
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('project-attachments', 'project-attachments', true, 52428800)
ON CONFLICT (id) DO UPDATE
SET public = true, file_size_limit = 52428800;

-- 2. Allow public and authenticated users to view/download from project-attachments
DROP POLICY IF EXISTS "Public and authenticated read from project-attachments" ON storage.objects;
CREATE POLICY "Public and authenticated read from project-attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-attachments');

-- 3. Allow public and authenticated users to upload to project-attachments
DROP POLICY IF EXISTS "Public and authenticated upload to project-attachments" ON storage.objects;
CREATE POLICY "Public and authenticated upload to project-attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-attachments');

-- 4. Allow public and authenticated users to update files in project-attachments
DROP POLICY IF EXISTS "Public and authenticated update in project-attachments" ON storage.objects;
CREATE POLICY "Public and authenticated update in project-attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-attachments');

-- 5. Allow public and authenticated users to delete files from project-attachments
DROP POLICY IF EXISTS "Public and authenticated delete from project-attachments" ON storage.objects;
CREATE POLICY "Public and authenticated delete from project-attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-attachments');

-- 6. Ensure public access on public.attachments table for smooth synchronization
DROP POLICY IF EXISTS "Public access to attachments" ON public.attachments;
CREATE POLICY "Public access to attachments"
ON public.attachments FOR ALL
USING (true)
WITH CHECK (true);
