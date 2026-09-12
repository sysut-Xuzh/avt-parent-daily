-- =============================================================
-- 017 · 历史脏数据归档（阶段一·步骤3）
-- ⚠️ 破坏性操作：归档并清空历史评级数据。须在 016 执行之后运行。
-- 用途：开发期脏数据（含 __selftest__ 测试行）不值得保留，归档留痕后清空正式表。
-- =============================================================

-- 1. 归档（保留历史可查，结构同原表含索引/约束）
CREATE TABLE IF NOT EXISTS _archive_task_voice_ratings (LIKE task_voice_ratings INCLUDING ALL);
INSERT INTO _archive_task_voice_ratings SELECT * FROM task_voice_ratings;

CREATE TABLE IF NOT EXISTS _archive_practice_voice_ratings (LIKE practice_voice_ratings INCLUDING ALL);
INSERT INTO _archive_practice_voice_ratings SELECT * FROM practice_voice_ratings;

-- 2. 清空正式表
--    默认仅删除已知脏数据行（安全）；若确认无真实用户数据需全清，
--    取消下面 TRUNCATE 行的注释后执行。
DELETE FROM task_voice_ratings      WHERE task_id = '__selftest__';
DELETE FROM practice_voice_ratings WHERE content_id = '__selftest__';
-- TRUNCATE TABLE task_voice_ratings, practice_voice_ratings RESTART IDENTITY;

-- 3. 核对归档行数 / 剩余行数
SELECT
  (SELECT count(*) FROM _archive_task_voice_ratings)     AS archived_task,
  (SELECT count(*) FROM _archive_practice_voice_ratings) AS archived_practice,
  (SELECT count(*) FROM task_voice_ratings)             AS live_task,
  (SELECT count(*) FROM practice_voice_ratings)         AS live_practice;
