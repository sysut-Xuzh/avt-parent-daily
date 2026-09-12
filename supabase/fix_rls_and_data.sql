-- =============================================================
-- AVT 综合修复脚本 — 解决 RLS / 外键 / 推送订阅问题
-- 在 Supabase SQL Editor 中运行
-- =============================================================

-- =============================================================
-- 第一部分：确保默认用户和宝宝存在（外键依赖）
-- =============================================================

-- 默认家长用户（push_subscriptions.user_id 需要引用）
INSERT INTO users (id, role, name, email)
VALUES ('a0000000-0000-0000-0000-000000000001', 'parent', '小宝妈', 'parent@avt-demo.local')
ON CONFLICT (id) DO NOTHING;

-- 默认治疗师
INSERT INTO users (id, role, name)
VALUES ('a0000000-0000-0000-0000-000000000004', 'therapist', '李治疗师')
ON CONFLICT (id) DO NOTHING;

-- 默认宝宝（tasks.baby_id / audio_recordings.baby_id 需要引用）
INSERT INTO babies (id, parent_id, name, birth_date, hearing_status, device_type, avt_stage)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '小宝',
  '2023-06-15',
  '双侧重度感音神经性听力损失',
  '人工耳蜗（双侧）',
  'detection'
)
ON CONFLICT (id) DO NOTHING;

-- 默认周计划（daily_plans.weekly_plan_id 需要引用）
INSERT INTO weekly_plans (id, baby_id, therapist_id, week_start, week_end, target_words, strategies, status)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000004',
  CURRENT_DATE - 3,
  CURRENT_DATE + 3,
  ARRAY['苹果', '狗', '水', '晚安'],
  ARRAY['命名等待', '听觉轰炸', '听觉先行', '平行说话'],
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 第二部分：禁用 RLS（开发阶段，允许 anon key 读写）
-- =============================================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE babies DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_therapists DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE skip_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE word_mastery DISABLE ROW LEVEL SECURITY;
ALTER TABLE audio_recordings DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interaction_logs DISABLE ROW LEVEL SECURITY;

-- =============================================================
-- 第三部分：验证
-- =============================================================

-- 检查用户和宝宝
SELECT 'users' as tbl, count(*) as cnt FROM users WHERE id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'babies', count(*) FROM babies WHERE id = 'b0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'weekly_plans', count(*) FROM weekly_plans WHERE id = 'c0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'today_tasks', count(*) FROM tasks WHERE daily_plan_id IN (
  SELECT id FROM daily_plans WHERE date = CURRENT_DATE
);

-- 检查 RLS 状态（应该全部为 Disabled）
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tasks', 'task_logs', 'audio_recordings', 'push_subscriptions', 'daily_plans')
ORDER BY tablename;
