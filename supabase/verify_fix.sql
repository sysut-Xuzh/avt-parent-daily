-- 验证脚本：单独运行，检查数据是否插入成功

-- 1. 检查默认用户、宝宝、周计划是否存在
SELECT 'users' AS 表名, count(*) AS 数量 FROM users WHERE id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'babies', count(*) FROM babies WHERE id = 'b0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'weekly_plans', count(*) FROM weekly_plans WHERE id = 'c0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT '今日任务数', count(*) FROM tasks WHERE daily_plan_id IN (
  SELECT id FROM daily_plans WHERE date = CURRENT_DATE
);

-- 2. 检查今日任务详情（应该有4条，每条带 animation_url）
SELECT
  sort_order AS 序号,
  time AS 时间,
  scene AS 场景,
  target_word AS 目标词,
  status AS 状态,
  CASE WHEN animation_url IS NOT NULL THEN '✅有' ELSE '❌无' END AS 动画,
  CASE WHEN audio_url IS NOT NULL THEN '✅有' ELSE '❌无' END AS 音频
FROM tasks
WHERE daily_plan_id IN (
  SELECT id FROM daily_plans WHERE date = CURRENT_DATE
)
ORDER BY sort_order;
