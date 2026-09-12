// GET /api/tasks/today — 从数据库获取今日任务（按宝宝隔离）
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_BABY_ID } from "@/lib/constants";
import {
  getActivityById,
  getActivityAnim,
  STRATEGY_TO_ACTIVITY,
  FALLBACK_ANIM,
  LEGACY_ANIMS,
} from "@/data/training-activities";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 动画文件目录（服务端检查文件是否真实存在）
const ANIM_DIR = path.join(process.cwd(), "public", "animations");

/**
 * 解析动画文件路径：三级回退
 * 1. 新命名文件 {activityId}.mp4（work Buddy 生成的）
 * 2. 旧拼音文件（mingming-dengdai-pingguo.mp4 等）
 * 3. 通用占位动画
 */
function resolveAnimFile(
  activityId: string,
  dbStoredUrl?: string | null
): string {
  const exists = (rel: string) =>
    fs.existsSync(path.join(ANIM_DIR, path.basename(rel)));

  // 0. 数据库已存的有效文件（非占位）优先，保证已保存方案不闪烁
  if (dbStoredUrl && dbStoredUrl !== FALLBACK_ANIM.animFile && exists(dbStoredUrl)) {
    return dbStoredUrl;
  }

  // 1. 新命名文件
  const act = getActivityById(activityId);
  if (act?.animFile && exists(act.animFile)) {
    return act.animFile;
  }

  // 2. 旧拼音文件
  const legacy = LEGACY_ANIMS[activityId];
  if (legacy && exists(legacy)) {
    return legacy;
  }

  // 3. 通用占位
  return FALLBACK_ANIM.animFile;
}

async function supaGet<T>(url: string): Promise<T[]> {
  const res = await fetch(url, {
    // 关键：禁用 Next.js 的 fetch 缓存，确保每次实时查询数据库
    cache: "no-store",
    headers: {
      apikey: SUPA_KEY,
      Authorization: "Bearer " + SUPA_KEY,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    // 当前家长绑定的宝宝：优先用登录系统传入的 baby_id，否则默认小宝
    const { searchParams } = new URL(request.url);
    const babyId = searchParams.get("baby_id") || DEFAULT_BABY_ID;

    // 用本地时区日期，而非 UTC（避免凌晨时段日期偏移）
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // 查今日该宝宝的日计划（只查自己的宝宝，不混入其他宝宝）
    const plans = await supaGet<{ id: string }>(
      `${SUPA_URL}/rest/v1/daily_plans?select=id&baby_id=eq.${babyId}&date=eq.${today}`
    );

    if (!plans || plans.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    // 查该宝宝日计划的任务
    const planIds = plans.map((p) => p.id);
    const filter = planIds.join(",");
    const tasks = await supaGet<Record<string, unknown>>(
      `${SUPA_URL}/rest/v1/tasks?select=*&daily_plan_id=in.(${filter})&order=sort_order.asc`
    );

    // 按 sort_order 去重：优先保留有 animation_url 的记录
    const bySortOrder = new Map<number, Record<string, unknown>>();
    for (const row of tasks) {
      const sortOrder = (row.sort_order as number) || 0;
      const existing = bySortOrder.get(sortOrder);
      if (!existing) {
        bySortOrder.set(sortOrder, row);
      } else {
        // 优先保留有 animation_url 的
        if (row.animation_url && !existing.animation_url) {
          bySortOrder.set(sortOrder, row);
        }
      }
    }

    const result = Array.from(bySortOrder.values())
      .sort((a, b) => ((a.sort_order as number) || 0) - ((b.sort_order as number) || 0))
      .map((row: any) => {
        // 解析活动 ID：优先 activity_type（兼容中文名），再兼容旧的中文策略名
        const rawType = row.activity_type || "";
        const activityId =
          (rawType && getActivityById(rawType) ? rawType : null) ||
          STRATEGY_TO_ACTIVITY[rawType] ||
          STRATEGY_TO_ACTIVITY[row.strategy] ||
          "";
        const act = getActivityById(activityId);
        const anim = getActivityAnim(activityId);

        // 动画 URL：三级回退（新文件 → 旧拼音文件 → 占位），实时检查文件是否存在
        const animationUrl = resolveAnimFile(activityId, row.animation_url);

        const dbSpeech = row.speech_text;
        const speechText =
          dbSpeech && dbSpeech !== FALLBACK_ANIM.speechText ? dbSpeech : anim.speechText;

        return {
          id: row.id,
          time: row.time,
          scene: row.scene,
          sceneIcon: row.scene_icon,
          strategy: act?.name || row.strategy,
          activityType: activityId || undefined,
          activityName: act?.name || undefined,
          targetWord: row.target_word,
          instruction: row.instruction,
          completed: row.status === "completed",
          animationUrl,
          speechText,
          audioUrl: row.audio_url || undefined,
        };
      });

    return NextResponse.json({ tasks: result });
  } catch (err) {
    console.error("[API] /api/tasks/today 错误:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务器错误" },
      { status: 500 }
    );
  }
}
