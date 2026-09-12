-- 性能优化：数据库索引
-- 在 Supabase SQL Editor 运行
-- 高频查询索引，加速 Dashboard 和 API 响应

-- 1. tasks 表：按日计划查询任务（最常用）
CREATE INDEX IF NOT EXISTS idx_tasks_daily_plan ON tasks(daily_plan_id);

-- 2. tasks 表：按状态筛选待办
CREATE INDEX IF NOT EXISTS idx_tasks_status_date ON tasks(status, daily_plan_id) WHERE status = 'pending';

-- 3. daily_plans 表：按日期查询
CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_plans(date);

-- 4. task_logs 表：按宝宝和时间查询
CREATE INDEX IF NOT EXISTS idx_task_logs_baby_time ON task_logs(baby_id, completed_at DESC);

-- 5. push_subscriptions 表：按用户查询
CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id, active);

-- 6. 跳过追踪：按冷却期查询（推送调度常用）
CREATE INDEX IF NOT EXISTS idx_skip_cooldown ON skip_tracking(baby_id, cooldown_until) WHERE cooldown_until IS NOT NULL;
