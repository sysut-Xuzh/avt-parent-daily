-- 022_custom_activities.sql
-- 治疗师可自定义上传新的训练类型 / 内容，并用于给负责的孩子排课
CREATE TABLE IF NOT EXISTS public.custom_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '自定义训练',
  description TEXT DEFAULT '',
  target_words TEXT[] DEFAULT '{}',
  instructions TEXT DEFAULT '',
  animation_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_activities ENABLE ROW LEVEL SECURITY;

-- 治疗师只能管理自己创建的训练
DROP POLICY IF EXISTS "ca_insert_self" ON public.custom_activities;
CREATE POLICY "ca_insert_self" ON public.custom_activities
  FOR INSERT WITH CHECK (therapist_id = auth.uid()::UUID);

DROP POLICY IF EXISTS "ca_select_self" ON public.custom_activities;
CREATE POLICY "ca_select_self" ON public.custom_activities
  FOR SELECT USING (therapist_id = auth.uid()::UUID);

DROP POLICY IF EXISTS "ca_update_self" ON public.custom_activities;
CREATE POLICY "ca_update_self" ON public.custom_activities
  FOR UPDATE USING (therapist_id = auth.uid()::UUID) WITH CHECK (therapist_id = auth.uid()::UUID);

DROP POLICY IF EXISTS "ca_delete_self" ON public.custom_activities;
CREATE POLICY "ca_delete_self" ON public.custom_activities
  FOR DELETE USING (therapist_id = auth.uid()::UUID);

CREATE INDEX IF NOT EXISTS idx_custom_activities_therapist ON public.custom_activities(therapist_id);
