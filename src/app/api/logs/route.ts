// GET /api/logs — 执行日志查询（按宝宝隔离）
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
    const babyId = searchParams.get("baby_id") || DEFAULT_BABY_ID;
    const now = new Date();
    const date = searchParams.get("date") || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // 查找今日该宝宝的日计划
    const plansRes = await fetch(
      `${SUPA_URL}/rest/v1/daily_plans?select=id,date&baby_id=eq.${babyId}&date=eq.${date}`,
      { cache: "no-store", headers: supaHeaders() }
    );
    const plans = await plansRes.json();

    if (!plans || plans.length === 0) {
      return NextResponse.json({ date, tasks: [], logs: [] });
    }

    // 查该宝宝日计划的任务
    const planIds = plans.map((p: { id: string }) => p.id);
    const filter = planIds.join(",");
    const tasksRes = await fetch(
      `${SUPA_URL}/rest/v1/tasks?select=id,time,scene,scene_icon,strategy,target_word,instruction,status,sort_order&daily_plan_id=in.(${filter})&order=sort_order.asc`,
      { cache: "no-store", headers: supaHeaders() }
    );
    const tasks = await tasksRes.json();

    // 获取执行日志
    const taskIds = (tasks || []).map((t: { id: string }) => t.id);
    let logs: { id: string; task_id: string; action: string; completed_at: string; duration_seconds: number; parent_mood: string; child_response: string; notes: string }[] = [];

    if (taskIds.length > 0) {
      for (const taskId of taskIds) {
        const logRes = await fetch(
          `${SUPA_URL}/rest/v1/task_logs?select=*&task_id=eq.${taskId}&order=completed_at.desc&limit=5`,
          { cache: "no-store", headers: supaHeaders() }
        );
        const taskLogs = await logRes.json();
        if (taskLogs && taskLogs.length > 0) {
          logs = logs.concat(taskLogs);
        }
      }
    }

    // 统计数据
    const total = (tasks || []).length;
    const completed = (tasks || []).filter((t: { status: string }) => t.status === "completed").length;
    const skipped = (tasks || []).filter((t: { status: string }) => t.status === "skipped").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return NextResponse.json({
      date,
      total,
      completed,
      skipped,
      completionRate,
      tasks: tasks || [],
      logs,
    });
  } catch (err) {
    console.error("[API] /api/logs 错误:", err);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
