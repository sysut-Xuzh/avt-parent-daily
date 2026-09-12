-- 清理 2026-09-03 连通性自测插入的一行测试数据
-- 背景：验证 task_voice_ratings 写入权限时插入了一条 task_id='__selftest__' 的记录，
-- 因迁移 013 只授予 anon 的 INSERT/SELECT 策略（无 DELETE），无法用 anon key 删除。
-- 请在 Supabase SQL Editor 执行本文件。

DELETE FROM public.task_voice_ratings
WHERE task_id = '__selftest__';

-- 确认已清理（应返回 0 行）
SELECT id, task_id, date, star_rating
FROM public.task_voice_ratings
WHERE task_id = '__selftest__';
