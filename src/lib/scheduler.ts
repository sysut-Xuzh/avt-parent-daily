// JITAI 规则引擎
// 判断「什么时候该推送」「现在能不能推送」

import { JITAI_Config, defaultJITAIConfig } from "@/machines/pushMachine";

export interface TaskSchedule {
  taskId: string;
  time: string; // "07:30"
  scene: string;
  targetWord: string;
  instruction: string;
}

export interface PushDecision {
  shouldPush: boolean;
  reason: string;
  nextCheckAt?: Date;
}

/**
 * 判断是否应该在当前时间推送某个任务
 * @param now — 可选，测试时传入模拟时间
 */
export function evaluatePush(
  task: TaskSchedule,
  config: JITAI_Config = defaultJITAIConfig,
  now?: Date
): PushDecision {
  const currentTime = now || new Date();
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // 解析任务时间
  const [taskHour, taskMinute] = task.time.split(":").map(Number);
  const taskMinutes = taskHour * 60 + taskMinute;

  // 1. 检查是否在不打扰时段
  const sleepStart = config.sleepHours.start * 60; // 21:00 = 1260
  const sleepEnd = config.sleepHours.end * 60;     // 07:00 = 420

  if (config.sleepHours.start > config.sleepHours.end) {
    // 跨天: 21:00 ~ 07:00
    if (currentMinutes >= sleepStart || currentMinutes < sleepEnd) {
      return { shouldPush: false, reason: "夜间免打扰时段" };
    }
  } else {
    if (currentMinutes >= sleepStart && currentMinutes < sleepEnd) {
      return { shouldPush: false, reason: "免打扰时段" };
    }
  }

  // 2. 检查午休时段
  const quietStart = config.quietHours.start * 60;
  const quietEnd = config.quietHours.end * 60;
  if (currentMinutes >= quietStart && currentMinutes < quietEnd) {
    return { shouldPush: false, reason: "午休不打扰时段" };
  }

  // 3. 检查是否在推送时间窗口内（任务前10分钟 ~ 任务后30分钟）
  const advanceMs = config.advanceMinutes * 60 * 1000;
  const expireMs = config.expireAfterMinutes * 60 * 1000;

  const taskDate = new Date(currentTime);
  taskDate.setHours(taskHour, taskMinute, 0, 0);

  const windowStart = taskDate.getTime() - advanceMs;
  const windowEnd = taskDate.getTime() + expireMs;
  const nowMs = currentTime.getTime();

  if (nowMs < windowStart) {
    // 还没到推送时间
    const nextCheck = new Date(windowStart);
    return {
      shouldPush: false,
      reason: "未到推送时间窗口",
      nextCheckAt: nextCheck,
    };
  }

  if (nowMs > windowEnd) {
    return { shouldPush: false, reason: "推送窗口已过期" };
  }

  // 在窗口内，应该推送
  return { shouldPush: true, reason: "在推送窗口内" };
}
