/**
 * 声线评级数据层（方案 §7 / 隐私边界）
 * - 仅上传脱敏结构化指标（星级/分数/时长/频段），绝不传音频/声纹特征。
 * - 阶段一改造：写入带 baby_id（归属孩子）+ parent_id（归属家长），读取按 baby_id 过滤，
 *   配合 019/020 收紧的 RLS 实现"数据归属到孩子"。灰度期 baby_id 允许为空（由应用层回填）。
 * - 无登录时静默跳过云端，不报错。
 */
import { getSupabaseBrowser } from "@/lib/supabase";
import type { VoiceAnalysis } from "@/lib/voice-analysis";
import { getVoiceBaselineHz } from "@/lib/recording-store";
import { getStoredBabyId } from "@/lib/baby-store";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface TaskRatingInput {
  taskId: string;
  analysis: VoiceAnalysis;
  adultVoiceDurationMs?: number;
  responseDelayMs?: number | null;
  /** 归属孩子（可选；缺省自动从当前选中孩子全局状态读取） */
  babyId?: string | null;
}

export interface PracticeWordResult {
  word: string;
  star_rating: number;
  score: number;
}

export interface PracticeRatingInput {
  contentId?: string | null;
  source?: "task_page" | "learning_page" | string;
  words: string[];
  wordResults: PracticeWordResult[];
  overallStarRating: number;
  overallScore: number;
  /** 归属孩子（可选；缺省自动从当前选中孩子全局状态读取） */
  babyId?: string | null;
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

/** 保存一次任务录音评级（云端；失败静默） */
export async function saveTaskRating(input: TaskRatingInput): Promise<void> {
  const a = input.analysis;
  try {
    const sb = getSupabaseBrowser();
    const userId = await getUserId();
    const babyId = input.babyId ?? getStoredBabyId();
    await sb.from("task_voice_ratings").insert({
      user_id: userId,
      baby_id: babyId,
      parent_id: userId,
      task_id: input.taskId,
      date: todayStr(),
      star_rating: a.starRating,
      voice_score: a.voiceScore,
      child_voice_duration_ms: Math.round((a.effectiveDuration || 0) * 1000),
      adult_voice_duration_ms: Math.round((a.duration - a.effectiveDuration || 0) * 1000),
      response_delay_ms: a.followLatency != null ? Math.round(a.followLatency * 1000) : null,
      child_voice_baseline_hz: a.f0ChildMean > 0 ? Math.round(a.f0ChildMean) : getVoiceBaselineHz(),
    });
  } catch {
    /* 云端不可用（未登录/网络）→ 仅本地 IndexedDB 已存，忽略 */
  }
}

/** 保存一次语音练习评级（云端；失败静默） */
export async function savePracticeRating(input: PracticeRatingInput): Promise<void> {
  try {
    const sb = getSupabaseBrowser();
    const userId = await getUserId();
    const babyId = input.babyId ?? getStoredBabyId();
    await sb.from("practice_voice_ratings").insert({
      user_id: userId,
      baby_id: babyId,
      parent_id: userId,
      content_id: input.contentId ?? null,
      source: input.source ?? null,
      words: input.words,
      star_rating: input.overallStarRating,
      voice_score: input.overallScore,
      word_results: input.wordResults,
      practiced_at: new Date().toISOString(),
    });
  } catch {
    /* 忽略 */
  }
}

export interface CalendarVoiceEvent {
  type: "task" | "practice";
  date: string;
  title: string;
  star_rating: number;
  score: number;
  task_id?: string;
  practice_id?: string;
  words?: string[];
}

export interface CalendarVoiceDay {
  date: string;
  events: CalendarVoiceEvent[];
  daily_best_star_rating: number;
}

/** 读取当月（或指定月）声线评级，聚合为每日事件，供日历读取 */
export async function getVoiceRatingsForMonth(
  month?: string,
  babyId?: string | null
): Promise<CalendarVoiceDay[]> {
  const m = month || todayStr().slice(0, 7);
  try {
    const sb = getSupabaseBrowser();
    const userId = await getUserId();
    const from = `${m}-01`;
    const year = Number(m.split("-")[0]);
    const mon = Number(m.split("-")[1]);
    const last = new Date(year, mon, 0).getDate();
    const to = `${m}-${String(last).padStart(2, "0")}`;

    let taskQ = sb
      .from("task_voice_ratings")
      .select("*")
      .gte("date", from)
      .lte("date", to);
    let pracQ = sb
      .from("practice_voice_ratings")
      .select("*")
      .gte("practiced_at", `${from}T00:00:00`)
      .lte("practiced_at", `${to}T23:59:59`);
    if (babyId) {
      taskQ = taskQ.eq("baby_id", babyId);
      pracQ = pracQ.eq("baby_id", babyId);
    }
    const [taskRes, pracRes] = await Promise.all([taskQ, pracQ]);
    const taskRows = (taskRes.data as Record<string, unknown>[] | null) || [];
    const pracRows = (pracRes.data as Record<string, unknown>[] | null) || [];

    const byDate = new Map<string, CalendarVoiceDay>();
    const ensure = (date: string) => {
      if (!byDate.has(date)) byDate.set(date, { date, events: [], daily_best_star_rating: 0 });
      return byDate.get(date)!;
    };

    for (const r of taskRows) {
      // 归属过滤：有 babyId 时只看该孩子；否则退化为按 user_id（兼容灰度期空 baby_id）
      if (babyId && r.baby_id && r.baby_id !== babyId) continue;
      if (!babyId && userId && r.user_id && r.user_id !== userId) continue;
      const date = String(r.date).slice(0, 10);
      const day = ensure(date);
      const star = Number(r.star_rating) || 0;
      day.events.push({
        type: "task",
        date,
        title: `任务 ${String(r.task_id)}`,
        star_rating: star,
        score: Number(r.voice_score) || 0,
        task_id: String(r.task_id),
      });
      day.daily_best_star_rating = Math.max(day.daily_best_star_rating, star);
    }
    for (const r of pracRows) {
      if (babyId && r.baby_id && r.baby_id !== babyId) continue;
      if (!babyId && userId && r.user_id && r.user_id !== userId) continue;
      const date = String(r.practiced_at).slice(0, 10);
      const day = ensure(date);
      const star = Number(r.star_rating) || 0;
      const words = Array.isArray(r.words) ? (r.words as string[]) : [];
      day.events.push({
        type: "practice",
        date,
        title: `语音练习（${words.join("、") || "—"}）`,
        star_rating: star,
        score: Number(r.voice_score) || 0,
        practice_id: String(r.id),
        words,
      });
      day.daily_best_star_rating = Math.max(day.daily_best_star_rating, star);
    }
    return Array.from(byDate.values());
  } catch {
    return [];
  }
}

/** 治疗师端：读取声线评级（趋势/进展），按 baby_id 过滤，仅结构化指标 */
export async function getAllVoiceRatings(
  babyId?: string | null
): Promise<{ tasks: Record<string, unknown>[]; practices: Record<string, unknown>[] }> {
  try {
    const sb = getSupabaseBrowser();
    let taskQ = sb
      .from("task_voice_ratings")
      .select("*")
      .order("date", { ascending: false })
      .limit(200);
    let pracQ = sb
      .from("practice_voice_ratings")
      .select("*")
      .order("practiced_at", { ascending: false })
      .limit(200);
    if (babyId) {
      taskQ = taskQ.eq("baby_id", babyId);
      pracQ = pracQ.eq("baby_id", babyId);
    }
    const [taskRes, pracRes] = await Promise.all([taskQ, pracQ]);
    return {
      tasks: (taskRes.data as Record<string, unknown>[] | null) || [],
      practices: (pracRes.data as Record<string, unknown>[] | null) || [],
    };
  } catch {
    return { tasks: [], practices: [] };
  }
}
