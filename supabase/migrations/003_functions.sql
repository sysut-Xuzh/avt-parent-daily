-- =============================================================
-- 数据库函数和触发器
-- 自动完成：跳过追踪、打卡计算、报告生成、词汇升级
-- =============================================================

-- =============================================================
-- 函数 1：记录任务跳过 → 自动更新 skip_tracking
-- =============================================================
CREATE OR REPLACE FUNCTION record_task_skip()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  time_slot TEXT;
  current_hour INT;
BEGIN
  current_hour := EXTRACT(HOUR FROM NEW.completed_at)::INT;
  time_slot := CASE
    WHEN current_hour < 12 THEN 'morning'
    WHEN current_hour < 18 THEN 'afternoon'
    ELSE 'evening'
  END;

  -- 插入或更新跳过记录
  INSERT INTO skip_tracking (baby_id, target_word, strategy, scene, time_slot, skip_count, consecutive_skips, last_skipped_at)
  VALUES (
    NEW.baby_id,
    (SELECT target_word FROM tasks WHERE id = NEW.task_id),
    (SELECT strategy FROM tasks WHERE id = NEW.task_id),
    (SELECT scene FROM tasks WHERE id = NEW.task_id),
    time_slot,
    1, 1, NOW()
  )
  ON CONFLICT (baby_id, target_word, strategy, time_slot)
  DO UPDATE SET
    skip_count = skip_tracking.skip_count + 1,
    consecutive_skips = skip_tracking.consecutive_skips + 1,
    last_skipped_at = NOW(),
    cooldown_until = CASE
      WHEN skip_tracking.consecutive_skips + 1 >= 3
      THEN NOW() + INTERVAL '2 hours'  -- 连续跳过3次，冷却2小时
      WHEN skip_tracking.consecutive_skips + 1 >= 2
      THEN NOW() + INTERVAL '1 hour'   -- 连续跳过2次，冷却1小时
      ELSE NULL
    END;

  RETURN NEW;
END;
$$;

-- 任务跳过时触发
CREATE TRIGGER on_task_skipped
  AFTER INSERT ON task_logs
  FOR EACH ROW
  WHEN (NEW.action = 'skip')
  EXECUTE FUNCTION record_task_skip();

-- =============================================================
-- 函数 2：任务完成 → 更新词汇掌握度
-- =============================================================
CREATE OR REPLACE FUNCTION update_word_mastery()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  word_text TEXT;
  current_stage TEXT;
  completed_count INT;
BEGIN
  IF NEW.action = 'complete' OR NEW.action = 'partial' THEN
    word_text := (SELECT target_word FROM tasks WHERE id = NEW.task_id);

    -- 获取当前阶段
    SELECT stage INTO current_stage FROM word_mastery
    WHERE baby_id = NEW.baby_id AND word = word_text;

    IF NOT FOUND THEN
      -- 首次接触
      INSERT INTO word_mastery (baby_id, word, stage, exposure_count, correct_response_count, last_practiced_at)
      VALUES (NEW.baby_id, word_text, 'detection', 1, CASE WHEN NEW.action = 'complete' THEN 1 ELSE 0 END, NOW());
    ELSE
      -- 更新接触次数
      UPDATE word_mastery SET
        exposure_count = exposure_count + 1,
        correct_response_count = correct_response_count + CASE WHEN NEW.action = 'complete' THEN 1 ELSE 0 END,
        last_practiced_at = NOW()
      WHERE baby_id = NEW.baby_id AND word = word_text;

      -- 自动升级逻辑（每正确完成5次升一阶段）
      IF current_stage = 'detection' AND (
        SELECT correct_response_count FROM word_mastery WHERE baby_id = NEW.baby_id AND word = word_text
      ) >= 5 THEN
        UPDATE word_mastery SET stage = 'association' WHERE baby_id = NEW.baby_id AND word = word_text;
      ELSIF current_stage = 'association' AND (
        SELECT correct_response_count FROM word_mastery WHERE baby_id = NEW.baby_id AND word = word_text
      ) >= 10 THEN
        UPDATE word_mastery SET stage = 'imitation' WHERE baby_id = NEW.baby_id AND word = word_text;
      ELSIF current_stage = 'imitation' AND (
        SELECT correct_response_count FROM word_mastery WHERE baby_id = NEW.baby_id AND word = word_text
      ) >= 20 THEN
        UPDATE word_mastery SET stage = 'comprehension' WHERE baby_id = NEW.baby_id AND word = word_text;
      ELSIF current_stage = 'comprehension' AND (
        SELECT correct_response_count FROM word_mastery WHERE baby_id = NEW.baby_id AND word = word_text
      ) >= 30 THEN
        UPDATE word_mastery SET stage = 'production', mastered_at = NOW()
        WHERE baby_id = NEW.baby_id AND word = word_text;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_completed
  AFTER INSERT ON task_logs
  FOR EACH ROW
  WHEN (NEW.action IN ('complete', 'partial'))
  EXECUTE FUNCTION update_word_mastery();

