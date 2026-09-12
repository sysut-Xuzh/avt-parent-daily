-- =============================================================
-- Step 5 of 5 · 历史行回填 + 清理 __selftest__ 脏数据
-- 在 Supabase SQL Editor 整段粘贴后点 Run。
-- =============================================================

-- 1) 身份字段回填（仅当已存在历史 users 行时；新注册用户已由 015 触发器自动同步）
--    只回填「既在 users 又在 auth.users 中」的行，孤立档案不自动处理。
UPDATE users
SET auth_user_id = id
WHERE auth_user_id IS NULL
  AND id IN (SELECT id FROM auth.users);

-- 回填行数核对（应为本次实际回填的条数）
SELECT count(*) AS users_needing_backfill
FROM users
WHERE auth_user_id IS NULL;   -- 期望 0（若仍有孤立档案会 >0，需人工核对）

-- 2) 清理连通性自测残留（2026-09-03 插入的 __selftest__ 行）
DELETE FROM public.task_voice_ratings
WHERE task_id = '__selftest__';

DELETE FROM public.practice_voice_ratings
WHERE content_id = '__selftest__';

-- 确认已清理（两张表都应返回 0 行）
SELECT
  (SELECT count(*) FROM public.task_voice_ratings      WHERE task_id = '__selftest__') AS leftover_task,
  (SELECT count(*) FROM public.practice_voice_ratings  WHERE content_id = '__selftest__') AS leftover_practice;

SELECT 'Step5 OK: 回填与清理完成' AS status;
