-- =============================================================
-- 阶段一 · 迁移包（Step 1 of 5）
-- 顺序固定：015 → 016 → 018 → 017 → 019
-- 在 Supabase SQL Editor 整段粘贴后点 Run。
-- 期望结果：底部显示多条 "ALTER TABLE / CREATE POLICY ..." 成功，无 ERROR。
-- =============================================================


-- =============================================================
-- 015 · 身份空间统一（阶段一·步骤1）
-- 目标：让自定义 users 表与 auth.users 一一对应（唯一身份源 = auth.users）
-- 方案：采用"触发器"方案——新用户注册后自动在 users 建档案，users.id = auth.users.id
-- 现有数据通过一次性回填（见文件末尾说明）对齐，不自动删除任何档案。
-- =============================================================

-- 1. 新增 auth_user_id 引用列（可空，兼容历史数据）
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. 触发器函数：auth.users 插入后自动建 users 行
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, auth_user_id, role, name, email, created_at, updated_at)
  VALUES (
    NEW.id,                                   -- users.id 直接 = auth.users.id
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
    COALESCE(NEW.raw_user_meta_data->>'name', '用户'),
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    email        = EXCLUDED.email,
    updated_at   = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 3. 增强 RLS 辅助函数：兼容 auth_user_id 与 id 两种匹配（更安全）
--    注意：函数定义在 public schema（Supabase SQL Editor 默认 postgres 角色无 auth 模式建函数权限）。
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users
      WHERE id = auth.uid()::UUID OR auth_user_id = auth.uid()::UUID
      LIMIT 1),
    'anonymous'
  );
$$;

CREATE OR REPLACE FUNCTION public.my_baby_ids()
RETURNS SETOF UUID
LANGUAGE SQL STABLE
AS $$
  SELECT baby_id FROM public.family_therapists
  WHERE therapist_id = auth.uid()::UUID
     OR therapist_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::UUID);
$$;

-- 4. 历史数据一次性回填（请在 Supabase SQL Editor 手动执行，确认无误后再跑）：
--    UPDATE users SET auth_user_id = id
--     WHERE auth_user_id IS NULL
--       AND id IN (SELECT id FROM auth.users);
--    说明：若某些 users.id 不在 auth.users 中（孤立档案），不自动处理，需人工核对。
--    新注册用户已由触发器自动同步，无需回填。

COMMENT ON COLUMN users.auth_user_id IS '对应 auth.users.id，唯一身份源。新注册用户由触发器自动同步。';


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


-- =============================================================
-- 017 · 历史脏数据归档（阶段一·步骤3）
-- ⚠️ 破坏性操作：归档并清空历史评级数据。须在 016 执行之后运行。
-- 用途：开发期脏数据（含 __selftest__ 测试行）不值得保留，归档留痕后清空正式表。
-- ⚠️ 本段含归档 INSERT，重复执行会因主键冲突报错；请只跑一次。若需重跑，先 DROP TABLE _archive_*。
-- =============================================================

-- 1. 归档（保留历史可查，结构同原表含索引/约束）
CREATE TABLE IF NOT EXISTS _archive_task_voice_ratings (LIKE task_voice_ratings INCLUDING ALL);
INSERT INTO _archive_task_voice_ratings SELECT * FROM task_voice_ratings;

CREATE TABLE IF NOT EXISTS _archive_practice_voice_ratings (LIKE practice_voice_ratings INCLUDING ALL);
INSERT INTO _archive_practice_voice_ratings SELECT * FROM practice_voice_ratings;

-- 2. 清空正式表
--    默认仅删除已知脏数据行（安全）；若确认无真实用户数据需全清，
--    取消下面 TRUNCATE 行的注释后执行。
DELETE FROM task_voice_ratings      WHERE task_id = '__selftest__';
DELETE FROM practice_voice_ratings WHERE content_id = '__selftest__';
-- TRUNCATE TABLE task_voice_ratings, practice_voice_ratings RESTART IDENTITY;

-- 3. 核对归档行数 / 剩余行数
SELECT
  (SELECT count(*) FROM _archive_task_voice_ratings)     AS archived_task,
  (SELECT count(*) FROM _archive_practice_voice_ratings) AS archived_practice,
  (SELECT count(*) FROM task_voice_ratings)             AS live_task,
  (SELECT count(*) FROM practice_voice_ratings)         AS live_practice;


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

-- =============================================================
-- 阶段一·Step1 完成提示
-- =============================================================
SELECT 'Step1 OK: 015/016/018/017/019 已执行' AS status;
