-- 024_content_library.sql
-- 治疗师内容策展 / 知识库：分享认可的文章、论文、书籍、播客
CREATE TABLE IF NOT EXISTS public.content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('article', 'paper', 'book', 'podcast')),
  title TEXT NOT NULL,
  url TEXT DEFAULT NULL,
  summary TEXT DEFAULT '',
  author TEXT DEFAULT NULL,
  file_url TEXT DEFAULT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;

-- 治疗师只能管理自己发布的内容
DROP POLICY IF EXISTS "cl_insert_self" ON public.content_library;
CREATE POLICY "cl_insert_self" ON public.content_library
  FOR INSERT WITH CHECK (therapist_id = auth.uid()::UUID);

DROP POLICY IF EXISTS "cl_select_all_authed" ON public.content_library;
CREATE POLICY "cl_select_all_authed" ON public.content_library
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "cl_update_self" ON public.content_library;
CREATE POLICY "cl_update_self" ON public.content_library
  FOR UPDATE USING (therapist_id = auth.uid()::UUID) WITH CHECK (therapist_id = auth.uid()::UUID);

DROP POLICY IF EXISTS "cl_delete_self" ON public.content_library;
CREATE POLICY "cl_delete_self" ON public.content_library
  FOR DELETE USING (therapist_id = auth.uid()::UUID);

CREATE INDEX IF NOT EXISTS idx_content_library_therapist ON public.content_library(therapist_id);
CREATE INDEX IF NOT EXISTS idx_content_library_type ON public.content_library(type);

-- Storage：内容素材（论文 PDF、书籍封面等），公开读、登录用户可写
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-files', 'content-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "cf_insert_authed" ON storage.objects;
CREATE POLICY "cf_insert_authed" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'content-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cf_select_public" ON storage.objects;
CREATE POLICY "cf_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'content-files');
