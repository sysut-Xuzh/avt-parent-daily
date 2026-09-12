// GET /api/calendar?month=2026-08 — 按月返回每日记录汇总（按宝宝隔离）
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_BABY_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function supaHeaders() {
  return {
    apikey: SUPA_KEY,
    Authorization: "Bearer " + SUPA_KEY,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = searchParams.get("month") || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const babyId = searchParams.get("baby_id") || DEFAULT_BABY_ID;

    // 计算当月起止日期
    const [year, mon] = month.split("-").map(Number);
    const startDate = `${year}-${String(mon).padStart(2, "0")}-01`;
    const lastDay = new Date(year, mon, 0).getDate();
    const endDate = `${year}-${String(mon).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // 1. 当月该宝宝的日计划
    const plansRes = await fetch(
      `${SUPA_URL}/rest/v1/daily_plans?select=id,date&baby_id=eq.${babyId}&date=gte.${startDate}&date=lte.${endDate}`,
      { cache: "no-store", headers: supaHeaders() }
    );
    const plansRaw = await plansRes.json();
    const plans = Array.isArray(plansRaw) ? plansRaw : [];
    const planList: { id: string; date: string }[] = plans || [];

    // 2. 每个日计划的任务完成情况
    const dayMap: Record<string, { total: number; completed: number; skipped: number }> = {};
    for (const plan of planList) {
      const tasksRes = await fetch(
        `${SUPA_URL}/rest/v1/tasks?select=status&daily_plan_id=eq.${plan.id}`,
        { cache: "no-store", headers: supaHeaders() }
      );
      const tasksRaw = await tasksRes.json();
      const tasks = Array.isArray(tasksRaw) ? tasksRaw : [];
      const total = tasks.length;
      const completed = tasks.filter((t: { status: string }) => t.status === "completed").length;
      const skipped = tasks.filter((t: { status: string }) => t.status === "skipped").length;
      if (!dayMap[plan.date]) dayMap[plan.date] = { total: 0, completed: 0, skipped: 0 };
      dayMap[plan.date].total += total;
      dayMap[plan.date].completed += completed;
      dayMap[plan.date].skipped += skipped;
    }

    // 3. 有录音的日期
    const audioRes = await fetch(
      `${SUPA_URL}/rest/v1/audio_recordings?select=created_at&baby_id=eq.${babyId}&created_at=gte.${startDate}T00:00:00&created_at=lte.${endDate}T23:59:59`,
      { cache: "no-store", headers: supaHeaders() }
    );
    const audioRaw = await audioRes.json();
    const audioRecords = Array.isArray(audioRaw) ? audioRaw : [];
    const audioDates = new Set(
      audioRecords.map((a: { created_at: string }) => (a.created_at || "").slice(0, 10))
    );

    // 4. 有情绪/笔记的日期
    const logsRes = await fetch(
      `${SUPA_URL}/rest/v1/task_logs?select=completed_at,parent_mood,notes&baby_id=eq.${babyId}`,
      { cache: "no-store", headers: supaHeaders() }
    );
    const logsRaw = await logsRes.json();
    const logs = Array.isArray(logsRaw) ? logsRaw : [];
    const feedbackDates = new Set(
      logs
        .filter((l: { parent_mood?: string; notes?: string }) => l.parent_mood || l.notes)
        .map((l: { completed_at: string }) => (l.completed_at || "").slice(0, 10))
    );

    // 5. 组装当月每天的数据
    const days: { date: string; total: number; completed: number; skipped: number; hasAudio: boolean; hasFeedback: boolean }[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const date = `${year}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayData = dayMap[date] || { total: 0, completed: 0, skipped: 0 };
      days.push({
        date,
        ...dayData,
        hasAudio: audioDates.has(date),
        hasFeedback: feedbackDates.has(date),
      });
    }

    return NextResponse.json({ month, days });
  } catch (err) {
    console.error("[API] /api/calendar 错误:", err);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
