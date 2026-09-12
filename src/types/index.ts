// ===== UI 展示类型 =====

export interface DailyTask {
  id: string;
  time: string;
  scene: string;
  sceneIcon: string;
  strategy: string;
  activityType?: string;
  activityName?: string;
  targetWord: string;
  instruction: string;
  completed: boolean;
  animationUrl?: string;
  speechText?: string;
  audioUrl?: string;
}

export interface UserProgress {
  streakDays: number;
  todayCompleted: number;
  todayTotal: number;
  weeklyCompleted: number;
  weeklyTotal: number;
}

export type TabId = "tasks" | "hearing" | "learning" | "community" | "profile";

export interface TabItem {
  id: TabId;
  label: string;
  icon: string;
}

// ===== 数据库类型（对应 Supabase 14 张表）=====

/** 用户 */
export interface DBUser {
  id: string;
  role: "parent" | "therapist" | "admin";
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

/** 宝宝信息 */
export interface DBBaby {
  id: string;
  parent_id: string;
  name: string;
  birth_date: string;
  hearing_status?: string;
  device_type?: string;
  device_fitted_date?: string;
  avt_stage?: "detection" | "association" | "imitation" | "comprehension" | "conversation";
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

/** 家庭-治疗师关联 */
export interface DBFamilyTherapist {
  id: string;
  baby_id: string;
  therapist_id: string;
  is_primary: boolean;
  assigned_at: string;
}

/** 用户偏好设置 */
export interface DBSettings {
  id: string;
  user_id: string;
  baby_id?: string;
  quiet_start_hour: number;
  quiet_end_hour: number;
  sleep_start_hour: number;
  sleep_end_hour: number;
  push_enabled: boolean;
  push_ahead_minutes: number;
  max_daily_tasks: number;
  theme: string;
  language: string;
  created_at: string;
  updated_at: string;
}

/** 周计划 */
export interface DBWeeklyPlan {
  id: string;
  baby_id: string;
  therapist_id: string;
  week_start: string;
  week_end: string;
  target_words: string[];
  strategies: string[];
  scenes?: string[];
  notes?: string;
  status: "draft" | "active" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

/** 日计划（AI生成） */
export interface DBDailyPlan {
  id: string;
  weekly_plan_id: string;
  baby_id: string;
  date: string;
  status: "pending" | "active" | "completed" | "cancelled";
  generated_by: "ai" | "therapist" | "parent";
  ai_prompt?: string;
  ai_raw_response?: string;
  accepted?: boolean;
  created_at: string;
  updated_at: string;
}

/** 每日任务 */
export interface DBTask {
  id: string;
  daily_plan_id: string;
  baby_id: string;
  time: string;
  scene: string;
  scene_icon: string;
  strategy: string;
  target_word: string;
  instruction: string;
  sort_order: number;
  status: "pending" | "active" | "completed" | "skipped" | "expired";
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/** 任务执行日志 */
export interface DBTaskLog {
  id: string;
  task_id: string;
  baby_id: string;
  action: "complete" | "skip" | "partial" | "redo";
  completed_at: string;
  duration_seconds?: number;
  had_audio: boolean;
  audio_url?: string;
  notes?: string;
  parent_mood?: "happy" | "neutral" | "frustrated" | "tired";
  child_response?: "interested" | "neutral" | "distracted" | "uncooperative";
}

/** 跳过追踪（自适应推送用） */
export interface DBSkipTracking {
  id: string;
  baby_id: string;
  target_word: string;
  strategy: string;
  scene?: string;
  time_slot?: "morning" | "afternoon" | "evening";
  skip_count: number;
  last_skipped_at: string;
  consecutive_skips: number;
  cooldown_until?: string;
  created_at: string;
  updated_at: string;
}

/** 词汇掌握度 */
export interface DBWordMastery {
  id: string;
  baby_id: string;
  word: string;
  stage: "not_started" | "detection" | "association" | "imitation" | "comprehension" | "production";
  exposure_count: number;
  correct_response_count: number;
  last_practiced_at?: string;
  first_introduced_at: string;
  mastered_at?: string;
  notes?: string;
}

/** 录音记录 */
export interface DBAudioRecording {
  id: string;
  task_id?: string;
  task_log_id?: string;
  baby_id: string;
  file_url: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  transcribed_text?: string;
  pronunciation_score?: number;
  created_at: string;
}

/** 推送设备订阅 */
export interface DBPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  device_info?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** 推送日志 */
export interface DBPushLog {
  id: string;
  subscription_id?: string;
  task_id?: string;
  user_id: string;
  title: string;
  body: string;
  sent_at: string;
  delivered?: boolean;
  viewed_at?: string;
  clicked_at?: string;
  dismissed_at?: string;
  error_message?: string;
}

/** 周报告 */
export interface DBReport {
  id: string;
  baby_id: string;
  week_start: string;
  week_end: string;
  total_tasks: number;
  completed_tasks: number;
  skipped_tasks: number;
  completion_rate: number;
  streak_days: number;
  longest_streak: number;
  words_practiced: string[];
  words_improved: string[];
  summary?: string;
  suggestions?: string;
  therapies_minutes: number;
  generated_at: string;
}

/** AI 交互日志 */
export interface DBAIInteractionLog {
  id: string;
  interaction_type: "task_generation" | "report_generation" | "suggestion" | "analysis";
  baby_id?: string;
  request_data?: Record<string, unknown>;
  response_data?: Record<string, unknown>;
  model_used?: string;
  tokens_input?: number;
  tokens_output?: number;
  duration_ms?: number;
  accepted?: boolean;
  error_message?: string;
  created_at: string;
}