-- =============================================================
-- 函数 3：自动生成周报告
-- =============================================================
CREATE OR REPLACE FUNCTION generate_weekly_report(
  p_baby_id UUID,
  p_week_start DATE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  p_week_end DATE := p_week_start + 6;
  v_total INT;
  v_completed INT;
  v_skipped INT;
  v_rate DECIMAL(5,2);
  v_streak INT;
  v_report_id UUID;
  v_words TEXT[];
  v_improved TEXT[];
BEGIN
  -- 统计
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'skipped')
  INTO v_total, v_completed, v_skipped
  FROM tasks
  WHERE baby_id = p_baby_id
    AND created_at::DATE >= p_week_start
    AND created_at::DATE <= p_week_end;

  v_rate := CASE WHEN v_total > 0 THEN ROUND(v_completed::DECIMAL / v_total * 100, 2) ELSE 0 END;

  -- 计算最长连续打卡
  WITH daily_completion AS (
    SELECT DISTINCT date::DATE as task_date
    FROM tasks
    WHERE baby_id = p_baby_id AND status = 'completed'
      AND date >= p_week_start AND date <= p_week_end
  ), streaks AS (
    SELECT task_date,
      task_date - ROW_NUMBER() OVER (ORDER BY task_date)::INT AS grp
    FROM daily_completion
  )
  SELECT COALESCE(MAX(cnt), 0) INTO v_streak
  FROM (
    SELECT COUNT(*) AS cnt
    FROM streaks
    GROUP BY grp
  ) s;

  -- 本周练习过的词
  SELECT ARRAY_AGG(DISTINCT target_word) INTO v_words
  FROM tasks
  WHERE baby_id = p_baby_id
    AND created_at::DATE >= p_week_start
    AND created_at::DATE <= p_week_end;

  -- 本周有进步的词
  SELECT ARRAY_AGG(DISTINCT wm.word) INTO v_improved
  FROM word_mastery wm
  WHERE wm.baby_id = p_baby_id
    AND wm.updated_at::DATE >= p_week_start
    AND wm.updated_at::DATE <= p_week_end
    AND wm.stage IN ('imitation', 'comprehension', 'production');

  -- 插入报告
  INSERT INTO reports (baby_id, week_start, week_end, total_tasks, completed_tasks, skipped_tasks,
    completion_rate, streak_days, longest_streak, words_practiced, words_improved)
  VALUES (p_baby_id, p_week_start, p_week_end, v_total, v_completed, v_skipped,
    v_rate, v_streak, v_streak, COALESCE(v_words, '{}'), COALESCE(v_improved, '{}'))
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

-- =============================================================
-- 函数 4：判断某个任务是否应该被推送
-- （考虑跳过历史 + 冷却期）
-- =============================================================
CREATE OR REPLACE FUNCTION should_push_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_baby_id UUID;
  v_word TEXT;
  v_strategy TEXT;
  v_skip RECORD;
BEGIN
  SELECT baby_id, target_word, strategy INTO v_baby_id, v_word, v_strategy
  FROM tasks WHERE id = p_task_id;

  -- 检查是否有冷却期
  SELECT * INTO v_skip FROM skip_tracking
  WHERE baby_id = v_baby_id
    AND target_word = v_word
    AND strategy = v_strategy
    AND cooldown_until IS NOT NULL
    AND cooldown_until > NOW();

  IF FOUND THEN
    RETURN FALSE; -- 冷却中，不推送
  END IF;

  RETURN TRUE;
END;
$$;

-- =============================================================
-- 函数 5：获取下一个需要推送的任务
-- =============================================================
CREATE OR REPLACE FUNCTION get_next_task_to_push(p_baby_id UUID, p_current_time TIME)
RETURNS TABLE (
  task_id UUID,
  time TEXT,
  scene TEXT,
  scene_icon TEXT,
  strategy TEXT,
  target_word TEXT,
  instruction TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.time, t.scene, t.scene_icon, t.strategy, t.target_word, t.instruction
  FROM tasks t
  WHERE t.baby_id = p_baby_id
    AND t.status = 'pending'
    AND t.time::TIME BETWEEN p_current_time - INTERVAL '10 minutes' AND p_current_time + INTERVAL '30 minutes'
    AND should_push_task(t.id)
  ORDER BY t.sort_order
  LIMIT 1;
END;
$$;
