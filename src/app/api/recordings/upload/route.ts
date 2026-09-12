// POST /api/recordings/upload — 上传录音文件（本地存储）+ 保存情绪/笔记
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { DEFAULT_BABY_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function authHeaders() {
  return {
    apikey: SUPA_KEY,
    Authorization: "Bearer " + SUPA_KEY,
    "Content-Type": "application/json",
  };
}

// 写入 audio_recordings 表（失败不阻断主流程）
async function insertRecordingRecord(data: {
  task_id: string;
  baby_id: string;
  file_url: string;
  duration_seconds: number;
}) {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/audio_recordings`, { cache: "no-store", method: "POST",
      headers: { ...authHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(data), });
    if (!res.ok) {
      console.warn("[API] audio_recordings 插入跳过:", res.status, await res.text());
      return null;
    }
    return res.json();
  } catch {
    console.warn("[API] audio_recordings 插入失败，跳过");
    return null;
  }
}

// 保存情绪标签和笔记到 task_logs（失败不阻断主流程）
async function insertTaskLog(data: {
  task_id: string;
  baby_id: string;
  action: string;
  duration_seconds: number;
  had_audio: boolean;
  audio_url: string;
  notes?: string;
  parent_mood?: string;
}) {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/task_logs`, { cache: "no-store", method: "POST",
      headers: { ...authHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(data), });
    if (!res.ok) {
      console.warn("[API] task_logs 插入跳过:", res.status, await res.text());
      return null;
    }
    return res.json();
  } catch {
    console.warn("[API] task_logs 插入失败，跳过");
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const taskId = formData.get("taskId") as string;
    const duration = parseInt(formData.get("duration") as string) || 0;
    const mood = (formData.get("mood") as string) || "";
    const note = (formData.get("note") as string) || "";

    if (!audioFile) {
      return NextResponse.json({ error: "缺少音频文件" }, { status: 400 });
    }
    if (!taskId) {
      return NextResponse.json({ error: "缺少 taskId" }, { status: 400 });
    }

    // 保存到 public/recordings/ 目录（本地存储，Next.js 直接服务）
    const ext = audioFile.name.split(".").pop() || "webm";
    const fileName = `${taskId}-${Date.now()}.${ext}`;
    const recordingsDir = path.join(process.cwd(), "public", "recordings");

    // 确保目录存在
    await mkdir(recordingsDir, { recursive: true });

    // 写入文件
    const fileBuffer = await audioFile.arrayBuffer();
    const filePath = path.join(recordingsDir, fileName);
    await writeFile(filePath, Buffer.from(fileBuffer));

    // 返回可访问的 URL
    const fileUrl = `/recordings/${fileName}`;

    // 尝试写入数据库记录（失败不影响录音主流程）
    const babyId = DEFAULT_BABY_ID;
    await insertRecordingRecord({
      task_id: taskId,
      baby_id: babyId,
      file_url: fileUrl,
      duration_seconds: duration,
    });

    await insertTaskLog({
      task_id: taskId,
      baby_id: babyId,
      action: "complete",
      duration_seconds: duration,
      had_audio: true,
      audio_url: fileUrl,
      notes: note || undefined,
      parent_mood: mood || undefined,
    });

    return NextResponse.json({
      success: true,
      fileUrl,
      duration,
      fileName,
      feedbackSaved: !!mood || !!note,
    });
  } catch (err) {
    console.error("[API] /api/recordings/upload 错误:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "上传失败" },
      { status: 500 }
    );
  }
}
