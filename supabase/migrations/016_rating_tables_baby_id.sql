-- =============================================================
-- 016 · 评级表加归属列（阶段一·步骤2）
-- task_voice_ratings / practice_voice_ratings 新增 baby_id、parent_id
-- 新列先允许 NULL 上线（灰度），应用层改造完成并回填后再收紧（见 020）。
-- =============================================================

-- task_voice_ratings
ALTER TABLE task_voice_ratings
  ADD COLUMN IF NOT EXISTS baby_id   UUID REFERENCES public.babies(id) ON DELETE CASCADE;
ALTER TABLE task_voice_ratings
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES auth.users(id)    ON DELETE SET NULL;

-- practice_voice_ratings
ALTER TABLE practice_voice_ratings
  ADD COLUMN IF NOT EXISTS baby_id   UUID REFERENCES public.babies(id) ON DELETE CASCADE;
ALTER TABLE practice_voice_ratings
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES auth.users(id)    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_task_voice_ratings_baby    ON task_voice_ratings(baby_id);
CREATE INDEX IF NOT EXISTS idx_task_voice_ratings_parent  ON task_voice_ratings(parent_id);
CREATE INDEX IF NOT EXISTS idx_practice_voice_ratings_baby   ON practice_voice_ratings(baby_id);
CREATE INDEX IF NOT EXISTS idx_practice_voice_ratings_parent ON practice_voice_ratings(parent_id);
