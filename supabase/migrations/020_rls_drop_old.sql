-- =============================================================
-- 020 · RLS 收紧阶段B —— 删除旧策略（阶段一·步骤5 收尾）
-- ⚠️ 仅当 019 的验收项全部通过后再执行：
--     ① 未登录 SELECT → 0 行/报错  ② 家长A 看不到家长B  ③ 双娃切换隔离
--     ④ 治疗师仅看己方家庭  ⑤ 推荐定向（仅目标家庭可见）  ⑥ 旧 USING(true) 全部删除
-- =============================================================

-- 删除开发期全开放旧策略（013/014 创建）
DROP POLICY IF EXISTS "public_insert_task_voice_ratings"      ON task_voice_ratings;
DROP POLICY IF EXISTS "public_select_task_voice_ratings"      ON task_voice_ratings;
DROP POLICY IF EXISTS "public_insert_practice_voice_ratings"  ON practice_voice_ratings;
DROP POLICY IF EXISTS "public_select_practice_voice_ratings"  ON practice_voice_ratings;
DROP POLICY IF EXISTS "public_insert_therapist_recommendations" ON therapist_recommendations;
DROP POLICY IF EXISTS "public_select_therapist_recommendations" ON therapist_recommendations;

-- 清理旧 auth schema 辅助函数（已被 public 版本取代；上面的旧策略是唯一引用者，已删除）
-- 注：SQL Editor 默认 postgres 角色可能无 auth 模式操作权限，故用 DO 块"尽力而为"：
--     有权限就删；无权限则跳过并提示，不影响 020 主流程（残留的 auth 函数无害）。
DO $$
BEGIN
  DROP FUNCTION IF EXISTS auth.user_role() CASCADE;
  DROP FUNCTION IF EXISTS auth.my_baby_ids() CASCADE;
  RAISE NOTICE 'old auth helper functions dropped';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'skip dropping auth helper functions (no permission on auth schema): %', SQLERRM;
END $$;

-- =============================================================
-- 最终强制归属（应用层回填 baby_id 完成后执行）：
--   1) 去掉下方 _v2 策略 WITH CHECK 中的 "OR baby_id IS NULL"
--   2) 设 NOT NULL，杜绝空归属写入
--      ALTER TABLE task_voice_ratings     ALTER COLUMN baby_id SET NOT NULL;
--      ALTER TABLE practice_voice_ratings ALTER COLUMN baby_id SET NOT NULL;
--      ALTER TABLE therapist_recommendations ALTER COLUMN baby_id SET NOT NULL;
-- =============================================================
