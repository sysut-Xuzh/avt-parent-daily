-- =============================================================
-- 020 · RLS 收紧阶段B —— 删除旧策略（阶段一·步骤5 收尾）
-- ⚠️ 仅当 02_stage2_verification.sql 的 Part A 全部通过后再执行：
--     ① 未登录 SELECT → 0 行  ② 家长A 看不到家长B  ③ 双娃切换隔离
--     ④ 治疗师仅看己方家庭  ⑤ 推荐定向  ⑥ 旧 USING(true) 全部删除
-- 在 Supabase SQL Editor 整段粘贴后点 Run。期望：多条 "DROP POLICY" 成功，无 ERROR。
-- =============================================================

-- 删除开发期全开放旧策略（013/014 创建）
DROP POLICY IF EXISTS "public_insert_task_voice_ratings"      ON task_voice_ratings;
DROP POLICY IF EXISTS "public_select_task_voice_ratings"      ON task_voice_ratings;
DROP POLICY IF EXISTS "public_insert_practice_voice_ratings"  ON practice_voice_ratings;
DROP POLICY IF EXISTS "public_select_practice_voice_ratings"  ON practice_voice_ratings;
DROP POLICY IF EXISTS "public_insert_therapist_recommendations" ON therapist_recommendations;
DROP POLICY IF EXISTS "public_select_therapist_recommendations" ON therapist_recommendations;

-- =============================================================
-- 最终强制归属（应用层回填 baby_id 完成后执行）：
--   1) 去掉下方 _v2 策略 WITH CHECK 中的 "OR baby_id IS NULL"
--   2) 设 NOT NULL，杜绝空归属写入
--      ALTER TABLE task_voice_ratings     ALTER COLUMN baby_id SET NOT NULL;
--      ALTER TABLE practice_voice_ratings ALTER COLUMN baby_id SET NOT NULL;
--      ALTER TABLE therapist_recommendations ALTER COLUMN baby_id SET NOT NULL;
-- （本步为可选收口，建议应用层稳定跑通一段时间后再执行）
-- =============================================================

SELECT 'Step3 OK: 旧 public_* 策略已删除' AS status;
