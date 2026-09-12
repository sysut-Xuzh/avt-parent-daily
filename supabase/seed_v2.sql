-- AVT 种子数据 v2 — 3 个模拟家庭 + 一周执行记录
-- 在 Supabase SQL Editor 运行

-- ===== 1. 用户 =====
INSERT INTO users (id, role, name, email) VALUES
  ('u-parent-1', 'parent', '李妈妈', 'lima@example.com'),
  ('u-parent-2', 'parent', '张妈妈', 'zhangma@example.com'),
  ('u-parent-3', 'parent', '王妈妈', 'wangma@example.com'),
  ('u-therapist-1', 'therapist', '陈治疗师', 'chen@avt.com')
ON CONFLICT (id) DO NOTHING;

-- ===== 2. 宝宝 =====
INSERT INTO babies (id, parent_id, name, birth_date, hearing_status, device_type, avt_stage) VALUES
  ('u-baby-1', 'u-parent-1', '小宝', '2023-06-15', '双耳极重度听损', '人工耳蜗（双侧）', 'imitation'),
  ('u-baby-2', 'u-parent-2', '朵朵', '2024-01-20', '左耳中重度听损', '助听器', 'association'),
  ('u-baby-3', 'u-parent-3', '乐乐', '2023-09-01', '双耳重度听损', '人工耳蜗（单侧）', 'comprehension')
ON CONFLICT (id) DO NOTHING;

-- ===== 3. 治疗师关联 =====
INSERT INTO family_therapists (baby_id, therapist_id, is_primary) VALUES
  ('u-baby-1', 'u-therapist-1', true),
  ('u-baby-2', 'u-therapist-1', true),
  ('u-baby-3', 'u-therapist-1', true)
ON CONFLICT DO NOTHING;

-- ===== 4. 设置 =====
INSERT INTO settings (user_id, baby_id, quiet_start_hour, quiet_end_hour, max_daily_tasks) VALUES
  ('u-parent-1', 'u-baby-1', 12, 14, 4),
  ('u-parent-2', 'u-baby-2', 13, 15, 5),
  ('u-parent-3', 'u-baby-3', 12, 14, 6)
ON CONFLICT (user_id, baby_id) DO NOTHING;

-- ===== 5. 本周周计划 =====
INSERT INTO weekly_plans (id, baby_id, therapist_id, week_start, week_end, target_words, strategies, status) VALUES
  ('wp-baby1', 'u-baby-1', 'u-therapist-1', CURRENT_DATE, CURRENT_DATE + 6, ARRAY['苹果','狗','水','晚安','妈妈'], ARRAY['命名等待','听觉轰炸','听觉先行','平行说话'], 'active'),
  ('wp-baby2', 'u-baby-2', 'u-therapist-1', CURRENT_DATE, CURRENT_DATE + 6, ARRAY['猫','牛奶','球','灯','抱抱'], ARRAY['命名等待','声学高亮','听觉轰炸','听觉先行'], 'active'),
  ('wp-baby3', 'u-baby-3', 'u-therapist-1', CURRENT_DATE, CURRENT_DATE + 6, ARRAY['车','鸟','鱼','月亮','星星'], ARRAY['平行说话','听觉轰炸','命名等待','听觉先行'], 'active')
ON CONFLICT (id) DO NOTHING;

-- ===== 6. 日计划 + 任务（今天 + 过去6天共7天） =====
DO $$
DECLARE
  day_offset INT;
  dp_id TEXT;
  baby_record RECORD;
BEGIN
  FOR day_offset IN 0..6 LOOP
    FOR baby_record IN SELECT id, name FROM babies LOOP
      dp_id := 'dp-' || baby_record.name || '-' || day_offset;

      -- 日计划
      INSERT INTO daily_plans (id, weekly_plan_id, baby_id, date, status, generated_by, accepted) VALUES
        (dp_id, CASE baby_record.name
          WHEN '小宝' THEN 'wp-baby1'
          WHEN '朵朵' THEN 'wp-baby2'
          WHEN '乐乐' THEN 'wp-baby3'
        END, baby_record.id, CURRENT_DATE - day_offset, 'active', 'ai', true)
      ON CONFLICT (baby_id, date) DO NOTHING;

      -- 插入 4 个任务（每个日计划）
      INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status) VALUES
        (dp_id, baby_record.id, '07:30', '早餐', '🍳', '命名等待',
          CASE baby_record.name WHEN '小宝' THEN '苹果' WHEN '朵朵' THEN '猫' ELSE '车' END,
          '拿起→说出名称→等3-5秒', 1,
          CASE WHEN day_offset < 2 THEN 'completed' ELSE 'pending' END),
        (dp_id, baby_record.id, '10:00', '游戏', '🎮', '听觉轰炸',
          CASE baby_record.name WHEN '小宝' THEN '狗' WHEN '朵朵' THEN '牛奶' ELSE '鸟' END,
          '重复说3次目标词→等一等', 2,
          CASE WHEN day_offset < 3 THEN 'completed' ELSE 'pending' END),
        (dp_id, baby_record.id, '18:00', '洗澡', '🛁', '听觉先行',
          CASE baby_record.name WHEN '小宝' THEN '水' WHEN '朵朵' THEN '球' ELSE '鱼' END,
          '先发出声音→等2秒→出示实物', 3,
          'pending'),
        (dp_id, baby_record.id, '20:00', '睡前', '🌙', '平行说话',
          CASE baby_record.name WHEN '小宝' THEN '晚安' WHEN '朵朵' THEN '灯' ELSE '月亮' END,
          '描述宝宝正在做的事', 4, 'pending')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
