-- =============================================================
-- 家庭码体系（家长↔治疗师↔宝宝 关联）
-- 目的：用户通过家庭码加入，共享宝宝训练数据（不用懂 Supabase）
-- =============================================================

-- 1. 家庭表：一个家庭关联一个宝宝 + 一个邀请码
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,          -- 家庭码，如 "AVT-3F7K"
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_families_code ON families(code);
CREATE INDEX IF NOT EXISTS idx_families_baby ON families(baby_id);

-- 2. 家庭成员表：家庭 → 成员（家长/治疗师）
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('parent','therapist')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_fm_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_fm_family ON family_members(family_id);

-- =============================================================
-- RLS：家庭成员可查看该家庭的宝宝数据
-- =============================================================

-- 辅助函数：当前用户能访问的宝宝 ID（自己的 + 家庭成员共享的）
CREATE OR REPLACE FUNCTION public.my_visible_baby_ids()
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
AS $$
  -- 自己的宝宝
  SELECT id FROM babies WHERE parent_id = (SELECT auth.uid()::UUID)
  UNION
  -- 通过家庭码加入的宝宝
  SELECT f.baby_id FROM families f
  JOIN family_members fm ON fm.family_id = f.id
  WHERE fm.user_id = (SELECT auth.uid()::UUID)
  UNION
  -- 治疗师负责的宝宝
  SELECT baby_id FROM family_therapists
  WHERE therapist_id = (SELECT auth.uid()::UUID);
$$;

-- families 表策略
CREATE POLICY "families_select_member" ON families
  FOR SELECT USING (
    created_by = auth.uid()::UUID
    OR id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()::UUID)
  );

-- family_members 表策略
CREATE POLICY "fm_select_self" ON family_members
  FOR SELECT USING (user_id = auth.uid()::UUID);
CREATE POLICY "fm_insert_family_creator" ON family_members
  FOR INSERT WITH CHECK (
    family_id IN (SELECT id FROM families WHERE created_by = auth.uid()::UUID)
    OR user_id = auth.uid()::UUID
  );

-- 放宽现有策略：让家庭成员也能看到宝宝相关数据
-- 注：以下策略与现有 002_rls.sql 策略同名，需先 DROP 再 CREATE 或使用 IF NOT EXISTS 语义
-- 这里新增"家庭成员可见"补充策略，覆盖通过家庭码加入的情况
DROP POLICY IF EXISTS "babies_family_member" ON babies;
CREATE POLICY "babies_family_member" ON babies
  FOR SELECT USING (id IN (SELECT public.my_visible_baby_ids()));

DROP POLICY IF EXISTS "tasks_family_member" ON tasks;
CREATE POLICY "tasks_family_member" ON tasks
  FOR SELECT USING (baby_id IN (SELECT public.my_visible_baby_ids()));

DROP POLICY IF EXISTS "daily_plans_family_member" ON daily_plans;
CREATE POLICY "daily_plans_family_member" ON daily_plans
  FOR SELECT USING (baby_id IN (SELECT public.my_visible_baby_ids()));

DROP POLICY IF EXISTS "weekly_plans_family_member" ON weekly_plans;
CREATE POLICY "weekly_plans_family_member" ON weekly_plans
  FOR SELECT USING (baby_id IN (SELECT public.my_visible_baby_ids()));

DROP POLICY IF EXISTS "task_logs_family_member" ON task_logs;
CREATE POLICY "task_logs_family_member" ON task_logs
  FOR SELECT USING (baby_id IN (SELECT public.my_visible_baby_ids()));

DROP POLICY IF EXISTS "reports_family_member" ON reports;
CREATE POLICY "reports_family_member" ON reports
  FOR SELECT USING (baby_id IN (SELECT public.my_visible_baby_ids()));
