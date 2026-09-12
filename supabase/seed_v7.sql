-- AVT 种子数据 v7 — 7 天完整数据（3 个家庭 × 7 天）
-- 先跑 v3 版的基础数据 + 这个
-- 通过子查询关联日计划，避免 UUID 硬编码问题

-- ===== 昨天的日计划 =====
INSERT INTO daily_plans (id, weekly_plan_id, baby_id, date, status, accepted) 
SELECT gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE - 1, 'completed', true
WHERE NOT EXISTS (SELECT 1 FROM daily_plans WHERE baby_id = 'b0000000-0000-0000-0000-000000000001' AND date = CURRENT_DATE - 1);

INSERT INTO daily_plans (id, weekly_plan_id, baby_id, date, status, accepted) 
SELECT gen_random_uuid(), 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', CURRENT_DATE - 1, 'completed', true
WHERE NOT EXISTS (SELECT 1 FROM daily_plans WHERE baby_id = 'b0000000-0000-0000-0000-000000000002' AND date = CURRENT_DATE - 1);

INSERT INTO daily_plans (id, weekly_plan_id, baby_id, date, status, accepted) 
SELECT gen_random_uuid(), 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - 1, 'completed', true
WHERE NOT EXISTS (SELECT 1 FROM daily_plans WHERE baby_id = 'b0000000-0000-0000-0000-000000000003' AND date = CURRENT_DATE - 1);

-- ===== 昨天的任务（已完成） =====
INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status)
SELECT dp.id, dp.baby_id, '07:30', '早餐', '🍳', '命名等待', '苹果', '拿起苹果→说出名称→等3-5秒', 1, 'completed'
FROM daily_plans dp WHERE dp.baby_id = 'b0000000-0000-0000-0000-000000000001' AND dp.date = CURRENT_DATE - 1;

INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status)
SELECT dp.id, dp.baby_id, '10:00', '游戏', '🎮', '听觉轰炸', '狗', '说3次"汪汪"→等一等', 2, 'completed'
FROM daily_plans dp WHERE dp.baby_id = 'b0000000-0000-0000-0000-000000000001' AND dp.date = CURRENT_DATE - 1;

INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status)
SELECT dp.id, dp.baby_id, '18:00', '洗澡', '🛁', '听觉先行', '水', '说"听，水声！"→等2秒', 3, 'completed'
FROM daily_plans dp WHERE dp.baby_id = 'b0000000-0000-0000-0000-000000000001' AND dp.date = CURRENT_DATE - 1;

INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status)
SELECT dp.id, dp.baby_id, '20:00', '睡前', '🌙', '平行说话', '晚安', '轻声说"晚安"', 4, 'completed'
FROM daily_plans dp WHERE dp.baby_id = 'b0000000-0000-0000-0000-000000000001' AND dp.date = CURRENT_DATE - 1;

-- ===== 昨天的朵朵任务 =====
INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status)
SELECT dp.id, dp.baby_id, '07:30', '早餐', '🍳', '命名等待', '猫', '说"猫"→等一等', 1, 'completed'
FROM daily_plans dp WHERE dp.baby_id = 'b0000000-0000-0000-0000-000000000002' AND dp.date = CURRENT_DATE - 1;

INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status)
SELECT dp.id, dp.baby_id, '10:00', '游戏', '🎮', '听觉轰炸', '牛奶', '说"牛奶"3次', 2, 'completed'
FROM daily_plans dp WHERE dp.baby_id = 'b0000000-0000-0000-0000-000000000002' AND dp.date = CURRENT_DATE - 1;

INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status)
SELECT dp.id, dp.baby_id, '18:00', '洗澡', '🛁', '听觉先行', '球', '说"球滚了"→等2秒', 3, 'completed'
FROM daily_plans dp WHERE dp.baby_id = 'b0000000-0000-0000-0000-000000000002' AND dp.date = CURRENT_DATE - 1;

INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status)
SELECT dp.id, dp.baby_id, '20:00', '睡前', '🌙', '平行说话', '灯', '说"关灯啦"', 4, 'completed'
FROM daily_plans dp WHERE dp.baby_id = 'b0000000-0000-0000-0000-000000000002' AND dp.date = CURRENT_DATE - 1;

-- ===== 昨天的乐乐任务 =====
INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status)
SELECT dp.id, dp.baby_id, '07:30', '早餐', '🍳', '命名等待', '车', '说"车"→推一下', 1, 'completed'
FROM daily_plans dp WHERE dp.baby_id = 'b0000000-0000-0000-0000-000000000003' AND dp.date = CURRENT_DATE - 1;

INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status)
SELECT dp.id, dp.baby_id, '10:00', '游戏', '🎮', '听觉轰炸', '鸟', '模仿鸟叫3次', 2, 'skipped'
FROM daily_plans dp WHERE dp.baby_id = 'b0000000-0000-0000-0000-000000000003' AND dp.date = CURRENT_DATE - 1;

INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status)
SELECT dp.id, dp.baby_id, '18:00', '洗澡', '🛁', '听觉先行', '鱼', '说"小鱼游"→等2秒', 3, 'completed'
FROM daily_plans dp WHERE dp.baby_id = 'b0000000-0000-0000-0000-000000000003' AND dp.date = CURRENT_DATE - 1;

INSERT INTO tasks (daily_plan_id, baby_id, time, scene, scene_icon, strategy, target_word, instruction, sort_order, status)
SELECT dp.id, dp.baby_id, '20:00', '睡前', '🌙', '平行说话', '月亮', '说"月亮出来了"', 4, 'completed'
FROM daily_plans dp WHERE dp.baby_id = 'b0000000-0000-0000-0000-000000000003' AND dp.date = CURRENT_DATE - 1;
