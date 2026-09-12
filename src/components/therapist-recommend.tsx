"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LEARNING_ITEMS,
  getCategory,
  getFormat,
  type LearningItem,
} from "@/data/learning";
import {
  saveRecommendation,
  getRecommendationsForTherapist,
} from "@/lib/recommendations-service";
import { getSupabaseBrowser } from "@/lib/supabase";

/**
 * 治疗师端「推荐学习内容」（方案 § P3）
 * - 浏览学习内容库，选择一条推送给家长
 * - 可选填写推荐语，写入 therapist_recommendations
 * - 已推荐的内容标记状态，避免重复
 */
export default function TherapistRecommend() {
  const [note, setNote] = useState("");
  const [recommended, setRecommended] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  // 目标孩子（阶段一·步骤4：推荐定向到具体孩子，消灭全局广播）
  const [babies, setBabies] = useState<{ id: string; name: string }[]>([]);
  const [targetBabyId, setTargetBabyId] = useState<string | null>(null);

  useEffect(() => {
    getRecommendationsForTherapist()
      .then((rows) => {
        const ids = new Set(rows.map((r) => r.content_id));
        setRecommended(ids);
      })
      .catch(() => {});
  }, []);

  // 拉取本治疗师负责的孩子列表，供"定向推荐"选择
  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabaseBrowser();
        const { data: authData } = await sb.auth.getUser();
        const uid = authData.user?.id;
        if (!uid) return;
        const { data: ft } = await sb
          .from("family_therapists")
          .select("baby_id")
          .eq("therapist_id", uid);
        const ids = ((ft as { baby_id: string }[]) || []).map((r) => r.baby_id).filter(Boolean);
        if (ids.length === 0) return;
        const { data: bs } = await sb
          .from("babies")
          .select("id, name")
          .in("id", ids);
        const list = (bs as { id: string; name: string }[]) || [];
        setBabies(list);
        if (list[0]) setTargetBabyId(list[0].id);
      } catch {
        /* 忽略 */
      }
    })();
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LEARNING_ITEMS;
    return LEARNING_ITEMS.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        getCategory(i.category).name.includes(query.trim())
    );
  }, [query]);

  const handleRecommend = async (item: LearningItem) => {
    setBusyId(item.id);
    setMsg("");
    const ok = await saveRecommendation({
      contentId: item.id,
      contentTitle: item.title,
      contentSummary: item.summary,
      note: note.trim() || undefined,
      therapistName: "陈治疗师",
      babyId: targetBabyId,
    });
    setBusyId(null);
    if (ok) {
      setRecommended((prev) => new Set(prev).add(item.id));
      setMsg(`✅ 已推荐《${item.title}》，家长端将同步显示`);
    } else {
      setMsg("⚠️ 推荐失败（云端不可用，稍后重试）");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-800">推荐学习内容给家长</h2>
        <p className="text-sm text-gray-400">挑选一条学习内容，推送给家长端同步展示，家长可直接「去学习 / 去练习」。</p>
      </div>

      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 space-y-2">
        <label className="text-xs font-semibold text-gray-600">推荐语（可选，会一并同步给家长）</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如：本周重点练「苹果」，建议每天跟读 3 次～"
          className="w-full h-16 rounded-lg bg-gray-50 border border-gray-200 p-2.5 text-sm text-gray-700 resize-none focus:outline-none focus:border-indigo-300"
        />
      </div>

      {babies.length > 0 && (
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">推荐给</label>
          <select
            value={targetBabyId ?? ""}
            onChange={(e) => setTargetBabyId(e.target.value || null)}
            className="flex-1 text-sm rounded-lg border border-gray-200 px-2.5 py-1.5 bg-gray-50 text-gray-700 focus:outline-none focus:border-indigo-300"
          >
            {babies.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm border border-gray-100">
        <span className="text-base">🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索内容…"
          className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none"
        />
      </div>

      {msg && <p className="text-xs text-center text-gray-500">{msg}</p>}

      <div className="space-y-2">
        {list.map((item) => {
          const c = getCategory(item.category);
          const f = getFormat(item.format);
          const done = recommended.has(item.id);
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{item.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{item.summary}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${c.color}1a`, color: c.color }}>
                    {c.name}
                  </span>
                  <span className="text-[10px] text-gray-400">{f.emoji} {f.name}</span>
                </div>
              </div>
              <button
                disabled={done || busyId === item.id}
                onClick={() => handleRecommend(item)}
                className={`text-xs font-semibold px-3 py-2 rounded-full active:scale-95 whitespace-nowrap ${
                  done
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    : "bg-indigo-500 text-white hover:bg-indigo-600"
                } disabled:opacity-60`}
              >
                {done ? "✅ 已推荐" : busyId === item.id ? "推荐中…" : "推荐"}
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
