-- AVT 8月演示数据 — 让日历当月有内容
-- 在 Supabase SQL Editor 运行

-- 为小宝(b0000000-...001)补 8 月的日计划和任务
DO $$
DECLARE
  day_offset INT;
  dp_id TEXT;
BEGIN
  FOR day_offset IN 1..5 LOOP
    -- 生成日计划 ID（合法 UUID 格式 8-4-4-4-12）
    dp_id := 'd8' || lpad(day_offset::text, 6, '0') || '-0000-0000-0000-' || lpad(day_offset::text, 12, '0');

    -- 8月的日计划
    INSERT INTO daily_plans (id, weekly_plan_id, baby_id, date, status, generated_by, accepted) VALUES
      (dp_id, 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
       DATE '2026-08-' || lpad(day_offset::text, 2, '0'), 'active', 'ai', true)
    ON CONFLICT (baby_id, date) DO NOTHING;

    -- 任务：前2天部分完成，后3天完成
    INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status) VALUES
      (dp_id, 'b0000000-0000-0000-0000-000000000001', '07:30', '早餐', '🍳', '命名等待', '苹果', '拿起苹果→说名称→等3-5秒', 1,
       CASE WHEN day_offset <= 3 THEN 'completed' ELSE 'pending' END),
      (dp_id, 'b0000000-0000-0000-0000-000000000001', '10:00', '游戏', '🎮', '听觉轰炸', '狗', '说3次汪汪→等反应', 2,
       CASE WHEN day_offset <= 2 THEN 'completed' ELSE 'pending' END),
      (dp_id, 'b0000000-0000-0000-0000-000000000001', '18:00', '洗澡', '🛁', '听觉先行', '水', '先说听水声→等2秒→开水', 3,
       CASE WHEN day_offset <= 4 THEN 'completed' ELSE 'pending' END),
      (dp_id, 'b0000000-0000-0000-0000-000000000001', '20:00', '睡前', '🌙', '平行说话', '晚安', '轻声说晚安', 4,
       CASE WHEN day_offset <= 3 THEN 'completed' ELSE 'pending' END)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 补一条8月的测试反馈记录（情绪+笔记）
INSERT INTO task_logs (task_id, baby_id, action, had_audio, parent_mood, notes)
SELECT t.id, t.baby_id, 'partial', false, 'happy', '宝宝今天对水声反应很好，主动转头了！'
FROM tasks t
WHERE t.baby_id = 'b0000000-0000-0000-0000-000000000001'
  AND t.target_word = '水'
  AND t.status = 'completed'
LIMIT 1
ON CONFLICT DO NOTHING;
