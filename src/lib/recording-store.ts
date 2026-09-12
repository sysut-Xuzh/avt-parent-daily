/**
 * 家长端本地录音存储（IndexedDB）
 * ------------------------------------------------
 * 依据《AVT 三大优化方向执行方案》隐私框架 §4.1 与阶段四·步骤3 三层存储：
 *  - 原始录音仅存于家长端本地（IndexedDB），绝不调用任何上传接口
 *  - 声纹基线 / 自动推断样本 / 监护人同意：按"当前选中孩子"(baby_id) 分桶，多娃互不串扰
 *  - 云端（Supabase）为结构化指标的唯一事实源；本地为缓存，可丢弃可重建
 *  - 保留期限 30 天，自动清理；家长可随时一键删除
 */

import type { VoiceAnalysis } from "./voice-analysis";
import { getStoredBabyId } from "./baby-store";

const DB_NAME = "avt_voice_recordings";
const STORE = "recordings";
const DB_VERSION = 1;
const RETENTION_DAYS = 30;

export interface StoredRecording {
  id: string;
  createdAt: number; // epoch ms
  blob: Blob;
  duration: number; // 秒
  analysis: VoiceAnalysis; // 脱敏结构化指标（随录音一并保存，便于本地回看）
  taskId?: string;
  note?: string;
  babyId?: string; // 归属孩子（按当前选中孩子写入）
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB 不可用"));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

/** 保存一次录音到本地（不上传） */
export async function saveRecording(rec: StoredRecording): Promise<void> {
  const db = await openDB();
  const stamped: StoredRecording = {
    ...rec,
    babyId: rec.babyId ?? getStoredBabyId() ?? undefined,
  };
  return new Promise((resolve, reject) => {
    const r = tx(db, "readwrite").put(stamped);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

/** 列出本地录音（按时间倒序；可传 babyId 仅看当前孩子） */
export async function listRecordings(babyId?: string | null): Promise<StoredRecording[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = tx(db, "readonly").getAll();
    r.onsuccess = () => {
      const all = (r.result as StoredRecording[]).sort((a, b) => b.createdAt - a.createdAt);
      resolve(babyId ? all.filter((x) => x.babyId === babyId) : all);
    };
    r.onerror = () => reject(r.error);
  });
}

/** 删除单条 */
export async function deleteRecording(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = tx(db, "readwrite").delete(id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

/** 30 天保留期清理：删除超过保留期的录音 */
export async function purgeExpired(): Promise<number> {
  const db = await openDB();
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return new Promise((resolve, reject) => {
    const store = tx(db, "readwrite");
    const req = store.openCursor();
    let removed = 0;
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const rec = cursor.value as StoredRecording;
        if (rec.createdAt < cutoff) {
          cursor.delete();
          removed++;
        }
        cursor.continue();
      } else {
        resolve(removed);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** 一键清空全部本地录音 */
export async function clearAllRecordings(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = tx(db, "readwrite").clear();
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

/**
 * 出生即调一次：清理过期录音。返回清理条数。
 */
export async function ensureRetentionCleanup(): Promise<number> {
  try {
    return await purgeExpired();
  } catch {
    return 0;
  }
}

// ---------- 声纹建档（方案 §3：本地 IndexedDB / localStorage 永不外传） ----------
// 以下 key 均按"当前选中孩子"分桶：cloud 为唯一事实源，本地丢失=提示重录（已接受策略）。
// voice_profile_status：
//  - none          ：尚未录入，也未跳过（首次登录应弹引导）
//  - completed     ：家长主动录入（声线测试）
//  - skipped       ：点「稍后再测」，保留顶部提示
//  - auto_detected ：从任务录音自动推断（静默完成，无需确认）

function currentBabyKey(base: string): string {
  const id = getStoredBabyId();
  return id ? `${base}:${id}` : base;
}
const VOICE_PROFILE_KEY_BASE = "avt_voice_profile";
const AUTO_BASELINE_KEY_BASE = "avt_auto_baseline_tasks";
const CONSENT_KEY_BASE = "avt_voice_consent";
// 旧版孤立标志（兼容既有注册/跳过状态，保持全局）
const VOICEPRINT_KEY = "avt_voiceprint_registered";
const VOICEPRINT_SKIP_KEY = "avt_voiceprint_skipped";

export type VoiceProfileStatus = "none" | "completed" | "skipped" | "auto_detected";

export interface VoiceProfile {
  child_voice_baseline_hz: number | null; // 宝宝声纹基准基频
  voice_profile_status: VoiceProfileStatus;
  auto_detected_from_tasks: string[]; // 参与推断的任务录音 id
  updated_at: string;
}

export function getVoicePrintStatus(): VoiceProfileStatus {
  return getVoiceProfile().voice_profile_status;
}

export function getVoiceProfile(): VoiceProfile {
  if (typeof window === "undefined") {
    return { child_voice_baseline_hz: null, voice_profile_status: "none", auto_detected_from_tasks: [], updated_at: "" };
  }
  const raw = window.localStorage.getItem(currentBabyKey(VOICE_PROFILE_KEY_BASE));
  if (raw) {
    try {
      return JSON.parse(raw) as VoiceProfile;
    } catch {
      /* 损坏数据回退 */
    }
  }
  // 兼容旧版标志（按当前孩子局部回退到全局标志）
  if (window.localStorage.getItem(VOICEPRINT_KEY)) {
    return { child_voice_baseline_hz: null, voice_profile_status: "completed", auto_detected_from_tasks: [], updated_at: "" };
  }
  if (window.localStorage.getItem(VOICEPRINT_SKIP_KEY)) {
    return { child_voice_baseline_hz: null, voice_profile_status: "skipped", auto_detected_from_tasks: [], updated_at: "" };
  }
  return { child_voice_baseline_hz: null, voice_profile_status: "none", auto_detected_from_tasks: [], updated_at: "" };
}

function persistProfile(p: VoiceProfile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(currentBabyKey(VOICE_PROFILE_KEY_BASE), JSON.stringify(p));
}

/** 声纹基准基频（个人化判定带中心值），无则返回 null（用通用儿童频段） */
export function getVoiceBaselineHz(): number | null {
  return getVoiceProfile().child_voice_baseline_hz;
}

/** 录入/更新声纹基准（录入或自动推断共用） */
export function setVoiceBaselineHz(
  hz: number,
  status: VoiceProfileStatus = "completed",
  autoDetectedFromTasks: string[] = []
): void {
  const prev = getVoiceProfile();
  persistProfile({
    child_voice_baseline_hz: hz,
    voice_profile_status: status,
    auto_detected_from_tasks:
      status === "auto_detected" ? Array.from(new Set([...prev.auto_detected_from_tasks, ...autoDetectedFromTasks])) : prev.auto_detected_from_tasks,
    updated_at: new Date().toISOString(),
  });
}

export function markVoicePrintRegistered(): void {
  if (typeof window === "undefined") return;
  const prev = getVoiceProfile();
  persistProfile({
    ...prev,
    voice_profile_status: "completed",
    updated_at: new Date().toISOString(),
  });
  window.localStorage.removeItem(VOICEPRINT_SKIP_KEY);
}

export function markVoicePrintSkipped(): void {
  if (typeof window === "undefined") return;
  const prev = getVoiceProfile();
  persistProfile({
    ...prev,
    voice_profile_status: "skipped",
    updated_at: new Date().toISOString(),
  });
  window.localStorage.removeItem(VOICEPRINT_KEY);
}

// ---------- P5：声纹基准自动推断（静默完成，无需用户确认） ----------
/**
 * 当家长在任务录音中累计足够多「含宝宝声线」的样本时，静默推断宝宝声纹基准。
 * 触发条件（全部满足）：
 *  1. 尚未主动录入（none / skipped / 已是 auto_detected 但样本不足）
 *  2. 有效样本（含宝宝声线且基频有效）≥ 3 条
 *  3. auto_detected 状态下每新增 ≥5 条任务才重算一次
 * 返回推断出的基频（已四舍五入），未触发则返回 null。
 */
export function maybeInferVoiceBaseline(
  taskRatings: { childVoiceBaselineHz: number | null; hasChildVoice: boolean; taskId: string }[]
): number | null {
  if (typeof window === "undefined") return null;
  const valid = taskRatings.filter(
    (r) => r.hasChildVoice && r.childVoiceBaselineHz && r.childVoiceBaselineHz > 0
  );
  const prev = getVoiceProfile();
  // 已主动录入则不再覆盖
  if (prev.voice_profile_status === "completed" && prev.child_voice_baseline_hz != null) {
    return null;
  }
  if (valid.length < 3) return null;
  const vals = valid.map((r) => r.childVoiceBaselineHz as number).sort((a, b) => a - b);
  const median = vals[Math.floor(vals.length / 2)];
  const taskIds = valid.map((r) => r.taskId);
  if (prev.voice_profile_status === "auto_detected") {
    const newCount = valid.length - prev.auto_detected_from_tasks.length;
    if (newCount < 5 && prev.auto_detected_from_tasks.length > 0) return null;
  }
  setVoiceBaselineHz(Math.round(median), "auto_detected", taskIds);
  return Math.round(median);
}

// ---------- P5：自动推断所需的本地样本累积 ----------
// 维护一份「含宝宝声线的任务录音」清单（仅存 taskId + 基频，体积小），
// 按当前孩子分桶，供 maybeInferVoiceBaseline 读取并静默推断声纹基准。

export interface AutoBaselineSample {
  taskId: string;
  childVoiceBaselineHz: number | null;
  hasChildVoice: boolean;
}

export function getAutoBaselineSamples(): AutoBaselineSample[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(currentBabyKey(AUTO_BASELINE_KEY_BASE));
    if (!raw) return [];
    const arr = JSON.parse(raw) as AutoBaselineSample[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** 追加 / 覆盖一条样本（按 taskId 去重），返回最新清单 */
export function addAutoBaselineSample(sample: AutoBaselineSample): AutoBaselineSample[] {
  const prev = getAutoBaselineSamples();
  const next = prev.filter((s) => s.taskId !== sample.taskId);
  next.push(sample);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(currentBabyKey(AUTO_BASELINE_KEY_BASE), JSON.stringify(next));
  }
  return next;
}

// ---------- 隐私单独同意标志（方案 §4.2 / 阶段五·上线门槛） ----------
// 按当前孩子分桶：每个孩子的音频/声纹处理需分别取得监护人单独同意。

export function hasVoiceConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(currentBabyKey(CONSENT_KEY_BASE)) === "1";
}

export function setVoiceConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(currentBabyKey(CONSENT_KEY_BASE), "1");
}
