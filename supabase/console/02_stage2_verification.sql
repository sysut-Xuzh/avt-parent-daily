-- =============================================================
-- 阶段一 · 验收验证（复制即用版）
-- 在 Supabase SQL Editor 执行。
--
-- ⚠️ 关键原理：SQL Editor 默认以「绕过 RLS 的超级用户角色」运行，
--    若只用 SET request.jwt.claims 而不切换角色，RLS 根本不会生效，测试失真。
--    本脚本每个隔离测试前都加了 `SET ROLE authenticated` / `SET ROLE anon`，
--    让 RLS 真正按身份求值，测完 `RESET ROLE`。请勿删除这些行。
--
-- ⚠️ 另一个坑：SET 的值必须是「字符串字面量」，不能写 json_build_object(...) 这类函数调用
--    （会报 42601 syntax error）。动态值用 EXECUTE format('SET ... = %L', ...) 转字面量。
--
-- 用法：
--   Part A —— 跑完 01_stage1_migrations.sql（015→019）之后、跑 020 之前 执行
--   Part B —— 跑完 03_stage3_drop_old.sql（020）之后 执行
-- =============================================================


-- ============================================================
-- Part A —— 灰度期验收（旧 public_* 仍在，新 _v2 已就位）
-- 目标：① 确认策略清单正确 ② 确认「写入已被 gate」（陌生人插不进去）
-- ============================================================

-- A0. 策略清单：旧 public_* 应【存在】，新 _v2 应【存在】
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE tablename IN ('task_voice_ratings','practice_voice_ratings','therapist_recommendations')
ORDER BY tablename, policyname;
-- 期望：能看到 public_insert_* / public_select_*（旧）与 *_access_v2（新）共 6 条。

-- A1. 写入限制测试：以「陌生人」身份尝试插入一条归属他人的评级，应被拒（报错/捕获即过关）
DO $$
DECLARE
  v_has boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.babies WHERE parent_id IS NOT NULL) INTO v_has;
  IF NOT v_has THEN
    RAISE NOTICE '⏭️ babies 表无 parent 数据，A1 跳过（部署后于应用内实测隔离）';
    RETURN;
  END IF;
  -- 切换为 authenticated 角色，让 RLS 的 WITH CHECK 真正生效
  -- 注意：SET 的值必须是字符串字面量，不是函数调用
  SET ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';
  BEGIN
    WITH b AS (SELECT id AS bid, parent_id AS pid FROM public.babies WHERE parent_id IS NOT NULL LIMIT 1)
    INSERT INTO public.task_voice_ratings (task_id, user_id, baby_id, parent_id)
    SELECT '__gate__', b.pid, b.bid, b.pid FROM b;
    RAISE NOTICE '⚠️ 意外：插入成功（gate 失效，请检查 019 是否执行）';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ GATE OK（写入被拒）：%', SQLERRM;
  END;
  RESET ROLE;
  RESET "request.jwt.claims";
END $$;


-- ============================================================
-- Part B —— 收紧后验收（旧 public_* 已删，仅 _v2 生效）【单结果表版】
-- 目标：① 旧策略全消失 ② 匿名 0 行 ③ 本人见己方 ④ 陌生人 0 行
-- 所有检查合并成一张表一次显示，避免分散在多个结果标签里找不到。
-- ============================================================

DROP TABLE IF EXISTS _b_check;
CREATE TEMP TABLE _b_check (check_name text, expected text, actual text, pass boolean);

DO $$
DECLARE
  v_auth uuid; v_bid uuid;
  n_pub int;
  n_anon_r int; n_anon_rec int;
  n_owner_r int; n_owner_rec int;
  n_str_r int;  n_str_rec int;
  v_claims text;
