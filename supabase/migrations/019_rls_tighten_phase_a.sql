-- =============================================================
-- 019 · RLS 收紧阶段A —— 并行新增（阶段一·步骤5）
-- 两阶段节奏：本文件【新增】收紧策略，旧 USING(true) 暂不删除（由 020 删除）。
-- 设计要点（PostgreSQL RLS 组合规则）：
--   SELECT/DELETE：多条 permissive 策略之间为 OR  —— 旧 USING(true) 仍主导，本阶段 SELECT 实际未生效（安全）。
--   INSERT/UPDATE：多条 WITH CHECK 之间为 AND —— 故本阶段 INSERT 策略保留 "OR baby_id IS NULL"，
--                   与旧 WITH CHECK(true) 组合后 net = (条件 OR baby_id IS NULL)，灰度期允许空值（安全）。
-- 验证通过后执行 020，删除旧策略，新策略即全面生效。
-- =============================================================

-- 0. 统一辅助函数：家长经 babies.parent_id、治疗师经 family_therapists、家庭码共享经 families/family_members
CREATE OR REPLACE FUNCTION public.my_baby_ids()
RETURNS SETOF UUID
LANGUAGE SQL STABLE
AS $$
  SELECT id FROM public.babies WHERE parent_id = auth.uid()::UUID
  UNION
  SELECT baby_id FROM public.family_therapists WHERE therapist_id = auth.uid()::UUID
  UNION
  SELECT f.baby_id FROM public.families f
    JOIN public.family_members fm ON fm.family_id = f.id
   WHERE fm.user_id = auth.uid()::UUID
$$;

-- 1. task_voice_ratings
DROP POLICY IF EXISTS "task_voice_ratings_access_v2" ON task_voice_ratings;
CREATE POLICY "task_voice_ratings_access_v2" ON task_voice_ratings
  FOR ALL TO authenticated
  USING  (baby_id IN (SELECT public.my_baby_ids()) OR parent_id = auth.uid()::UUID)
  WITH CHECK (baby_id IN (SELECT public.my_baby_ids()) OR parent_id = auth.uid()::UUID OR baby_id IS NULL);

-- 2. practice_voice_ratings
DROP POLICY IF EXISTS "practice_voice_ratings_access_v2" ON practice_voice_ratings;
CREATE POLICY "practice_voice_ratings_access_v2" ON practice_voice_ratings
  FOR ALL TO authenticated
  USING  (baby_id IN (SELECT public.my_baby_ids()) OR parent_id = auth.uid()::UUID)
  WITH CHECK (baby_id IN (SELECT public.my_baby_ids()) OR parent_id = auth.uid()::UUID OR baby_id IS NULL);

-- 3. therapist_recommendations
DROP POLICY IF EXISTS "therapist_recommendations_access_v2" ON therapist_recommendations;
CREATE POLICY "therapist_recommendations_access_v2" ON therapist_recommendations
  FOR ALL TO authenticated
  USING (
    therapist_id = auth.uid()::UUID
    OR baby_id IN (SELECT public.my_baby_ids())
    OR user_id = auth.uid()::UUID
  )
  WITH CHECK (
    therapist_id = auth.uid()::UUID
    OR baby_id IN (SELECT public.my_baby_ids())
  );
