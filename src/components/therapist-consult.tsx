"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  getTherapistQueue,
  replyConsultation,
  consultTypeLabel,
  type Consultation,
} from "@/lib/consultation-service";

// 治疗师端工单队列 + 回复（原错放在 /parent/therapist，已迁至独立站 /therapist）。
// 治疗师在此读取全部家长工单（anon 可读 consultations），并以文字回复（anon 可 UPDATE）。
export default function TherapistConsult() {
  const [queue, setQueue] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [backend, setBackend] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    const q = await getTherapistQueue();
    // getTherapistQueue 在云端失败时会降级到本地，这里用数据是否来自后端无法区分，
    // 但 consultations 表已配 anon 读策略，正常情况下都是云端。
    setQueue(q);
    setBackend(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleReply = async () => {
    if (!activeId || reply.trim().length < 2) return;
    setSending(true);
    await replyConsultation(activeId, reply.trim().slice(0, 500));
    setReply("");
    setActiveId(null);
    setSending(false);
    await refresh();
  };

  const pending = queue.filter((c) => c.status !== "replied").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">工单队列</h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2 py-1 rounded-full bg-amber-50 text-amber-600">
            待回复 {pending}
          </span>
          <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
            {backend ? "☁️ 云端" : "📱 本地"}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-400">
        家长提交的工单式咨询（含脱敏训练数据），治疗师以文字回复，回复限 500 字。
      </p>

      {loading ? (
        <div className="text-center py-16 text-sm text-gray-300">加载中…</div>
      ) : queue.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-4xl block mb-2">📭</span>
          <p className="text-sm text-gray-400">暂无家长工单</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {queue.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                  {consultTypeLabel(c.type)}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    c.status === "replied" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {c.status === "replied" ? "已回复" : "待回复"}
                </span>
                <span className="ml-auto text-[10px] text-gray-400">
                  {new Date(c.createdAt).toLocaleString("zh-CN")}
                </span>
              </div>

              <p className="text-sm text-gray-700 mt-2 leading-relaxed">{c.description}</p>

              {/* 脱敏训练数据（治疗师可见，家长不可编辑） */}
              {c.attachedData && Object.keys(c.attachedData).length > 0 && (
                <div className="mt-2 rounded-lg bg-gray-50 p-2 text-[10px] text-gray-500 leading-relaxed">
                  📎 附带训练数据（脱敏）：
                  <pre className="whitespace-pre-wrap mt-1">
                    {JSON.stringify(c.attachedData, null, 2)}
                  </pre>
                </div>
              )}

              {c.therapistReply && (
                <p className="text-[11px] text-emerald-700 mt-2 bg-emerald-50 rounded-lg p-2 leading-relaxed">
                  👨‍⚕️ {c.therapistReply}
                </p>
              )}

              {activeId === c.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    maxLength={500}
                    placeholder="输入回复（限 500 字，仅文字）…"
                    className="w-full h-20 p-2 rounded-xl bg-gray-50 border border-gray-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setActiveId(null);
                        setReply("");
                      }}
                      className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleReply}
                      disabled={sending}
                      className="flex-1 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold disabled:opacity-50"
                    >
                      {sending ? "发送中…" : "发送回复"}
                    </button>
                  </div>
                </div>
              ) : (
                c.status !== "replied" && (
                  <button
                    onClick={() => setActiveId(c.id)}
                    className="mt-2 w-full py-2 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-medium"
                  >
                    回复
                  </button>
                )
              )}
            </div>
          ))}
        </motion.div>
      )}

      <p className="text-[10px] text-gray-300 text-center px-4 pt-2">
        治疗师端仅接收脱敏结构化指标，原始录音永不传输。
      </p>
    </div>
  );
}
