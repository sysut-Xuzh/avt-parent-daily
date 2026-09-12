-- =============================================================
-- 015 · 身份空间统一（阶段一·步骤1�?
-- 目标：让自定�? users 表与 auth.users 一一对应（唯一身份�? = auth.users�?
-- 方案：采�?"触发�?"方案——新用户注册后自动在 users 建档案，users.id = auth.users.id
-- 现有数据通过一次性回填（见文件末尾说明）对齐，不自动删除任何档案�?
-- =============================================================

-- 1. 新增 auth_user_id 引用列（可空，兼容历史数据）
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. 触发器函数：auth.users 插入后自动建 users �?
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

-- 3. 增强 RLS 辅助函数：兼�? auth_user_id �? id 两种匹配（更安全�?
--    注意：函数定义在 public schema（SQL Editor 默认 postgres 角色�? auth 模式建函数权限，故放 public）�?
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
--    说明：若某些 users.id 不在 auth.users 中（孤立档案），不自动处理，需人工核对�?
--    新注册用户已由触发器自动同步，无需回填�?

COMMENT ON COLUMN users.auth_user_id IS '对应 auth.users.id，唯一身份源。新注册用户由触发器自动同步�?';
