-- =============================================================
-- 018 · 推荐表指向孩子（阶段一·步骤4）
-- therapist_recommendations 新增 baby_id，使推荐"定向到某个孩子"，消灭全局广播。
-- 语义：
--   therapist_id —— 推荐人（治疗师），已 REFERENCES auth.users(id)
--   user_id      —— 目标家长（保持）
--   baby_id      —— 新增：目标孩子（指向 babies.id）
-- =============================================================

ALTER TABLE therapist_recommendations
  ADD COLUMN IF NOT EXISTS baby_id UUID REFERENCES public.babies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_therapist_recommendations_baby      ON therapist_recommendations(baby_id);
CREATE INDEX IF NOT EXISTS idx_therapist_recommendations_therapist ON therapist_recommendations(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_recommendations_user      ON therapist_recommendations(user_id);
