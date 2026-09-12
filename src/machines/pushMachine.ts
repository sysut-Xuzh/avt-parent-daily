// 推送生命周期状态机 (XState v5)
// 管理每个任务推送的完整生命周期: 待推送 → 已推送 → 已查看 → 已完成

import { createMachine } from "xstate";

/**
 * 推送生命周期状态：
 * - idle: 等待推送（还没到时间）
 * - pushed: 已推送到手机，等待家长查看
 * - viewed: 家长已点开通知
 * - completed: 家长标记了任务完成
 * - skipped: 家长跳过了这个任务
 * - expired: 推送时间窗口已过
 */
export const pushMachine = createMachine({
  id: "push",
  initial: "idle",
  states: {
    idle: {
      on: {
        PUSH: "pushed",
        SKIP: "skipped",
        EXPIRE: "expired",
      },
    },
    pushed: {
      on: {
        VIEW: "viewed",
        SKIP: "skipped",
        EXPIRE: "expired",
      },
    },
    viewed: {
      on: {
        COMPLETE: "completed",
        SKIP: "skipped",
        EXPIRE: "expired",
      },
    },
    completed: { type: "final" },
    skipped: { type: "final" },
    expired: { type: "final" },
  },
});

// ===== JITAI 规则配置 =====

export interface JITAI_Config {
  /** 任务提前推送的分钟数 */
  advanceMinutes: number;
  /** 推送后多久没查看算过期 */
  expireAfterMinutes: number;
  /** 不打扰时段 */
  quietHours: { start: number; end: number };
  /** 夜间免打扰时段 */
  sleepHours: { start: number; end: number };
  /** 连续跳过 N 次后降低推送频率 */
  maxSkipsBeforeCooldown: number;
  /** 冷却期（分钟） */
  cooldownMinutes: number;
}

export const defaultJITAIConfig: JITAI_Config = {
  advanceMinutes: 10,       // 任务前10分钟推送
  expireAfterMinutes: 30,   // 推送后30分钟不查看就过期
  quietHours: { start: 12, end: 14 },    // 12:00-14:00 午休
  sleepHours: { start: 21, end: 7 },     // 21:00-07:00 夜间
  maxSkipsBeforeCooldown: 2,  // 连续跳过2次后冷却
  cooldownMinutes: 60,        // 冷却60分钟
};
