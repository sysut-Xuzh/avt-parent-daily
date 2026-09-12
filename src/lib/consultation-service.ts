/**
 * 工单式咨询（建议三）
 * 家长提交结构化问题 + 自动附带最近 3 天训练数据（脱敏）；
 * 治疗师端读取队列并文字回复。
 * 已登录 → 走 Supabase；未登录 / 表未建 → 本地降级（同设备演示）。
 */
import { getSupabaseBrowser } from "@/lib/supabase";
import { listRecordings } from "@/lib/recording-store";
import { loadTestRecords } from "@/data/hearing-test";

export type ConsultType = "method" | "uncooperative" | "result" | "other";

export interface Consultation {
  id: string;
  userId: string;
  type: ConsultType;
  description: string;
  attachedData: Record<string, unknown>;
  status: "pending" | "replied" | "closed";
  therapistReply?: string | null;
  createdAt: string;
  repliedAt?: string | null;
}

const TYPE_LABELS: Record<ConsultType, string> = {
  method: "训练方法疑问",
  uncooperative: "孩子不配合怎么办",
  result: "测评结果看不懂",
  other: "其他",
};

export function consultTypeLabel(t: ConsultType): string {
  return TYPE_LABELS[t];
}

/** 采集最近 3 天训练数据摘要（脱敏，仅结构化指标） */
export async function collectRecentTrainingSummary(): Promise<Record<string, unknown>> {
  const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
  try {
    const recs = (await listRecordings()).filter((r) => r.createdAt >= cutoff);
    const stars = recs.map((r) => r.analysis.engagementStars);
    const avgStars = stars.length ? stars.reduce((a, b) => a + b, 0) / stars.length : null;
    const tests = loadTestRecords().filter((t) => new Date(t.date).getTime() >= cutoff);
    return {
      window: "最近3天",
      recordingCount: recs.length,
      avgEngagementStars: avgStars ? Number(avgStars.toFixed(2)) : null,
      highParticipationCount: stars.filter((s) => s === 3).length,
      hearingTests: tests.length,
      note: "以上为脱敏结构化指标，不含任何原始录音",
    };
  } catch {
    return { window: "最近3天", note: "本地数据读取失败" };
  }
}

function mapRow(row: Record<string, unknown>): Consultation {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: row.type as ConsultType,
    description: String(row.description),
    attachedData: (row.attached_data as Record<string, unknown>) || {},
    status: row.status as Consultation["status"],
    therapistReply: (row.therapist_reply as string) || null,
    createdAt: String(row.created_at),
    repliedAt: (row.replied_at as string) || null,
  };
}

export async function submitConsultation(
  type: ConsultType,
  description: string
): Promise<{ ok: boolean; backend: boolean; error?: string }> {
  const attachedData = await collectRecentTrainingSummary();
  try {
    const sb = getSupabaseBrowser();
    const { data: auth } = await sb.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error("not-authed");
    const { error } = await sb.from("consultations").insert({
      user_id: userId,
      type,
      description,
      attached_data: attachedData,
    });
    if (error) throw error;
    return { ok: true, backend: true };
  } catch {
    // 本地降级：存 localStorage
    const local = loadLocalConsults();
    local.unshift({
      id: `local-${Date.now()}`,
      userId: "local",
      type,
      description,
      attachedData,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    saveLocalConsults(local);
    return { ok: true, backend: false };
  }
}

export async function getMyConsultations(): Promise<{ items: Consultation[]; backend: boolean }> {
  try {
    const sb = getSupabaseBrowser();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user?.id) throw new Error("not-authed");
    const { data, error } = await sb
      .from("consultations")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { items: (data as Record<string, unknown>[]).map(mapRow), backend: true };
  } catch {
    return { items: loadLocalConsults(), backend: false };
  }
}

/** 治疗师端：读取全部工单（演示阶段 anon 可读） */
export async function getTherapistQueue(): Promise<Consultation[]> {
  try {
    const sb = getSupabaseBrowser();
    const { data, error } = await sb
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data as Record<string, unknown>[]).map(mapRow);
  } catch {
    return loadLocalConsults();
  }
}

export async function replyConsultation(
  id: string,
  reply: string
): Promise<{ ok: boolean; backend: boolean }> {
  try {
    const sb = getSupabaseBrowser();
    const { error } = await sb
      .from("consultations")
      .update({ therapist_reply: reply, status: "replied", replied_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return { ok: true, backend: true };
  } catch {
    const local = loadLocalConsults();
    const item = local.find((c) => c.id === id);
    if (item) {
      item.therapistReply = reply;
      item.status = "replied";
      item.repliedAt = new Date().toISOString();
      saveLocalConsults(local);
    }
    return { ok: true, backend: false };
  }
}

// ---------- 本地降级存储 ----------
const LOCAL_KEY = "avt_consultations";
function loadLocalConsults(): Consultation[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveLocalConsults(list: Consultation[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}
