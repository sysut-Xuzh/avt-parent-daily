-- =============================================================
-- 声线测试全站集成方案 · 评级数据表（013）
-- 依据《声线测试全站集成方案_最终确认稿.md》第七章：
--   task_voice_ratings   每日任务录音分析（结构化指标，不含音频）
--   practice_voice_ratings 语音练习分析（结构化指标，不含音频）
-- 隐私红线：两表只存脱敏结构化指标，绝不存音频/频谱/声纹细节。
-- 开发期用宽松 anon 策略打通闭环（上线前收紧为 auth.uid() 隔离）。
-- =============================================================

CREATE TABLE IF NOT EXISTS task_voice_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  task_id text NOT NULL,
  date date NOT NULL DEFAULT current_date,
  star_rating int CHECK (star_rating BETWEEN 1 AND 5),
  voice_score int,
  child_voice_duration_ms int,
  adult_voice_duration_ms int,
  response_delay_ms int,
  child_voice_baseline_hz int,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS practice_voice_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content_id text,
  source text,                       -- 'task_page' | 'learning_page'
  words text[],
  star_rating int,                   -- 综合星级（1-5）
  voice_score int,                   -- 综合评分（0-100）
  word_results jsonb,                -- [{word,star_rating,score}]
  practiced_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_task_voice_ratings_user_date
  ON task_voice_ratings (user_id, date);
CREATE INDEX IF NOT EXISTS idx_practice_voice_ratings_user
  ON practice_voice_ratings (user_id, practiced_at);

ALTER TABLE task_voice_ratings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_voice_ratings ENABLE ROW LEVEL SECURITY;

-- ---------- task_voice_ratings ----------
DROP POLICY IF EXISTS "public_insert_task_voice_ratings" ON task_voice_ratings;
CREATE POLICY "public_insert_task_voice_ratings" ON task_voice_ratings
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_select_task_voice_ratings" ON task_voice_ratings;
CREATE POLICY "public_select_task_voice_ratings" ON task_voice_ratings
  FOR SELECT TO anon, authenticated USING (true);

-- ---------- practice_voice_ratings ----------
DROP POLICY IF EXISTS "public_insert_practice_voice_ratings" ON practice_voice_ratings;
CREATE POLICY "public_insert_practice_voice_ratings" ON practice_voice_ratings
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_select_practice_voice_ratings" ON practice_voice_ratings;
CREATE POLICY "public_select_practice_voice_ratings" ON practice_voice_ratings
  FOR SELECT TO anon, authenticated USING (true);

-- =============================================================
-- 验证：依次返回各行数，确认表可访问（不报错即可）
-- =============================================================
SELECT
  (SELECT count(*) FROM task_voice_ratings)    AS task_voice_ratings,
  (SELECT count(*) FROM practice_voice_ratings) AS practice_voice_ratings;
