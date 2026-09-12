-- 给 tasks 表添加训练活动类型字段
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS activity_type TEXT;
CREATE INDEX IF NOT EXISTS idx_tasks_activity ON tasks(activity_type);
