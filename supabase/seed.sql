-- =============================================================
-- AVT 种子数据 — 完整测试场景
-- 包含多角色、多天数据、跳过记录、词汇进度
-- =============================================================

-- ----- 用户 -----
INSERT INTO users (id, role, name, email) VALUES
  ('u-parent-1', 'parent', '李妈妈', 'lima@example.com'),
  ('u-parent-2', 'parent', '张妈妈', 'zhangma@example.com'),
  ('u-parent-3', 'parent', '王妈妈', 'wangma@example.com'),
  ('u-therapist-1', 'therapist', '陈治疗师', 'chen@avt.com'),
  ('u-therapist-2', 'therapist', '林治疗师', 'lin@avt.com');

-- ----- 宝宝 -----
INSERT INTO babies (id, parent_id, name, birth_date, hearing_status, device_type, device_fitted_date, avt_stage) VALUES
  ('u-baby-1', 'u-parent-1', '小宝', '2023-06-15', '双耳极重度听损', '人工耳蜗（双侧）', '2023-09-01', 'imitation'),
  ('u-baby-2', 'u-parent-2', '朵朵', '2024-01-20', '左耳中重度听损', '助听器', '2024-03-15', 'association'),
  ('u-baby-3', 'u-parent-3', '乐乐', '2023-09-01', '双耳重度听损', '人工耳蜗（单侧）', '2024-01-10', 'comprehension');

-- ----- 家庭-治疗师关联 -----
INSERT INTO family_therapists (baby_id, therapist_id, is_primary) VALUES
  ('u-baby-1', 'u-therapist-1', true),
  ('u-baby-2', 'u-therapist-2', true),
  ('u-baby-3', 'u-therapist-1', true);

-- ----- 用户设置 -----
INSERT INTO settings (user_id, baby_id, quiet_start_hour, quiet_end_hour, sleep_start_hour, sleep_end_hour, max_daily_tasks) VALUES
  ('u-parent-1', 'u-baby-1', 12, 14, 21, 7, 4),
  ('u-parent-2', 'u-baby-2', 13, 15, 20, 6, 5),
  ('u-parent-3', 'u-baby-3', 12, 14, 21, 7, 6);

-- ----- 本周周计划 -----
INSERT INTO weekly_plans (id, baby_id, therapist_id, week_start, week_end, target_words, strategies, scenes, status) VALUES
  ('wp-1', 'u-baby-1', 'u-therapist-1',
   CURRENT_DATE, CURRENT_DATE + 6,
   ARRAY['苹果', '狗', '水', '晚安', '妈妈'],
   ARRAY['命名等待', '听觉轰炸', '听觉先行', '平行说话', '声学高亮'],
   ARRAY['早餐', '游戏', '洗澡', '睡前'],
   'active');

-- ----- 今天和昨天的日计划 -----
INSERT INTO daily_plans (id, weekly_plan_id, baby_id, date, status, generated_by, accepted) VALUES
  ('dp-today', 'wp-1', 'u-baby-1', CURRENT_DATE, 'active', 'ai', true),
  ('dp-yesterday', 'wp-1', 'u-baby-1', CURRENT_DATE - 1, 'completed', 'ai', true),
  ('dp-day2', 'wp-1', 'u-baby-1', CURRENT_DATE - 2, 'completed', 'ai', true);

-- ----- 今日任务 -----
INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status) VALUES
  ('dp-today', 'u-baby-1', '07:30', '早餐', '🍳', '命名等待', '苹果',
   '拿起苹果 → 说"苹果" → 靠近耳边 → 等5秒', 1, 'completed'),
  ('dp-today', 'u-baby-1', '10:00', '游戏', '🎮', '听觉轰炸', '狗',
   '拿出狗卡片 → 说3次"汪汪" → 等一等 → 看反应', 2, 'pending'),
  ('dp-today', 'u-baby-1', '18:00', '洗澡', '🛁', '听觉先行', '水',
   '说"听，水声！" → 等2秒 → 开水龙头 → 看宝宝反应', 3, 'pending'),
  ('dp-today', 'u-baby-1', '20:00', '睡前', '🌙', '平行说话', '晚安',
   '抱着宝宝说"我们要睡觉啦" → 轻声说"晚安" → 抚摸额头', 4, 'pending');

