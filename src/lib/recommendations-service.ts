/**
 * 治疗师推荐学习内容 · 数据层（方案 § P3 / 阶段一·步骤4）
 * - 治疗师写入推荐（content_id + 推荐语），归属到具体孩子（baby_id），消灭全局广播。
 * - 家长端读取同步的推荐列表，仅看"自己孩子"的推荐（RLS + baby_id 过滤）。
 * - 开发期 anon 可读可写；云端不可用则静默降级（返回空/忽略）。
 */
import { getSupabaseBrowser } from "@/lib/supabase";
import { getStoredBabyId } from "@/lib/baby-store";

export interface RecommendationInput {
  contentId: string;
  contentTitle: string;
  contentSummary?: string;
  note?: string;
  therapistName?: string;
  /** 目标孩子（可选；缺省自动从当前选中孩子全局状态读取） */
  babyId?: string | null;
}

export interface RecommendationRow {
  id: string;
  baby_id: string | null;
  content_id: string;
  content_title: string;
  content_summary: string | null;
  note: string | null;
  therapist_name: string;
  status: string;
  created_at: string;
}

async function getUserId(): Promise<string | null> {
  try {
    const sb = getSupabaseBrowser();
    const { data } = await sb.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** 治疗师：推荐一条学习内容（定向到具体孩子） */
export async function saveRecommendation(input: RecommendationInput): Promise<boolean> {
  try {
    const sb = getSupabaseBrowser();
    const userId = await getUserId();
    const babyId = input.babyId ?? getStoredBabyId();
    await sb.from("therapist_recommendations").insert({
      therapist_id: userId,
      user_id: null,
      baby_id: babyId,
      content_id: input.contentId,
      content_title: input.contentTitle,
      content_summary: input.contentSummary ?? null,
      note: input.note ?? null,
      therapist_name: input.therapistName ?? "治疗师",
    });
    return true;
  } catch {
    return false;
  }
}

/** 家长端：读取同步到的推荐列表（按当前孩子过滤；开发期无 baby_id 时回退全量） */
export async function getRecommendationsForParent(
  babyId?: string | null
): Promise<RecommendationRow[]> {
  try {
    const sb = getSupabaseBrowser();
    let q = sb
      .from("therapist_recommendations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (babyId) q = q.eq("baby_id", babyId);
    const { data, error } = await q;
    if (error) return [];
    return (data as Record<string, unknown>[]) as unknown as RecommendationRow[];
  } catch {
    return [];
  }
}

/** 治疗师端：读取已发出的推荐（按当前治疗师过滤，用于去重 / 已推荐态） */
export async function getRecommendationsForTherapist(): Promise<RecommendationRow[]> {
  try {
    const sb = getSupabaseBrowser();
    const userId = await getUserId();
    let q = sb
      .from("therapist_recommendations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (userId) q = q.eq("therapist_id", userId);
    const { data } = await q;
    return (data as Record<string, unknown>[]) as unknown as RecommendationRow[];
  } catch {
    return [];
  }
}
