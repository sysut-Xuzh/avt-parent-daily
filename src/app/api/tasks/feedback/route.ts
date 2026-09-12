// POST /api/tasks/feedback — 保存家长情绪标签和笔记
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_BABY_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { taskId, mood, note } = await request.json();

    if (!taskId) {
      return NextResponse.json({ error: "缺少 taskId" }, { status: 400 });
    }

    // 保存到 task_logs 表（新增一条带情绪/笔记的记录）
    const data: Record<string, unknown> = {
      task_id: taskId,
      baby_id: DEFAULT_BABY_ID,
      action: "partial",
      had_audio: false,
    };
    if (mood) data.parent_mood = mood;
    if (note) data.notes = note;

    const res = await fetch(`${SUPA_URL}/rest/v1/task_logs`, { cache: "no-store", method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: "Bearer " + SUPA_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data), });

    if (!res.ok) {
      const text = await res.text();
      // RLS 或数据格式问题（如非 UUID task_id）时跳过
      if (res.status === 401 || res.status === 403 || res.status === 400) {
        console.warn("[API] feedback 插入跳过:", text);
        return NextResponse.json({ success: false, skipped: true }, { status: 200 });
      }
      throw new Error(`保存失败 (${res.status}): ${text}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] /api/tasks/feedback 错误:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "保存失败" },
      { status: 500 }
    );
  }
}
