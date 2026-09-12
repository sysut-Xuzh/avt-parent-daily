-- =============================================================
-- 行级安全策略（RLS）
-- 确保家长只能看自己的数据，治疗师只能看负责的家庭
-- =============================================================

-- 开启 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE babies ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skip_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interaction_logs ENABLE ROW LEVEL SECURITY;

-- ===== 辅助函数：获取当前用户角色 =====
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM users WHERE id = auth.uid()::UUID),
    'anonymous'
  );
$$;

-- ===== 辅助函数：治疗师负责的宝宝列表 =====
CREATE OR REPLACE FUNCTION auth.my_baby_ids()
RETURNS SETOF UUID
LANGUAGE SQL STABLE
AS $$
  SELECT baby_id FROM family_therapists
  WHERE therapist_id = auth.uid()::UUID;
$$;

-- =============================================================
-- 1. users 表策略
-- =============================================================
-- 用户可以看自己的信息
CREATE POLICY "users_self" ON users
  FOR SELECT USING (id = auth.uid()::UUID);
-- 治疗师可以看到自己负责家庭的家长信息
CREATE POLICY "users_therapist_view" ON users
  FOR SELECT USING (
    auth.user_role() = 'therapist'
    AND id IN (SELECT parent_id FROM babies WHERE id IN (SELECT auth.my_baby_ids()))
  );
-- 用户可以更新自己的信息
CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (id = auth.uid()::UUID);

-- =============================================================
-- 2. babies 表策略
-- =============================================================
-- 家长看自己的宝宝
CREATE POLICY "babies_parent" ON babies
  FOR ALL USING (parent_id = auth.uid()::UUID);
-- 治疗师看自己负责的宝宝
CREATE POLICY "babies_therapist" ON babies
  FOR SELECT USING (id IN (SELECT auth.my_baby_ids()));

-- =============================================================
-- 3. family_therapists 表策略
-- =============================================================
CREATE POLICY "ft_parent" ON family_therapists
  FOR SELECT USING (baby_id IN (SELECT id FROM babies WHERE parent_id = auth.uid()::UUID));
CREATE POLICY "ft_therapist" ON family_therapists
  FOR ALL USING (therapist_id = auth.uid()::UUID);

-- =============================================================
-- 4. 计划表策略（weekly_plans, daily_plans, tasks）
-- =============================================================
CREATE POLICY "plans_parent" ON weekly_plans
  FOR SELECT USING (baby_id IN (SELECT id FROM babies WHERE parent_id = auth.uid()::UUID));
CREATE POLICY "plans_therapist" ON weekly_plans
  FOR ALL USING (baby_id IN (SELECT auth.my_baby_ids()));

CREATE POLICY "daily_parent" ON daily_plans
  FOR SELECT USING (baby_id IN (SELECT id FROM babies WHERE parent_id = auth.uid()::UUID));
CREATE POLICY "daily_therapist" ON daily_plans
  FOR ALL USING (baby_id IN (SELECT auth.my_baby_ids()));

CREATE POLICY "tasks_parent" ON tasks
  FOR ALL USING (baby_id IN (SELECT id FROM babies WHERE parent_id = auth.uid()::UUID));
CREATE POLICY "tasks_therapist" ON tasks
  FOR SELECT USING (baby_id IN (SELECT auth.my_baby_ids()));

-- =============================================================
-- 5. 执行记录策略
-- =============================================================
CREATE POLICY "logs_parent" ON task_logs
  FOR ALL USING (baby_id IN (SELECT id FROM babies WHERE parent_id = auth.uid()::UUID));
CREATE POLICY "logs_therapist" ON task_logs
  FOR SELECT USING (baby_id IN (SELECT auth.my_baby_ids()));

CREATE POLICY "skip_parent" ON skip_tracking
  FOR ALL USING (baby_id IN (SELECT id FROM babies WHERE parent_id = auth.uid()::UUID));
CREATE POLICY "skip_therapist" ON skip_tracking
  FOR SELECT USING (baby_id IN (SELECT auth.my_baby_ids()));

CREATE POLICY "word_parent" ON word_mastery
  FOR ALL USING (baby_id IN (SELECT id FROM babies WHERE parent_id = auth.uid()::UUID));
CREATE POLICY "word_therapist" ON word_mastery
  FOR ALL USING (baby_id IN (SELECT auth.my_baby_ids()));

-- =============================================================
-- 6. 推送策略
-- =============================================================
CREATE POLICY "push_sub_self" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid()::UUID);
CREATE POLICY "push_logs_self" ON push_logs
  FOR SELECT USING (user_id = auth.uid()::UUID);

-- =============================================================
-- 7. 报告策略
-- =============================================================
CREATE POLICY "reports_parent" ON reports
  FOR SELECT USING (baby_id IN (SELECT id FROM babies WHERE parent_id = auth.uid()::UUID));
CREATE POLICY "reports_therapist" ON reports
  FOR ALL USING (baby_id IN (SELECT auth.my_baby_ids()));
