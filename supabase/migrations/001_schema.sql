-- =============================================================
-- AVT 康复训练平台 — 完整数据库 Schema
-- 共 14 张表，覆盖完整数据闭环
-- =============================================================

-- 0. 扩展：UUID 生成
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- 第一部分：核心用户体系
-- =============================================================

-- 1.1 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('parent', 'therapist', 'admin')),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 宝宝信息表（一个家长可能有多个宝宝）
CREATE TABLE babies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  hearing_status TEXT, -- 听力情况描述
  device_type TEXT, -- 助听器/人工耳蜗型号
  device_fitted_date DATE, -- 适配日期
  avt_stage TEXT CHECK (avt_stage IN ('detection', 'association', 'imitation', 'comprehension', 'conversation')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_babies_parent ON babies(parent_id);

-- 1.3 家庭-治疗师关联表（多对多）
CREATE TABLE family_therapists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- 是否为主要负责人
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(baby_id, therapist_id)
);

CREATE INDEX idx_ft_therapist ON family_therapists(therapist_id);
CREATE INDEX idx_ft_baby ON family_therapists(baby_id);

-- 1.4 用户偏好设置
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  baby_id UUID REFERENCES babies(id) ON DELETE CASCADE,
  quiet_start_hour INT DEFAULT 12,   -- 午休开始 12:00
  quiet_end_hour INT DEFAULT 14,     -- 午休结束 14:00
  sleep_start_hour INT DEFAULT 21,   -- 夜间开始 21:00
  sleep_end_hour INT DEFAULT 7,      -- 夜间结束 07:00
  push_enabled BOOLEAN DEFAULT true,
  push_ahead_minutes INT DEFAULT 10, -- 提前多少分钟推送
  max_daily_tasks INT DEFAULT 6,     -- 每日最多任务数
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'zh-CN',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, baby_id)
);

-- =============================================================
-- 第二部分：计划体系（治疗师→AI→家长）
-- =============================================================

-- 2.1 周计划（治疗师输入）
CREATE TABLE weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  target_words TEXT[] NOT NULL DEFAULT '{}',    -- 本周目标词列表
  strategies TEXT[] NOT NULL DEFAULT '{}',      -- 本周策略列表
  scenes TEXT[] DEFAULT '{}',                   -- 推荐场景
  notes TEXT,                                   -- 治疗师备注
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_week CHECK (week_end >= week_start)
);

CREATE INDEX idx_weekly_plans_baby ON weekly_plans(baby_id, week_start);

-- 2.2 日计划（AI 从周计划拆解生成）
CREATE TABLE daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_plan_id UUID NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  generated_by TEXT DEFAULT 'ai' CHECK (generated_by IN ('ai', 'therapist', 'parent')),
  ai_prompt TEXT,          -- 调用AI时的prompt（用于调试）
  ai_raw_response TEXT,    -- AI原始返回（用于调试）
  accepted BOOLEAN,        -- 家长/治疗师是否接受了AI生成的计划
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(baby_id, date)
);

CREATE INDEX idx_daily_plans_weekly ON daily_plans(weekly_plan_id);
CREATE INDEX idx_daily_plans_date ON daily_plans(baby_id, date);

-- 2.3 每日任务
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_plan_id UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  time TEXT NOT NULL,              -- "07:30"
  scene TEXT NOT NULL,             -- "早餐"
  scene_icon TEXT NOT NULL,        -- "🍳"
  strategy TEXT NOT NULL,          -- "命名等待"
  target_word TEXT NOT NULL,       -- "苹果"
  instruction TEXT NOT NULL,       -- 话术引导
  sort_order INT DEFAULT 0,        -- 排序
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'skipped', 'expired')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_plan ON tasks(daily_plan_id);
CREATE INDEX idx_tasks_baby_date ON tasks(baby_id, daily_plan_id);
CREATE INDEX idx_tasks_status ON tasks(status) WHERE status = 'pending';

-- =============================================================
-- 第三部分：执行与反馈体系
-- =============================================================

-- 3.1 任务执行日志
CREATE TABLE task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('complete', 'skip', 'partial', 'redo')),
  completed_at TIMESTAMPTZ DEFAULT now(),
  duration_seconds INT,            -- 耗时
  had_audio BOOLEAN DEFAULT false, -- 是否录音
  audio_url TEXT,                  -- 录音文件地址
  notes TEXT,                      -- 家长备注
  parent_mood TEXT CHECK (parent_mood IN ('happy', 'neutral', 'frustrated', 'tired')),
  child_response TEXT CHECK (child_response IN ('interested', 'neutral', 'distracted', 'uncooperative'))
);

