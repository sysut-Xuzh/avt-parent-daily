// POST /api/tasks/complete — 标记任务完成（更新数据库）
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_BABY_ID } from "@/lib/constants";
export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { taskId, duration = 0 } = await request.json();
    if (!taskId) return NextResponse.json({ error: "缺少 taskId" }, { status: 400 });

    // 1. 更新 tasks 表状态为 completed
    const res = await fetch(`${SUPA_URL}/rest/v1/tasks?id=eq.${taskId}`, { cache: "no-store", method: "PATCH",
      headers: {
        apikey: SUPA_KEY,
        Authorization: "Bearer " + SUPA_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status: "completed",
        completed_at: new Date().toISOString(),
      }), });

    if (!res.ok) {
      const text = await res.text();
      console.error("[API] tasks 更新失败:", res.status, text);
      // 返回真实错误，让前端知道
      return NextResponse.json(
        { error: `数据库更新失败 (${res.status})`, detail: text.slice(0, 200) },
        { status: 500 }
      );
    }

    const updated = await res.json();
    const actuallyUpdated = Array.isArray(updated) && updated.length > 0;

    if (!actuallyUpdated) {
      // task_id 不匹配任何行（可能是 mock data 的 ID "1","2" 而非 UUID）
      console.warn("[API] tasks 更新 0 行，taskId 可能不存在:", taskId);
      return NextResponse.json({
        success: false,
        warning: "任务ID不匹配数据库记录，仅本地更新",
      });
    }

    // 2. 写入 task_logs（失败不影响主流程）
    await fetch(`${SUPA_URL}/rest/v1/task_logs`, { cache: "no-store", method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: "Bearer " + SUPA_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        task_id: taskId,
        baby_id: DEFAULT_BABY_ID,
        action: "complete",
        completed_at: new Date().toISOString(),
        duration_seconds: duration,
      }), }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] /api/tasks/complete 错误:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "更新失败" },
      { status: 500 }
    );
  }
}
