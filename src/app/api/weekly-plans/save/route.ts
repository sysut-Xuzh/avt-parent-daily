// POST /api/weekly-plans/save — 保存周计划并生成每日任务
// 按「训练活动类型」组织任务：每个活动类型一个代表动画，目标词只是标注内容
import { NextRequest, NextResponse } from "next/server";
import { getActivityById, getActivityAnim, STRATEGY_TO_ACTIVITY } from "@/data/training-activities";
import { DEFAULT_THERAPIST_ID, DEFAULT_BABY_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const sceneIcons: Record<string, string> = {
  "早餐": "🍳", "游戏": "🎮", "洗澡": "🛁", "睡前": "🌙", "阅读": "📚", "外出": "🚶",
};

function supaHeaders(json = false) {
  const h: Record<string, string> = {
    apikey: SUPA_KEY,
    Authorization: "Bearer " + SUPA_KEY,
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function supaPost(table: string, data: Record<string, unknown>) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
    cache: "no-store",
    method: "POST",
    headers: { ...supaHeaders(true), Prefer: "return=representation" },
    body: JSON.stringify(data),
  });
  if (!res.ok && res.status !== 400 && res.status !== 401 && res.status !== 403) {
    const text = await res.text();
    throw new Error(`写入 ${table} 失败 (${res.status}): ${text}`);
  }
  return res.ok ? res.json() : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 新的请求结构：activities = [{ activityId, targetWord, scene }]
    // 兼容旧的：targetWords + strategies
    const { babyName, activities, targetWords, strategies, scenes, dailyCount } = body;

    if (!babyName) {
      return NextResponse.json({ error: "缺少宝宝名称" }, { status: 400 });
    }

    // 直接用常量 DEFAULT_BABY_ID（演示期单宝宝；避免依赖 babies 表的匿名读取策略）
    const babyId = DEFAULT_BABY_ID;

    // 查治疗师 UUID（找不到时兜底到默认治疗师 ID）
    const therapistRes = await fetch(
      `${SUPA_URL}/rest/v1/users?select=id&role=eq.therapist&limit=1`,
      { cache: "no-store", headers: supaHeaders() }
    );
    const therapists = await therapistRes.json();
    // 找不到治疗师时兜底到默认治疗师 ID（种子数据应已存在；此处避免硬 404）
    const therapistId = therapists?.[0]?.id || DEFAULT_THERAPIST_ID;

    // 用本地时区日期（与家长端一致，避免 UTC 偏移）
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const weekStart = today;
    const weekEndDate = new Date(now.getTime() + 6 * 86400000);
    const weekEnd = `${weekEndDate.getFullYear()}-${String(weekEndDate.getMonth() + 1).padStart(2, "0")}-${String(weekEndDate.getDate()).padStart(2, "0")}`;

    // 1. 查今天日计划
    const planRes = await fetch(
      `${SUPA_URL}/rest/v1/daily_plans?select=id&baby_id=eq.${babyId}&date=eq.${today}&limit=1`,
      { cache: "no-store", headers: supaHeaders() }
    );
    const existingPlans = await planRes.json();
    let dailyPlanId = existingPlans?.[0]?.id;

    if (!dailyPlanId) {
      const wpRes = await supaPost("weekly_plans", {
        baby_id: babyId,
        therapist_id: therapistId,
        week_start: weekStart,
        week_end: weekEnd,
        target_words: (activities || []).map((a: any) => a.targetWord),
        strategies: strategies || [],
        scenes: scenes || [],
        status: "active",
      });
      const weeklyPlanId = Array.isArray(wpRes) ? wpRes[0]?.id : wpRes?.id;

      const dpRes = await supaPost("daily_plans", {
        weekly_plan_id: weeklyPlanId,
        baby_id: babyId,
        date: today,
        status: "active",
        generated_by: "therapist",
        accepted: true,
      });
      dailyPlanId = Array.isArray(dpRes) ? dpRes[0]?.id : dpRes?.id;
    }

    if (!dailyPlanId) {
      return NextResponse.json({ error: "创建日计划失败" }, { status: 500 });
    }

    // 2. 查已有任务（按活动类型匹配）
    const existingRes = await fetch(
      `${SUPA_URL}/rest/v1/tasks?select=id,activity_type,target_word,status&daily_plan_id=eq.${dailyPlanId}`,
      { cache: "no-store", headers: supaHeaders() }
    );
    const existingRaw = await existingRes.json();
    // 防御：Supabase 失败时返回错误对象而不是数组
    const existingTasks = Array.isArray(existingRaw) ? existingRaw : [];
    const existingByActivity = new Map<string, any>(
      existingTasks.map((t: any) => {
        // 归一化 key：中文策略名 → 活动 ID，便于与新方案匹配
        const raw = t.activity_type;
        const key =
          (raw && getActivityById(raw) ? raw : null) ||
          STRATEGY_TO_ACTIVITY[raw] ||
          raw ||
          `word:${t.target_word}`;
        return [key, t];
      })
    );

    // 3. 组装新任务（按活动类型）
    let tasks: Record<string, unknown>[] = [];

    if (activities && activities.length > 0) {
      // 新格式：每个 activity 指定活动类型 + 目标词 + 场景
      const times = ["07:30", "10:00", "15:00", "18:00", "20:00"];
      tasks = activities.slice(0, 8).map((a: any, i: number) => {
        // 解析活动 ID：兼容直接传活动 ID 或中文策略名
        const rawId = a.activityId || "";
        const activityId =
          (rawId && getActivityById(rawId) ? rawId : null) ||
          STRATEGY_TO_ACTIVITY[rawId] ||
          rawId;
        const act = getActivityById(activityId);
        const anim = getActivityAnim(activityId);
        const scene = a.scene || scenes?.[i % (scenes?.length || 1)] || "游戏";
        return {
          daily_plan_id: dailyPlanId,
          baby_id: babyId,
          time: times[i % times.length],
          scene,
          scene_icon: sceneIcons[scene] || "📋",
          strategy: act?.name || a.activityId || "训练活动",
          target_word: a.targetWord || "",
          instruction: `${act?.name || "训练"}：围绕「${a.targetWord || ""}」进行练习`,
          sort_order: i + 1,
          status: "pending",
          activity_type: activityId,
          animation_url: anim.animFile,
          speech_text: anim.speechText,
          audio_url: null,
        };
      });
    } else {
      // 兼容旧格式（targetWords + strategies）
      const words = targetWords.split(/[、，,]/).map((w: string) => w.trim()).filter(Boolean);
      const times = ["07:30", "10:00", "15:00", "18:00", "20:00"];
      tasks = words.slice(0, 8).map((word: string, i: number) => {
        const strategy = strategies?.[i % (strategies?.length || 1)] || "训练活动";
        const scene = scenes?.[i % (scenes?.length || 1)] || "游戏";
        return {
          daily_plan_id: dailyPlanId,
          baby_id: babyId,
          time: times[i % times.length],
          scene,
          scene_icon: sceneIcons[scene] || "📋",
          strategy,
          target_word: word,
          instruction: `${strategy}：练习「${word}」`,
          sort_order: i + 1,
          status: "pending",
          activity_type: null,
          animation_url: null,
          speech_text: null,
          audio_url: null,
        };
      });
    }

    // 4. 逐条插入/更新（保留已完成）
    let inserted = 0;
    for (const task of tasks) {
      const key = task.activity_type ? String(task.activity_type) : `word:${task.target_word}`;
      const existing = existingByActivity.get(key);
      if (existing && existing.status === "completed") {
        continue; // 已完成保留
      }
      if (existing) {
        await fetch(`${SUPA_URL}/rest/v1/tasks?id=eq.${existing.id}`, {
          cache: "no-store",
          method: "PATCH",
          headers: { ...supaHeaders(true) },
          body: JSON.stringify({ time: task.time, scene: task.scene, scene_icon: task.scene_icon, instruction: task.instruction, sort_order: task.sort_order, target_word: task.target_word, animation_url: task.animation_url, speech_text: task.speech_text, activity_type: task.activity_type }),
        });
        inserted++;
      } else {
        const result = await supaPost("tasks", task);
        if (result) inserted++;
      }
    }

    // 5. 删除不在新方案里的旧任务
    const newKeys = new Set(tasks.map((t) => (t.activity_type ? String(t.activity_type) : `word:${t.target_word}`)));
    for (const existing of existingTasks) {
      // 归一化旧任务的 key（中文策略名 → 活动 ID）
      const raw = existing.activity_type;
      const ek =
        (raw && getActivityById(raw) ? raw : null) ||
        STRATEGY_TO_ACTIVITY[raw] ||
        raw ||
        `word:${existing.target_word}`;
      if (!newKeys.has(ek)) {
        await fetch(`${SUPA_URL}/rest/v1/tasks?id=eq.${existing.id}`, {
          cache: "no-store",
          method: "DELETE",
          headers: { ...supaHeaders() },
        });
      }
    }

    return NextResponse.json({
      success: true,
      dailyPlanId,
      tasksGenerated: inserted,
    });
  } catch (err) {
    console.error("[API] /api/weekly-plans/save 错误:", err);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
