// GET /api/recordings/list?date=2026-08-05 — 按日期返回录音列表
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_BABY_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const date = searchParams.get("date") || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const babyId = searchParams.get("baby_id") || DEFAULT_BABY_ID;

    const res = await fetch(
      `${SUPA_URL}/rest/v1/audio_recordings?select=file_url,duration_seconds,created_at&baby_id=eq.${babyId}&created_at=gte.${date}T00:00:00&created_at=lte.${date}T23:59:59&order=created_at.desc`,
      { cache: "no-store", headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } }
    );
    const rowsRaw = await res.json();
    const rows = Array.isArray(rowsRaw) ? rowsRaw : [];

    const recordings = rows.map((r: { file_url: string; duration_seconds: number; created_at: string }) => ({
      fileUrl: r.file_url,
      duration: r.duration_seconds || 0,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ date, recordings });
  } catch (err) {
    console.error("[API] /api/recordings/list 错误:", err);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
