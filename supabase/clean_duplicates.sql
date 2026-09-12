-- 清理重复宝宝数据，保留最新一组（a/b/c 格式的 UUID）
DELETE FROM tasks WHERE baby_id NOT IN (
  SELECT id FROM babies WHERE id LIKE 'b%'
);
DELETE FROM daily_plans WHERE baby_id NOT IN (
  SELECT id FROM babies WHERE id LIKE 'b%'
);
DELETE FROM weekly_plans WHERE baby_id NOT IN (
  SELECT id FROM babies WHERE id LIKE 'b%'
);
DELETE FROM family_therapists WHERE baby_id NOT IN (
  SELECT id FROM babies WHERE id LIKE 'b%'
);
DELETE FROM settings WHERE baby_id NOT IN (
  SELECT id FROM babies WHERE id LIKE 'b%'
);
DELETE FROM babies WHERE id NOT LIKE 'b%';
