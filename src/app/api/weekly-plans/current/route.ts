// GET /api/weekly-plans/current?baby_name=xxx — 获取宝宝今天的实际方案（基于今天日计划任务）
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_BABY_ID } from "@/lib/constants";
import { getActivityById } from "@/data/training-activities";

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
    const babyId = searchParams.get("baby_id");
    const babyName = searchParams.get("baby_name");

    let resolvedBabyId = babyId;
    if (!resolvedBabyId && babyName) {
      const bRes = await fetch(
        `${SUPA_URL}/rest/v1/babies?select=id&name=eq.${encodeURIComponent(babyName)}&limit=1`,
        { cache: "no-store", headers: supaHeaders() }
      );
      const babies = await bRes.json();
      resolvedBabyId = babies?.[0]?.id;
    }

    if (!resolvedBabyId) {
      return NextResponse.json({ error: "缺少宝宝 ID" }, { status: 400 });
    }

    // 今天的日计划
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const dpRes = await fetch(
      `${SUPA_URL}/rest/v1/daily_plans?select=id&baby_id=eq.${resolvedBabyId}&date=eq.${today}&limit=1`,
      { cache: "no-store", headers: supaHeaders() }
    );
    const dpsRaw = await dpRes.json();
    const dps = Array.isArray(dpsRaw) ? dpsRaw : [];

    if (!dps || dps.length === 0) {
      return NextResponse.json({ plan: null });
    }

    // 今天的任务
    const tasksRes = await fetch(
      `${SUPA_URL}/rest/v1/tasks?select=target_word,strategy,scene,activity_type&daily_plan_id=eq.${dps[0].id}&order=sort_order.asc`,
      { cache: "no-store", headers: supaHeaders() }
    );
    const tasksRaw = await tasksRes.json();
    // 防御：Supabase 失败时返回错误对象而不是数组
    const tasks = Array.isArray(tasksRaw) ? tasksRaw : [];

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ plan: null });
    }

    // 组装活动列表
    const activities = tasks.map((t: any) => ({
      activityId: t.activity_type || t.strategy || "sound-detection",
      activityName: getActivityById(t.activity_type)?.name || t.strategy,
      targetWord: t.target_word || "",
      scene: t.scene || "游戏",
    }));

    return NextResponse.json({
      plan: {
        activities,
        dailyCount: tasks.length,
      },
    });
  } catch (err) {
    console.error("[API] /api/weekly-plans/current 错误:", err);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
