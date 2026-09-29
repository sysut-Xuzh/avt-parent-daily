-- 025_feedback.sql
-- 建议信箱：家长/用户提交整体 + 核心功能评星 + 文字（云端汇总 + 本地备份）
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_star INT NOT NULL CHECK (overall_star BETWEEN 1 AND 5),
  rating_task INT CHECK (rating_task BETWEEN 1 AND 5),
  rating_practice INT CHECK (rating_practice BETWEEN 1 AND 5),
  rating_hearing INT CHECK (rating_hearing BETWEEN 1 AND 5),
  comment TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fb_insert_self" ON public.feedback;
CREATE POLICY "fb_insert_self" ON public.feedback
  FOR INSERT WITH CHECK (user_id = auth.uid()::UUID);

DROP POLICY IF EXISTS "fb_select_self" ON public.feedback;
CREATE POLICY "fb_select_self" ON public.feedback
  FOR SELECT USING (user_id = auth.uid()::UUID);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.feedback(user_id);
