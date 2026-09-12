-- =============================================================
-- AVT 动画接入 — 简化修复版（直接运行即可）
-- =============================================================

-- 第一步：加字段（已加过也不会报错）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS animation_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS speech_text TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 第二步：确保有今天的日计划（用固定 ID，ON CONFLICT 避免重复）
INSERT INTO daily_plans (id, weekly_plan_id, baby_id, date, status, generated_by, accepted)
VALUES (
  'd1000000-0000-0000-0000-000000000099',
  'c0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  CURRENT_DATE,
  'active', 'ai', true
)
ON CONFLICT (baby_id, date) DO UPDATE SET status = 'active';

-- 第三步：先删掉今天可能已存在的任务（避免重复）
DELETE FROM tasks
WHERE baby_id = 'b0000000-0000-0000-0000-000000000001'
  AND daily_plan_id IN (
    SELECT id FROM daily_plans
    WHERE baby_id = 'b0000000-0000-0000-0000-000000000001'
      AND date = CURRENT_DATE
  );

-- 第四步：插入 4 条带动画的任务
INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status, animation_url, speech_text, audio_url)
SELECT dp.id, 'b0000000-0000-0000-0000-000000000001', v.*
FROM daily_plans dp
CROSS JOIN (VALUES
  ('07:30'::TEXT, '早餐', '🍳', '命名等待', '苹果', '拿起苹果→说名称→等3-5秒', 1, 'pending'::TEXT, '/animations/mingming-dengdai-pingguo.mp4', '苹果', '/animations/speech-01-pingguo.mp3'),
  ('10:00', '游戏', '🎮', '听觉轰炸', '狗', '说3次汪汪→等反应', 2, 'pending', '/animations/tingjue-hongzha-gou.mp4', '汪汪，汪汪，汪汪', '/animations/speech-02-gou.mp3'),
  ('18:00', '洗澡', '🛁', '听觉先行', '水', '先说听水声→等2秒→开水', 3, 'pending', '/animations/tingjue-xianxing-shui.mp4', '洗头发，搓搓搓，水哗啦啦', '/animations/speech-03-shui.mp3'),
  ('20:00', '睡前', '🌙', '平行说话', '晚安', '轻声说晚安', 4, 'pending', '/animations/pingxing-shuohua-wanan.mp4', '月亮在天上，星星眨眼睛', '/animations/speech-04-wanan.mp3')
) AS v(time, scene, scene_icon, strategy, target_word, instruction, sort_order, status, animation_url, speech_text, audio_url)
WHERE dp.baby_id = 'b0000000-0000-0000-0000-000000000001'
  AND dp.date = CURRENT_DATE;

-- 第五步：验证（应该返回 4 行）
SELECT time, scene, strategy, target_word, animation_url, audio_url, speech_text
FROM tasks
WHERE baby_id = 'b0000000-0000-0000-0000-000000000001'
  AND daily_plan_id IN (
    SELECT id FROM daily_plans WHERE date = CURRENT_DATE
  )
ORDER BY sort_order;