-- ----- 昨天的任务（部分完成+跳过） -----
INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status) VALUES
  ('dp-yesterday', 'u-baby-1', '07:30', '早餐', '🍳', '命名等待', '苹果',
   '拿起苹果 → 说"苹果" → 等5秒', 1, 'completed'),
  ('dp-yesterday', 'u-baby-1', '10:00', '游戏', '🎮', '听觉轰炸', '狗',
   '说"汪汪" → 让宝宝找狗狗 → 表扬', 2, 'completed'),
  ('dp-yesterday', 'u-baby-1', '18:00', '洗澡', '🛁', '听觉先行', '水',
   '说"听，水声！" → 等2秒 → 打开水龙头', 3, 'skipped'),
  ('dp-yesterday', 'u-baby-1', '20:00', '睡前', '🌙', '平行说话', '晚安',
   '说"晚安" → 关灯 → 轻拍', 4, 'completed');

-- ----- 执行日志（昨天的完成+跳过记录）-----
INSERT INTO task_logs (task_id, baby_id, action, completed_at, duration_seconds, parent_mood, child_response) VALUES
  ((SELECT id FROM tasks WHERE daily_plan_id = 'dp-yesterday' AND sort_order = 1),
   'u-baby-1', 'complete', CURRENT_DATE - 1 + TIME '07:35', 180, 'happy', 'interested'),
  ((SELECT id FROM tasks WHERE daily_plan_id = 'dp-yesterday' AND sort_order = 2),
   'u-baby-1', 'complete', CURRENT_DATE - 1 + TIME '10:12', 300, 'happy', 'interested'),
  ((SELECT id FROM tasks WHERE daily_plan_id = 'dp-yesterday' AND sort_order = 3),
   'u-baby-1', 'skip', CURRENT_DATE - 1 + TIME '18:05', NULL, 'tired', 'uncooperative'),
  ((SELECT id FROM tasks WHERE daily_plan_id = 'dp-yesterday' AND sort_order = 4),
   'u-baby-1', 'complete', CURRENT_DATE - 1 + TIME '20:08', 120, 'neutral', 'neutral');

-- ----- 跳过追踪（昨天洗澡任务被跳过记录）-----
INSERT INTO skip_tracking (baby_id, target_word, strategy, scene, time_slot, skip_count, consecutive_skips, last_skipped_at) VALUES
  ('u-baby-1', '水', '听觉先行', '洗澡', 'evening', 1, 1, CURRENT_DATE - 1 + TIME '18:05');

-- ----- 词汇掌握度 -----
INSERT INTO word_mastery (baby_id, word, stage, exposure_count, correct_response_count, last_practiced_at) VALUES
  ('u-baby-1', '苹果', 'association', 8, 6, CURRENT_DATE - 1 + TIME '07:35'),
  ('u-baby-1', '狗', 'detection', 4, 3, CURRENT_DATE - 1 + TIME '10:12'),
  ('u-baby-1', '水', 'not_started', 1, 0, CURRENT_DATE - 1 + TIME '18:05'),
  ('u-baby-1', '晚安', 'detection', 3, 2, CURRENT_DATE - 1 + TIME '20:08');

-- ----- 推送订阅（测试设备）-----
INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, device_info) VALUES
  ('u-parent-1', 'https://example.com/push/test-endpoint-1', 'test-p256dh-key-1', 'test-auth-key-1', 'Chrome 120 Windows'),
  ('u-parent-1', 'https://example.com/push/test-endpoint-2', 'test-p256dh-key-2', 'test-auth-key-2', 'Safari iOS 17');

-- ----- 上周报告 -----
INSERT INTO reports (baby_id, week_start, week_end, total_tasks, completed_tasks, skipped_tasks, completion_rate, streak_days, longest_streak, words_practiced, summary) VALUES
  ('u-baby-1', CURRENT_DATE - 7, CURRENT_DATE - 1, 21, 15, 4, 71.43, 5, 5,
   ARRAY['苹果', '狗', '水', '晚安'],
   '小宝本周表现出色！「苹果」已进入联想阶段，能主动转向声源。建议下周继续巩固「狗」的听觉轰炸训练，增加「水」的接触频率。');
