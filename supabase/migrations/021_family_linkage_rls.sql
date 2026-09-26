-- 021_family_linkage_rls.sql
-- 打通「家长-孩子-治疗师」三者对应：注册即可创建宝宝与家庭
-- 应用层配合：POST /api/babies、/api/families 的 create/join 已改为
--   ① create 时按名查宝宝，找不到则自动建宝宝（parent_id = 当前用户）
--   ② join 时若角色为 therapist，自动写入 family_therapists(baby_id, therapist_id)

-- 1. birth_date 改为可空（注册时未必已知精确生日）
ALTER TABLE public.babies ALTER COLUMN birth_date DROP NOT NULL;

-- 2. babies：家长可插入自己为 parent_id 的宝宝
DROP POLICY IF EXISTS "babies_insert_self" ON public.babies;
CREATE POLICY "babies_insert_self" ON public.babies
  FOR INSERT WITH CHECK (parent_id = auth.uid()::UUID);

-- 3. families：创建者可作为 created_by 插入
DROP POLICY IF EXISTS "families_insert_self" ON public.families;
CREATE POLICY "families_insert_self" ON public.families
  FOR INSERT WITH CHECK (created_by = auth.uid()::UUID);

-- 4. family_members：用户可作为 user_id 加入
DROP POLICY IF EXISTS "family_members_insert_self" ON public.family_members;
CREATE POLICY "family_members_insert_self" ON public.family_members
  FOR INSERT WITH CHECK (user_id = auth.uid()::UUID);

-- 5. family_therapists：治疗师可作为 therapist_id 关联宝宝
DROP POLICY IF EXISTS "ft_insert_self" ON public.family_therapists;
CREATE POLICY "ft_insert_self" ON public.family_therapists
  FOR INSERT WITH CHECK (therapist_id = auth.uid()::UUID);
