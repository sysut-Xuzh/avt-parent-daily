"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FamilyDetail from "@/components/family-detail";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";

interface DashboardData {
  dailyRates: { date: string; rate: number; completed: number; total: number }[];
  strategyDistribution: { name: string; count: number }[];
  heatmapData: { date: string; words: { word: string; done: boolean }[] }[];
  anomalyBabies: { babyId: string; babyName: string; status: string }[];
  badges: { weekStreak: number; totalCompleted: number; auditoryFirstCount: number };
  totalFamilies: number;
  weekTotal: number;
  weekCompleted: number;
}

export default function TherapistDashboard({ babyName }: { babyName?: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBaby, setSelectedBaby] = useState<string | null>(null);

  useEffect(() => {
    const url = babyName ? `/api/dashboard?babyName=${encodeURIComponent(babyName)}` : "/api/dashboard";
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (d.dailyRates) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">加载数据...</div>;
  if (!data) return <div className="text-center py-20 text-gray-400">暂无数据</div>;

  const completionRate = data.weekTotal > 0 ? Math.round((data.weekCompleted / data.weekTotal) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* 概要卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "家庭数", value: data.totalFamilies, icon: "👶", color: "bg-indigo-50" },
          { label: "本周任务", value: data.weekTotal, icon: "📋", color: "bg-blue-50" },
          { label: "完成率", value: `${completionRate}%`, icon: "✅", color: "bg-green-50" },
          { label: "已完成", value: data.weekCompleted, icon: "🎯", color: "bg-purple-50" },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`${card.color} rounded-xl p-3 text-center shadow-sm`}
          >
            <span className="text-xl block mb-1">{card.icon}</span>
            <p className="text-lg font-bold text-gray-800">{card.value}</p>
            <p className="text-xs text-gray-400">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* 图表1：日完成率趋势（折线图） */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
      >
        <h3 className="text-sm font-bold text-gray-700 mb-3">📈 执行率趋势</h3>
        {data.dailyRates.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.dailyRates}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip formatter={(v: any) => [`${v}%`, "完成率"]} />
              <Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-xs text-gray-400 text-center py-6">暂无趋势数据</p>}
      </motion.div>

      {/* 图表2：策略使用分布（柱状图） */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
      >
        <h3 className="text-sm font-bold text-gray-700 mb-3">📊 策略使用分布</h3>
        {data.strategyDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.strategyDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-xs text-gray-400 text-center py-6">暂无策略数据</p>}
      </motion.div>

      {/* 图表3：目标词覆盖热力图 */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
      >
        <h3 className="text-sm font-bold text-gray-700 mb-3">🗺️ 目标词覆盖</h3>
        {data.heatmapData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-gray-400 font-normal p-1">日期</th>
                  {data.heatmapData[0]?.words.map((w) => (
                    <th key={w.word} className="text-center text-gray-400 font-normal p-1">{w.word}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.heatmapData.map((day) => (
                  <tr key={day.date}>
                    <td className="p-1 text-gray-500">{day.date.slice(5)}</td>
                    {day.words.map((w) => (
                      <td key={w.word} className="p-1 text-center">
                        <span className={`inline-block w-6 h-6 rounded ${w.done ? "bg-green-300" : "bg-gray-100"}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-xs text-gray-400 text-center py-6">暂无覆盖数据</p>}
      </motion.div>

      {/* 异常标记 */}
      {data.anomalyBabies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-red-50 rounded-xl p-4 border border-red-200"
        >
          <h3 className="text-sm font-bold text-red-700 mb-2">⚠️ 需要关注的宝宝</h3>
          {data.anomalyBabies.map((baby) => (
            <div key={baby.babyId} className="flex items-center gap-2 text-sm text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {baby.babyName} — 连续 3 天未完成任务
            </div>
          ))}
        </motion.div>
      )}

      {/* 徽章墙 */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
      >
        <h3 className="text-sm font-bold text-gray-700 mb-3">🏅 徽章墙</h3>
        <div className="flex gap-3 flex-wrap">
          {[
            { icon: "🔥", label: "坚持一周", earned: data.badges.weekStreak >= 7 },
            { icon: "⭐", label: "月度之星", earned: data.badges.weekStreak >= 30 },
            { icon: "👂", label: "听觉小能手", earned: data.badges.auditoryFirstCount >= 50 },
            { icon: "📖", label: "词汇达人", earned: data.badges.totalCompleted >= 10 },
          ].map((badge) => (
            <div key={badge.label} className={`text-center p-2 rounded-lg ${badge.earned ? "bg-amber-50" : "bg-gray-50 opacity-40"}`}>
              <span className="text-2xl block">{badge.icon}</span>
              <p className="text-[10px] text-gray-500 mt-0.5">{badge.label}</p>
              {badge.earned && <span className="text-[10px] text-green-500">✅ 已获得</span>}
            </div>
          ))}
        </div>
      </motion.div>

      {/* 家庭列表 + 详情视图 */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
      >
        <h3 className="text-sm font-bold text-gray-700 mb-2">👶 家庭列表</h3>
        <div className="space-y-1">
          {data.anomalyBabies.length > 0 ? (
            data.anomalyBabies.map((baby: any) => (
              <button key={baby.babyId} onClick={() => setSelectedBaby(selectedBaby === baby.babyId ? null : baby.babyId)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${selectedBaby === baby.babyId ? "bg-indigo-50" : "hover:bg-gray-50"}`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-medium text-gray-700">{baby.babyName}</span>
                <span className="text-xs text-red-500">需关注</span>
                <span className="ml-auto text-gray-300">{selectedBaby === baby.babyId ? "▼" : "▶"}</span>
              </button>
            ))
          ) : (
            <p className="text-xs text-gray-400 py-2">暂无家庭数据</p>
          )}
        </div>
        {selectedBaby && (
          <div className="mt-3">
            <FamilyDetail
              babyName={data.anomalyBabies.find((b: any) => b.babyId === selectedBaby)?.babyName || "宝宝"}
              babyId={selectedBaby}
              onClose={() => setSelectedBaby(null)}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
