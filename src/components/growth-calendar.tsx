"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadCheckins } from "@/data/learning";
import { loadTestRecords } from "@/data/hearing-test";
import { getMyPostDates } from "@/lib/community-service";
import { getVoiceRatingsForMonth, type CalendarVoiceDay } from "@/lib/voice-ratings-service";

interface DayInfo {
  date: string;
  total: number;
  completed: number;
  skipped: number;
  hasAudio: boolean;
  hasFeedback: boolean;
}

interface CalendarDayDetail {
  date: string;
  total: number;
  completed: number;
  tasks: { time: string; scene: string; scene_icon: string; target_word: string; strategy: string; status: string }[];
  logs: { action: string; parent_mood: string; notes: string; completed_at: string }[];
  recordings: { fileUrl: string; duration: number; createdAt: string }[];
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

// 无后端兜底：本地生成整月网格（仅用于演示；接入日历 API 后走真实数据）
function buildLocalMonth(year: number, month: number): DayInfo[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const out: DayInfo[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dd = String(d).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    out.push({
      date: `${year}-${mm}-${dd}`,
      total: 0,
      completed: 0,
      skipped: 0,
      hasAudio: false,
      hasFeedback: false,
    });
  }
  return out;
}

// 马卡龙色系
const PASTEL = {
  audio: "bg-rose-100 hover:bg-rose-200 text-rose-600",
  feedback: "bg-sky-100 hover:bg-sky-200 text-sky-600",
  complete: "bg-emerald-100 hover:bg-emerald-200 text-emerald-600",
  partial: "bg-violet-50 hover:bg-violet-100 text-violet-400",
  empty: "hover:bg-pink-50",
};

export default function GrowthCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<DayInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<CalendarDayDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [learningDates, setLearningDates] = useState<Set<string>>(new Set());
  // 听力测试日：date(YYYY-MM-DD) -> 综合得分，用于叠加 🎯 测评标记
  const [testDates, setTestDates] = useState<Record<string, number>>({});
  // 社区分享日：date(YYYY-MM-DD) 集合，用于叠加 💬 标记
  const [communityDates, setCommunityDates] = useState<Set<string>>(new Set());
  // 声线评级日：date -> 当日聚合（任务/练习星级），用于叠加 ⭐ 标记（方案 § P4）
  const [voiceDays, setVoiceDays] = useState<Record<string, CalendarVoiceDay>>({});

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  useEffect(() => {
    setLoading(true);
    setSelectedDate(null);
    setDetail(null);
    // 读取学习打卡日期（localStorage），用于叠加 📚 标记
    setLearningDates(new Set(Object.keys(loadCheckins())));
    // 读取听力测试记录（localStorage），用于叠加 🎯 测评日标记
    const testMap: Record<string, number> = {};
    loadTestRecords().forEach((r) => {
      testMap[r.date.slice(0, 10)] = r.totalPct;
    });
    setTestDates(testMap);
    // 读取社区分享日期（已登录走后端真实数据，否则本地），用于叠加 💬 标记
    getMyPostDates().then(setCommunityDates);
    // 读取声线评级（任务 + 练习），叠加 ⭐ 标记（方案 § P4）
    getVoiceRatingsForMonth(monthStr)
      .then((vd) => {
        const map: Record<string, CalendarVoiceDay> = {};
        vd.forEach((d) => (map[d.date] = d));
        setVoiceDays(map);
      })
      .catch(() => setVoiceDays({}));
    fetch(`/api/calendar?month=${monthStr}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.days && d.days.length) setDays(d.days);
        else setDays(buildLocalMonth(year, month)); // 无后端兜底
      })
      .catch(() => setDays(buildLocalMonth(year, month)))
      .finally(() => setLoading(false));
  }, [monthStr, year, month]);

  const loadDayDetail = useCallback(async (date: string) => {
    setSelectedDate(date);
    setDetailLoading(true);
    try {
      const [logsRes, recordingsRes] = await Promise.all([
        fetch(`/api/logs?date=${date}`),
        fetch(`/api/recordings/list?date=${date}`),
      ]);
      const d = await logsRes.json();
      const recordingsData = await recordingsRes.json();
      const total = d.total || 0;
      const completed = d.completed || 0;
      setDetail({
        date,
        total,
        completed,
        tasks: d.tasks || [],
        logs: d.logs || [],
        recordings: recordingsData.recordings || [],
      });
    } catch {
      setDetail({ date, total: 0, completed: 0, tasks: [], logs: [], recordings: [] });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const mondayOffset = (firstDayOfWeek + 6) % 7;
  const dayCount = days.length;
  const cells: (DayInfo | null)[] = [...Array(mondayOffset).fill(null), ...days];

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const isToday = (date: string) => {
    const n = new Date();
    const todayStr = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
    return date === todayStr;
  };

  // 日期格子配色
  const dayCellClass = (day: DayInfo) => {
    if (day.hasAudio) return PASTEL.audio;
    if (day.hasFeedback) return PASTEL.feedback;
    if (day.total > 0 && day.completed === day.total) return PASTEL.complete;
    if (day.total > 0) return PASTEL.partial;
    return PASTEL.empty;
  };

  // 进度环（SVG）
  const rate = detail && detail.total > 0 ? Math.round((detail.completed / detail.total) * 100) : 0;
  const R = 26;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC - (rate / 100) * CIRC;

  const moodEmoji: Record<string, string> = { happy: "😊", neutral: "😐", tired: "😴" };
  const moodText: Record<string, string> = { happy: "顺利", neutral: "一般", tired: "疲惫" };

  return (
    <div className="mx-4 md:mx-0 mt-3">
      {/* 标题 + 月份切换 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-gray-700 flex items-center gap-1.5">
          <span className="text-xl">📅</span> 成长日历
          <span className="text-xs font-normal text-gray-400 ml-1">点日期看记录</span>
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-7 h-7 rounded-full bg-rose-100 text-rose-400 text-xs hover:bg-rose-200 transition-colors">‹</button>
          <span className="text-sm font-semibold text-gray-600 min-w-20 text-center">{year}年{month}月</span>
          <button onClick={nextMonth} className="w-7 h-7 rounded-full bg-rose-100 text-rose-400 text-xs hover:bg-rose-200 transition-colors">›</button>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-300 inline-block" /> 🎙️录音</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-300 inline-block" /> 📝记录</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-300 inline-block" /> ✅全完成</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-violet-200 inline-block" /> ⏳部分</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-300 inline-block" /> 📚学习</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-violet-300 inline-block" /> 🎯测评</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-pink-300 inline-block" /> 💬社区</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block" /> ⭐声线</span>
      </div>

      {/* 星期表头 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[10px] text-gray-400 py-1 font-medium">{w}</div>
        ))}
      </div>

      {/* 日历网格 */}
      {loading ? (
        <div className="text-center py-10 text-gray-300 text-sm">加载中...</div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => (
            <div key={i}>
              {day ? (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => loadDayDetail(day.date)}
                  className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-colors shadow-sm ${dayCellClass(day)} ${selectedDate === day.date ? "ring-2 ring-indigo-300" : ""}`}
                >
                  <span className={`text-xs font-semibold ${isToday(day.date) ? "text-indigo-600" : "text-gray-600"}`}>
                    {day.date.slice(8)}
                  </span>
                  {/* 状态 emoji 标记 */}
                  <span className="text-[10px] leading-none">
                    {[
                      day.hasAudio ? "🎙️" : null,
                      day.hasFeedback ? "📝" : null,
                      learningDates.has(day.date) ? "📚" : null,
                      testDates[day.date] != null ? "🎯" : null,
                      communityDates.has(day.date) ? "💬" : null,
                      voiceDays[day.date] ? `⭐${voiceDays[day.date].daily_best_star_rating}` : null,
                      day.total > 0 ? (day.completed === day.total ? "✅" : "⏳") : null,
                    ]
                      .filter(Boolean)
                      .join(" ") || ""}
                  </span>
                  {day.total > 0 && (
                    <span className="text-[8px] opacity-60">{day.completed}/{day.total}</span>
                  )}
                </motion.button>
              ) : (
                <div className="w-full aspect-square rounded-2xl bg-pink-50/40" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 点击日期 → 浮屏卡片 */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setSelectedDate(null); setDetail(null); }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 10, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 260 }}
              className="bg-gradient-to-b from-rose-50 via-white to-sky-50 rounded-3xl p-5 w-full max-w-sm shadow-2xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 顶部：日期 + 关闭 */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                  <span className="text-lg">{isToday(selectedDate) ? "🌟" : "🌸"}</span>
                  {selectedDate}
                </h4>
                <button onClick={() => { setSelectedDate(null); setDetail(null); }} className="w-7 h-7 rounded-full bg-white shadow text-gray-400 text-xs hover:text-gray-600">✕</button>
              </div>

              {detailLoading ? (
                <div className="text-center py-10">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block text-2xl">⏳</motion.span>
                </div>
              ) : detail ? (
                <div className="space-y-4">
                  {/* 进度环 */}
                  <div className="flex items-center gap-4 bg-white/70 rounded-2xl p-3 shadow-sm">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <svg width="64" height="64" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r={R} fill="none" stroke="#fbcfe8" strokeWidth="5" />
                        <motion.circle
                          cx="32" cy="32" r={R} fill="none" stroke="#fb7185" strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={CIRC}
                          initial={{ strokeDashoffset: CIRC }}
                          animate={{ strokeDashoffset: offset }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          transform="rotate(-90 32 32)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-rose-500">{rate}%</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 font-medium">任务进度</p>
                      <p className="text-sm text-gray-800 font-bold">{detail.completed}/{detail.total} 完成</p>
                      {detail.total > 0 && rate >= 100 && <p className="text-[10px] text-green-500">🎉 今天全完成！</p>}
                      {detail.total > 0 && rate === 0 && <p className="text-[10px] text-gray-400">今天还没开始哦</p>}
                    </div>
                  </div>

                  {/* 任务列表 */}
                  {detail.tasks.length > 0 && (
                    <div className="bg-white/70 rounded-2xl p-3 shadow-sm">
                      <p className="text-xs font-medium text-gray-500 mb-1.5">🗒️ 当日任务</p>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.tasks.map((t, i) => (
                          <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] ${t.status === "completed" ? "bg-green-100 text-green-600" : t.status === "skipped" ? "bg-red-50 text-red-400" : "bg-gray-100 text-gray-400"}`}>
                            {t.target_word} {t.status === "completed" ? "✅" : t.status === "skipped" ? "⏭️" : "⏳"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 录音 */}
                  {detail.recordings.length > 0 && (
                    <div className="bg-white/70 rounded-2xl p-3 shadow-sm">
                      <p className="text-xs font-medium text-rose-500 mb-1.5">🎙️ 录音（{detail.recordings.length}）</p>
                      {detail.recordings.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 py-1">
                          <audio controls src={r.fileUrl} className="h-9 w-full" preload="none" />
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{r.duration}秒</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 情绪/笔记 */}
                  {detail.logs.filter((l) => l.parent_mood || l.notes).length > 0 && (
                    <div className="bg-white/70 rounded-2xl p-3 shadow-sm">
                      <p className="text-xs font-medium text-sky-500 mb-1.5">📝 反馈记录</p>
                      {detail.logs.filter((l) => l.parent_mood || l.notes).map((l, i) => (
                        <div key={i} className="py-1">
                          {l.parent_mood && (
                            <span className="text-xs mr-2">{moodEmoji[l.parent_mood] || "😊"} {moodText[l.parent_mood] || l.parent_mood}</span>
                          )}
                          {l.notes && <span className="text-xs text-gray-600">「{l.notes}」</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 学习打卡标记 */}
                  {learningDates.has(selectedDate) && (
                    <div className="bg-white/70 rounded-2xl p-3 shadow-sm">
                      <p className="text-xs font-medium text-indigo-500 mb-1.5">📚 学习打卡</p>
                      <p className="text-xs text-gray-600">这一天完成了「每日学习」，已记入成长轨迹。</p>
                    </div>
                  )}

                  {/* 听力测试标记 */}
                  {testDates[selectedDate] != null && (
                    <div className="bg-white/70 rounded-2xl p-3 shadow-sm">
                      <p className="text-xs font-medium text-violet-500 mb-1.5">🎯 听觉测评</p>
                      <p className="text-xs text-gray-600">
                        这一天完成了一次 AVT 听觉测评，综合得分{" "}
                        <span className="font-bold text-violet-600">{testDates[selectedDate]} 分</span>。
                      </p>
                    </div>
                  )}

                  {/* 社区分享标记 */}
                  {communityDates.has(selectedDate) && (
                    <div className="bg-white/70 rounded-2xl p-3 shadow-sm">
                      <p className="text-xs font-medium text-pink-500 mb-1.5">💬 社区分享</p>
                      <p className="text-xs text-gray-600">这一天在「康复圈」发布了内容，和更多家长交流了康复经验。</p>
                    </div>
                  )}

                  {/* 声线练习标记（方案 § P4） */}
                  {voiceDays[selectedDate] && voiceDays[selectedDate].events.length > 0 && (
                    <div className="bg-white/70 rounded-2xl p-3 shadow-sm">
                      <p className="text-xs font-medium text-amber-500 mb-1.5">⭐ 声线练习</p>
                      <div className="space-y-1.5">
                        {voiceDays[selectedDate].events.map((ev, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-xs text-gray-700">{ev.title}</span>
                            <span className="text-xs text-amber-500 font-semibold">
                              {"⭐".repeat(ev.star_rating)}
                              <span className="text-[10px] text-gray-400 ml-1">{ev.score}分</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 无记录 */}
                  {!learningDates.has(selectedDate) && testDates[selectedDate] == null && !communityDates.has(selectedDate) && detail.tasks.length === 0 && detail.recordings.length === 0 && !detail.logs.some((l) => l.parent_mood || l.notes) && !(voiceDays[selectedDate] && voiceDays[selectedDate].events.length > 0) && (
                    <div className="text-center py-6">
                      <span className="text-3xl block mb-2">🐰</span>
                      <p className="text-xs text-gray-400">这一天还没有记录哦</p>
                      <p className="text-[10px] text-gray-300 mt-1">听听在这里陪你~</p>
                    </div>
                  )}
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
