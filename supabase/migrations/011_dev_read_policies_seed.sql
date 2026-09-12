-- =============================================================
-- 开发期修正：① 给引用/计划表补「匿名可读」策略
--                  ② 幂等补齐 治疗师/家长/宝宝 种子数据
-- 目的：让 /api/weekly-plans/save（anon 查 babies+users）、
--       /api/tasks/today（anon 查 tasks+daily_plans）能真正读到数据，
--       打通「治疗师布置 → 家长看到任务」闭环。
-- 运行位置：Supabase 后台 → SQL Editor → New query → 粘贴 → Run（只需一次）
-- 说明：SQL Editor 以 postgres 角色执行，绕过 RLS，可正常插入/读取。
-- =============================================================

-- ---------- 1. 匿名可读策略（开发期；上线前应收紧） ----------
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE babies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_users"        ON users;
DROP POLICY IF EXISTS "anon_read_babies"       ON babies;
DROP POLICY IF EXISTS "anon_read_weekly_plans" ON weekly_plans;
DROP POLICY IF EXISTS "anon_read_daily_plans"  ON daily_plans;
DROP POLICY IF EXISTS "anon_read_tasks"        ON tasks;

CREATE POLICY "anon_read_users"        ON users        FOR SELECT USING (true);
CREATE POLICY "anon_read_babies"       ON babies       FOR SELECT USING (true);
CREATE POLICY "anon_read_weekly_plans" ON weekly_plans FOR SELECT USING (true);
CREATE POLICY "anon_read_daily_plans"  ON daily_plans  FOR SELECT USING (true);
CREATE POLICY "anon_read_tasks"        ON tasks        FOR SELECT USING (true);

-- ---------- 2. 幂等补齐种子数据（对齐代码 DEFAULT_*） ----------
INSERT INTO users (id, role, name)
VALUES ('a0000000-0000-0000-0000-000000000004', 'therapist', '陈治疗师')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, role, name)
VALUES ('c0000000-0000-0000-0000-000000000001', 'parent', '小宝家长')
ON CONFLICT (id) DO NOTHING;

INSERT INTO babies (id, parent_id, name, birth_date, hearing_status, avt_stage)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  '小宝',
  '2023-01-15',
  '双侧人工耳蜗',
  'association'
)
ON CONFLICT (id) DO NOTHING;

-- ---------- 3. 验证（在 SQL Editor 直接看到真实计数） ----------
SELECT
  (SELECT count(*) FROM users        WHERE role = 'therapist') AS therapists,
  (SELECT count(*) FROM users        WHERE role = 'parent')    AS parents,
  (SELECT count(*) FROM babies       WHERE name = '小宝')      AS babies,
  (SELECT count(*) FROM weekly_plans)                          AS weekly_plans,
  (SELECT count(*) FROM daily_plans)                           AS daily_plans,
  (SELECT count(*) FROM tasks)                                 AS tasks;
