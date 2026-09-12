"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  listRecordings,
  deleteRecording,
  type StoredRecording,
} from "@/lib/recording-store";
import { detectPossibleProxy } from "@/lib/voice-analysis";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Granularity = "week" | "month";

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7
    );
  return `${date.getUTCFullYear()}-W${week}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface Bucket {
  key: string;
  label: string;
  count: number;
  avgStars: number;
  highRatio: number; // 完美参与占比
  effectiveSum: number; // 有效发声总时长（秒）
}

interface Anomaly {
  id: string;
  date: string;
  type: "proxy" | "consecutive";
  reason: string;
}

export default function VoiceReportPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [records, setRecords] = useState<StoredRecording[]>([]);
  const [gran, setGran] = useState<Granularity>("week");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    listRecordings()
      .then(setRecords)
      .catch(() => setRecords([]));
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const buckets = useMemo<Bucket[]>(() => {
    if (!records.length) return [];
    const map = new Map<string, StoredRecording[]>();
    for (const r of records) {
      const d = new Date(r.createdAt);
      const key = gran === "week" ? isoWeekKey(d) : monthKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    const list = Array.from(map.entries()).map(([key, recs]) => {
      const stars = recs.map((r) => r.analysis.engagementStars);
      const avg = stars.reduce((a, b) => a + b, 0) / stars.length;
      const high = stars.filter((s) => s === 3).length / stars.length;
      const eff = recs.reduce((a, r) => a + (r.analysis.effectiveDuration || 0), 0);
      const label =
        gran === "week"
          ? key.replace("-W", " 第") + "周"
          : `${Number(key.split("-")[1])}月`;
      return { key, label, count: recs.length, avgStars: avg, highRatio: high, effectiveSum: eff };
    });
    return list.sort((a, b) => a.key.localeCompare(b.key)).slice(-8);
  }, [records, gran]);

  const summary = useMemo(() => {
    if (!records.length) return { avg: 0, high: 0, eff: 0, anomalies: 0 };
    const stars = records.map((r) => r.analysis.engagementStars);
    const avg = stars.reduce((a, b) => a + b, 0) / stars.length;
    const high = stars.filter((s) => s === 3).length / stars.length;
    const eff = records.reduce((a, r) => a + (r.analysis.effectiveDuration || 0), 0);
    return { avg, high, eff, anomalies: anomalies.length };
  }, [records]);

  const anomalies = useMemo<Anomaly[]>(() => {
    const out: Anomaly[] = [];
    // 1) 疑似代答
    for (const r of records) {
      const { proxySuspected, reason } = detectPossibleProxy(r.analysis);
      if (proxySuspected) {
        out.push({
          id: r.id,
          date: new Date(r.createdAt).toLocaleDateString("zh-CN"),
          type: "proxy",
          reason,
        });
      }
    }
    // 2) 连续未参与（按时间正序，连续 3 次及以上 low）
    const sorted = [...records].sort((a, b) => a.createdAt - b.createdAt);
    let run = 0;
    for (const r of sorted) {
      if (r.analysis.engagementStars === 1) {
        run++;
        if (run >= 3) {
          out.push({
            id: r.id,
            date: new Date(r.createdAt).toLocaleDateString("zh-CN"),
            type: "consecutive",
            reason: `连续 ${run} 次测评为「待提高」，建议排查孩子状态或训练难度`,
          });
        }
      } else {
        run = 0;
      }
    }
    return out;
  }, [records]);

  const starText = (n: number) => "⭐".repeat(Math.round(n)) + "☆".repeat(3 - Math.round(n));

  const handlePlay = (r: StoredRecording) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(r.blob);
    setAudioUrl(url);
    setPlayingId(r.id);
    const audio = new Audio(url);
    audio.play().catch(() => {});
  };

  const handleDelete = async (id: string) => {
    await deleteRecording(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  if (!mounted) return <div className="min-h-screen bg-gray-50" />;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 顶部栏 */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 text-lg">‹</button>
        <h1 className="text-base font-extrabold text-gray-800">📊 参与度报告</h1>
        <span className="ml-auto text-[11px] text-gray-400">本地数据 · 不上传</span>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {records.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm">
            还没有录音数据。<br />去「声线实验室」录一段孩子发声，这里就会出现趋势报告～
          </div>
        ) : (
          <>
            {/* 汇总卡 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <div className="text-lg font-extrabold text-indigo-600">{starText(summary.avg)}</div>
                <div className="text-[10px] text-gray-400 mt-1">平均参与度</div>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <div className="text-lg font-extrabold text-emerald-500">
                  {Math.round(summary.high * 100)}%
                </div>
                <div className="text-[10px] text-gray-400 mt-1">完美参与占比</div>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <div className="text-lg font-extrabold text-amber-500">
                  {Math.round(summary.eff / 60)}<span className="text-xs">分</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-1">累计有效发声</div>
              </div>
            </div>

            {/* 粒度切换 + 趋势图 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-700">参与度趋势</h2>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                  {(["week", "month"] as Granularity[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGran(g)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        gran === g ? "bg-indigo-500 text-white" : "text-gray-500"
                      }`}
                    >
                      {g === "week" ? "按周" : "按月"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={buckets} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <Tooltip
                      formatter={(value) => {
                        const n = Array.isArray(value) ? Number(value[0]) : Number(value);
                        return [`${n.toFixed(2)} 星`, "平均参与度"] as [string, string];
                      }}
                      contentStyle={{ fontSize: 12, borderRadius: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgStars"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 异常标记 */}
            {anomalies.length > 0 && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <h2 className="text-sm font-bold text-amber-700 mb-2">⚠️ 异常标记（{anomalies.length}）</h2>
                <ul className="space-y-1.5">
                  {anomalies.slice(0, 5).map((a) => (
                    <li key={a.id + a.type} className="text-[11px] text-amber-700 leading-relaxed">
                      · <span className="font-medium">{a.date}</span> 〔{a.type === "proxy" ? "疑似代答" : "连续未参与"}〕{a.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 历史录音列表 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 mb-2">历史录音（{records.length}）</h2>
              <ul className="space-y-2">
                {records.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="text-lg">{starText(r.analysis.engagementStars)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-700 truncate">
                        {new Date(r.createdAt).toLocaleString("zh-CN")}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        有效发声 {Math.round(r.analysis.effectiveDuration || 0)}s · 置信度 {Math.round((r.analysis.confidence || 0) * 100)}%
                      </div>
                    </div>
                    <button
                      onClick={() => handlePlay(r)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium"
                    >
                      {playingId === r.id ? "播放中" : "回放"}
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-400 text-xs"
                    >
                      删除
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-center text-[10px] text-gray-300 px-4">
              原始录音仅存于本设备，30 天后自动清理，可随时删除。
            </p>
          </>
        )}
      </div>

      {/* 底部入口按钮 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
        <button
          onClick={() => router.push("/parent/voice-lab")}
          className="px-5 py-2.5 rounded-full bg-indigo-500 text-white text-sm font-bold shadow-lg active:scale-95 transition-all"
        >
          🎙️ 去录一段
        </button>
      </div>
    </div>
  );
}
