// GET /api/push/check — 定时调度器
// 检查当前有哪些任务需要推送，发送通知
// 可被 Vercel Cron 或外部定时服务调用

import { NextResponse } from "next/server";
import { evaluatePush } from "@/lib/scheduler";
import { defaultJITAIConfig } from "@/machines/pushMachine";
import { buildTaskPushPayload, sendPushNotification } from "@/lib/push";

export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function supaGet<T>(url: string): Promise<T[]> {
  const res = await fetch(url, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    const now = new Date();
    // 用本地时区日期，而非 UTC
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const results: { taskId: string; pushed: boolean; reason: string }[] = [];

    // 获取今天的所有日计划（不用 limit=1）
    const plans = await supaGet<{ id: string }>(
      `${SUPA_URL}/rest/v1/daily_plans?select=id&date=eq.${today}`
    );
    if (!plans || plans.length === 0) {
      return NextResponse.json({ checked: true, results: [], message: "今天没有计划" });
    }

    // 获取所有日计划的待办任务
    const planIds = plans.map((p) => p.id);
    const filter = planIds.map((id) => `"${id}"`).join(",");
    const tasks = await supaGet<{ id: string; time: string; scene: string; scene_icon: string; strategy: string; target_word: string; instruction: string; status: string }>(
      `${SUPA_URL}/rest/v1/tasks?select=*&daily_plan_id=in.(${filter})&status=eq.pending&order=sort_order.asc`
    );

    // 获取所有活跃的推送订阅
    const subs = await supaGet<{ endpoint: string; p256dh_key: string; auth_key: string }>(
      `${SUPA_URL}/rest/v1/push_subscriptions?select=endpoint,p256dh_key,auth_key&active=eq.true`
    );

    if (!subs || subs.length === 0) {
      return NextResponse.json({
        checked: true,
        results: [],
        message: "没有推送订阅，请先在前端设置页允许推送权限",
        pendingTasks: tasks.length,
      });
    }

    for (const task of tasks) {
      const decision = evaluatePush(
        { taskId: task.id, time: task.time, scene: task.scene, targetWord: task.target_word, instruction: task.instruction },
        defaultJITAIConfig,
        now
      );

      if (decision.shouldPush) {
        let pushSuccess = false;
        for (const sub of subs) {
          const payload = buildTaskPushPayload({
            time: task.time,
            scene: task.scene,
            sceneIcon: task.scene_icon,
            strategy: task.strategy,
            targetWord: task.target_word,
            instruction: task.instruction,
          });
          const result = await sendPushNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
            payload
          );
          if (result.success) pushSuccess = true;
        }

        results.push({ taskId: task.id, pushed: pushSuccess, reason: pushSuccess ? "已推送" : "推送失败" });
      } else {
        results.push({ taskId: task.id, pushed: false, reason: decision.reason || "未到推送时间" });
      }
    }

    return NextResponse.json({ checked: true, time: now.toISOString(), results, subscriptionCount: subs.length });
  } catch (err) {
    console.error("[Scheduler] 检查失败:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "调度失败" }, { status: 500 });
  }
}