BEGIN
  -- 幂等清理，避免重复运行产生重复行
  DELETE FROM public.task_voice_ratings        WHERE task_id    = '__verify__';
  DELETE FROM public.therapist_recommendations WHERE content_id = '__verify__';

  -- 取一个真正可用的 auth 用户 + 其名下孩子
  SELECT au.id, b.id
    INTO v_auth, v_bid
  FROM auth.users au
  JOIN public.users u  ON u.auth_user_id = au.id
  JOIN public.babies b ON b.parent_id   = u.id
  LIMIT 1;

  -- B0：旧 public_* 策略残留数（期望 0）
  SELECT count(*) INTO n_pub
  FROM pg_policies
  WHERE tablename IN ('task_voice_ratings','practice_voice_ratings','therapist_recommendations')
    AND policyname LIKE 'public_%';
  INSERT INTO _b_check VALUES ('B0 旧策略残留', '0', n_pub::text, n_pub = 0);

  IF v_auth IS NULL THEN
    INSERT INTO _b_check VALUES
      ('B1 测试行', '已写入', '跳过：无 auth↔孩子配对（需先 Step⑤ 回填 auth_user_id）', false);
    RETURN;
  END IF;

  -- 写标记测试行（postgres 直写，绕过 RLS）
  INSERT INTO public.task_voice_ratings (task_id, user_id, baby_id, parent_id)
    VALUES ('__verify__', v_auth, v_bid, v_auth);
  INSERT INTO public.therapist_recommendations (content_id, content_title, baby_id, therapist_id, user_id)
    VALUES ('__verify__', '__verify__', v_bid, v_auth, v_auth);
  INSERT INTO _b_check VALUES ('B1 测试行', '已写入', '✅ 已写入(baby=' || v_bid || ')', true);

  -- B2 匿名（未登录）应 0 行
  SET ROLE anon; SET "request.jwt.claims" = '{}';
  SELECT count(*) INTO n_anon_r   FROM task_voice_ratings       WHERE task_id    = '__verify__';
  SELECT count(*) INTO n_anon_rec FROM therapist_recommendations WHERE content_id = '__verify__';
  RESET ROLE; RESET "request.jwt.claims";
  INSERT INTO _b_check VALUES
    ('B2 匿名 ratings', '0', n_anon_r::text,   n_anon_r = 0),
    ('B2 匿名 reco',    '0', n_anon_rec::text, n_anon_rec = 0);

  -- B3 本人（该 baby 的 parent = v_auth）应 1 行
  SET ROLE authenticated;
  v_claims := '{"sub":"' || v_auth::text || '","role":"authenticated"}';
  EXECUTE format('SET "request.jwt.claims" = %L', v_claims);
  SELECT count(*) INTO n_owner_r   FROM task_voice_ratings       WHERE task_id    = '__verify__';
  SELECT count(*) INTO n_owner_rec FROM therapist_recommendations WHERE content_id = '__verify__';
  RESET ROLE; RESET "request.jwt.claims";
  INSERT INTO _b_check VALUES
    ('B3 本人 ratings', '1', n_owner_r::text,   n_owner_r = 1),
    ('B3 本人 reco',    '1', n_owner_rec::text, n_owner_rec = 1);

  -- B4 陌生人应 0 行
  SET ROLE authenticated;
  SET "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';
  SELECT count(*) INTO n_str_r   FROM task_voice_ratings       WHERE task_id    = '__verify__';
  SELECT count(*) INTO n_str_rec FROM therapist_recommendations WHERE content_id = '__verify__';
  RESET ROLE; RESET "request.jwt.claims";
  INSERT INTO _b_check VALUES
    ('B4 陌生人 ratings', '0', n_str_r::text,   n_str_r = 0),
    ('B4 陌生人 reco',    '0', n_str_rec::text, n_str_rec = 0);

  -- B5 清理标记行
  DELETE FROM public.task_voice_ratings        WHERE task_id    = '__verify__';
  DELETE FROM public.therapist_recommendations WHERE content_id = '__verify__';
END $$;

SELECT * FROM _b_check;