CREATE INDEX idx_task_logs_task ON task_logs(task_id);
CREATE INDEX idx_task_logs_baby_time ON task_logs(baby_id, completed_at);

-- 3.2 跳过追踪（用于自适应调整推送频率）
CREATE TABLE skip_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  target_word TEXT NOT NULL,        -- 被跳过的目标词
  strategy TEXT NOT NULL,           -- 被跳过的策略
  scene TEXT,                       -- 被跳过的场景
  time_slot TEXT,                   -- 被跳过的时间段 "morning/afternoon/evening"
  skip_count INT DEFAULT 1,         -- 累计跳过次数
  last_skipped_at TIMESTAMPTZ DEFAULT now(),
  consecutive_skips INT DEFAULT 1,  -- 连续跳过次数
  cooldown_until TIMESTAMPTZ,       -- 冷却期结束时间
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(baby_id, target_word, strategy, time_slot)
);

CREATE INDEX idx_skip_tracking_baby ON skip_tracking(baby_id);

-- 3.3 词汇掌握度追踪（对应AVT五阶段）
CREATE TABLE word_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'not_started' CHECK (stage IN (
    'not_started',      -- 未开始
    'detection',        -- 阶段一：能觉察到声音
    'association',      -- 阶段二：能关联声音和意义
    'imitation',        -- 阶段三：能模仿发音
    'comprehension',    -- 阶段四：能理解含义
    'production'        -- 阶段五：能主动说出
  )),
  exposure_count INT DEFAULT 0,         -- 接触次数
  correct_response_count INT DEFAULT 0, -- 正确回应次数
  last_practiced_at TIMESTAMPTZ,
  first_introduced_at TIMESTAMPTZ DEFAULT now(),
  mastered_at TIMESTAMPTZ,              -- 达到生产阶段的时间
  notes TEXT,
  UNIQUE(baby_id, word)
);

CREATE INDEX idx_word_mastery_baby ON word_mastery(baby_id);

-- 3.4 录音记录
CREATE TABLE audio_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  task_log_id UUID REFERENCES task_logs(id) ON DELETE SET NULL,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  duration_seconds INT,
  file_size_bytes BIGINT,
  transcribed_text TEXT,            -- ASR转写结果
  pronunciation_score DECIMAL(5,2), -- 发音评分（未来）
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audio_baby ON audio_recordings(baby_id);

-- =============================================================
-- 第四部分：推送体系
-- =============================================================

-- 4.1 推送设备订阅
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_info TEXT,       -- 浏览器/设备信息
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(endpoint)
);

CREATE INDEX idx_push_user ON push_subscriptions(user_id);

-- 4.2 推送日志
CREATE TABLE push_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered BOOLEAN,                -- 是否送达
  viewed_at TIMESTAMPTZ,            -- 用户何时查看
  clicked_at TIMESTAMPTZ,           -- 用户何时点击
  dismissed_at TIMESTAMPTZ,         -- 用户何时忽略
  error_message TEXT                -- 发送失败原因
);

CREATE INDEX idx_push_logs_user ON push_logs(user_id, sent_at);
CREATE INDEX idx_push_logs_task ON push_logs(task_id);

-- =============================================================
-- 第五部分：报告与AI日志
-- =============================================================

-- 5.1 周报告
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_tasks INT DEFAULT 0,
  completed_tasks INT DEFAULT 0,
  skipped_tasks INT DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  streak_days INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  words_practiced TEXT[] DEFAULT '{}',
  words_improved TEXT[] DEFAULT '{}',
  summary TEXT,                    -- AI生成的文字总结
  suggestions TEXT,                -- AI生成的建议
  therapies_minutes INT DEFAULT 0, -- 本周训练总时长（估算）
  generated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reports_baby ON reports(baby_id, week_start);

-- 5.2 AI 交互日志
CREATE TABLE ai_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'task_generation',    -- 任务生成
    'report_generation',  -- 报告生成
    'suggestion',         -- 建议
    'analysis'            -- 数据分析
  )),
  baby_id UUID REFERENCES babies(id) ON DELETE SET NULL,
  request_data JSONB,               -- 发送给AI的请求
  response_data JSONB,              -- AI返回的原始响应
  model_used TEXT,                  -- 使用的模型名
  tokens_input INT,                 -- 输入token数
  tokens_output INT,                -- 输出token数
  duration_ms INT,                  -- 响应耗时
  accepted BOOLEAN,                 -- 用户是否接受
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_logs_type ON ai_interaction_logs(interaction_type, created_at);
CREATE INDEX idx_ai_logs_baby ON ai_interaction_logs(baby_id);
