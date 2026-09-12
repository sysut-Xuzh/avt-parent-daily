-- =============================================================
-- 声线测试全站集成方案 · 治疗师推荐学习内容（014 / P3）
-- 治疗师在后台推荐某条学习内容给家长，家长端同步可见。
-- 仅存内容的引用（content_id/标题/摘要）与推荐语，不含任何音频。
-- 开发期用宽松 anon 策略打通闭环（上线前收紧为 auth.uid() 隔离）。
-- =============================================================

CREATE TABLE IF NOT EXISTS therapist_recommendations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  therapist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- 目标家长（开发期多为空=全部）
  content_id text NOT NULL,             -- 对应 learning.ts 的 LearningItem.id
  content_title text NOT NULL,
  content_summary text,
  note text,                            -- 治疗师推荐语
  therapist_name text DEFAULT '治疗师',
  status text DEFAULT 'pending',        -- pending | viewed | done
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_therapist_recommendations_user
  ON therapist_recommendations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_therapist_recommendations_content
  ON therapist_recommendations (content_id);

ALTER TABLE therapist_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_therapist_recommendations" ON therapist_recommendations;
CREATE POLICY "public_insert_therapist_recommendations" ON therapist_recommendations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_select_therapist_recommendations" ON therapist_recommendations;
CREATE POLICY "public_select_therapist_recommendations" ON therapist_recommendations
  FOR SELECT TO anon, authenticated USING (true);

-- =============================================================
-- 验证
-- =============================================================
SELECT count(*) AS therapist_recommendations FROM therapist_recommendations;
