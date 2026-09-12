-- =============================================================
-- 开发期写策略补齐（幂等，可重复执行）
-- 问题：保存周计划 → 生成 daily_plans / tasks 时，anon 写入被 RLS 拒绝
--       (42501 new row violates row-level security policy)
-- 原因：原 005 的 public_insert_* 策略未在目标库生效。
-- 此处用 DROP IF EXISTS + CREATE 强制补齐，保证匿名可写这几张表。
-- 上线前应将 (true) 收紧为 auth.uid() = xxx 等真实条件。
-- =============================================================

ALTER TABLE weekly_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;

-- ---------- weekly_plans ----------
DROP POLICY IF EXISTS "public_insert_weekly_plans" ON weekly_plans;
CREATE POLICY "public_insert_weekly_plans" ON weekly_plans
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_select_weekly_plans" ON weekly_plans;
CREATE POLICY "public_select_weekly_plans" ON weekly_plans
  FOR SELECT TO anon, authenticated USING (true);

-- ---------- daily_plans ----------
DROP POLICY IF EXISTS "public_insert_daily_plans" ON daily_plans;
CREATE POLICY "public_insert_daily_plans" ON daily_plans
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_select_daily_plans" ON daily_plans;
CREATE POLICY "public_select_daily_plans" ON daily_plans
  FOR SELECT TO anon, authenticated USING (true);

-- ---------- tasks ----------
DROP POLICY IF EXISTS "public_insert_tasks" ON tasks;
CREATE POLICY "public_insert_tasks" ON tasks
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_tasks" ON tasks;
CREATE POLICY "public_update_tasks" ON tasks
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_tasks" ON tasks;
CREATE POLICY "public_delete_tasks" ON tasks
  FOR DELETE TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_select_tasks" ON tasks;
CREATE POLICY "public_select_tasks" ON tasks
  FOR SELECT TO anon, authenticated USING (true);

-- =============================================================
-- 验证：依次返回各行数，确认表可访问（不报错即可）
-- =============================================================
SELECT
  (SELECT count(*) FROM weekly_plans) AS weekly_plans,
  (SELECT count(*) FROM daily_plans)  AS daily_plans,
  (SELECT count(*) FROM tasks)        AS tasks;
