// GET /api/progress/today — 从数据库获取今日进度（按宝宝隔离）
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_BABY_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function supaGet<T>(url: string): Promise<T[]> {
  const res = await fetch(url, { cache: "no-store", headers: {
      apikey: SUPA_KEY,
      Authorization: "Bearer " + SUPA_KEY,
      "Content-Type": "application/json",
    }, });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    // 当前家长绑定的宝宝
    const { searchParams } = new URL(request.url);
    const babyId = searchParams.get("baby_id") || DEFAULT_BABY_ID;

    // 用本地时区日期
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, "0")}-${String(weekAgo.getDate()).padStart(2, "0")}`;

    // 本周该宝宝的日计划
    const plans = await supaGet<{ id: string; date: string }>(
      `${SUPA_URL}/rest/v1/daily_plans?select=id,date&baby_id=eq.${babyId}&date=gte.${weekAgoStr}&date=lte.${today}&order=date.desc`
    );

    if (!plans || plans.length === 0) {
      return NextResponse.json({ total: 0, completed: 0, weekTotal: 0, weekCompleted: 0, streakDays: 0 });
    }

    // 查所有任务
    const planIds = plans.map((p) => p.id);
    let allTasks: { daily_plan_id: string; status: string }[] = [];

    for (const pid of planIds) {
      const tasks = await supaGet<{ daily_plan_id: string; status: string }>(
        `${SUPA_URL}/rest/v1/tasks?select=daily_plan_id,status&daily_plan_id=eq.${pid}`
      );
      allTasks = allTasks.concat(tasks);
    }

    // 今天
    const todayPlan = plans.find((p) => p.date === today);
    const todayTasks = todayPlan
      ? allTasks.filter((t) => t.daily_plan_id === todayPlan.id)
      : [];

    // 连续打卡
    let streakDays = 0;
    for (const plan of plans) {
      const dayTasks = allTasks.filter((t) => t.daily_plan_id === plan.id);
      if (dayTasks.some((t) => t.status === "completed")) streakDays++;
      else break;
    }

    return NextResponse.json({
      total: todayTasks.length,
      completed: todayTasks.filter((t) => t.status === "completed").length,
      weekTotal: allTasks.length,
      weekCompleted: allTasks.filter((t) => t.status === "completed").length,
      streakDays,
    });
  } catch (err) {
    console.error("[API] /api/progress/today 错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
