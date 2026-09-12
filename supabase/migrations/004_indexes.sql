-- =============================================================
-- 性能索引
-- =============================================================

-- 用户查询
CREATE INDEX idx_users_role ON users(role);

-- 任务状态查询（推送引擎高频使用）
CREATE INDEX idx_tasks_pending_push ON tasks(baby_id, status, time)
  WHERE status = 'pending';

-- 跳过追踪查询
CREATE INDEX idx_skip_cooldown ON skip_tracking(baby_id, cooldown_until)
  WHERE cooldown_until IS NOT NULL;

-- 词汇掌握查询
CREATE INDEX idx_word_stage ON word_mastery(baby_id, stage);

-- 推送日志查询
CREATE INDEX idx_push_logs_unviewed ON push_logs(user_id, viewed_at)
  WHERE viewed_at IS NULL;

-- 报告查询
CREATE INDEX idx_reports_week ON reports(baby_id, week_start DESC);
