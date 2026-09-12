"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/bottom-nav";
import { bottomTabs } from "@/data/mock-data";
import type { TabId } from "@/types";
import {
  submitConsultation,
  getMyConsultations,
  consultTypeLabel,
  type ConsultType,
  type Consultation,
} from "@/lib/consultation-service";

const TYPES: { id: ConsultType; label: string }[] = [
  { id: "method", label: "训练方法疑问" },
  { id: "uncooperative", label: "孩子不配合怎么办" },
  { id: "result", label: "测评结果看不懂" },
  { id: "other", label: "其他" },
];

export default function ConsultPage() {
  const router = useRouter();
  const [type, setType] = useState<ConsultType>("method");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [mine, setMine] = useState<Consultation[]>([]);
  const [backend, setBackend] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getMyConsultations().then((r) => {
      setMine(r.items);
      setBackend(r.backend);
    });
  }, []);

  const handleSubmit = async () => {
    if (desc.trim().length < 2) {
      setToast("请先描述你的问题（至少 2 个字）");
      return;
    }
    setSubmitting(true);
    const res = await submitConsultation(type, desc.trim());
    setSubmitting(false);
    if (res.ok) {
      setToast(res.backend ? "✅ 已提交，治疗师将在 24 小时内回复" : "✅ 已提交（本地演示模式）");
      setDesc("");
      const r = await getMyConsultations();
      setMine(r.items);
    } else {
      setToast("❌ 提交失败");
    }
  };

  const handleTabChange = (tab: TabId) => {
    if (tab === "profile") router.push("/parent/settings");
    else if (tab === "hearing") router.push("/parent/hearing-test");
    else if (tab === "learning") router.push("/parent/daily-learning");
    else if (tab === "community") router.push("/parent/community");
    else router.push("/parent");
  };

  if (!mounted) return <div className="min-h-screen bg-gray-50" />;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 md:px-6 pt-5">
        <div className="md:max-w-2xl md:mx-auto">
          <button onClick={() => router.back()} className="text-xs text-gray-400 mb-2">‹ 返回</button>
          <h1 className="text-xl font-extrabold text-gray-800">💬 问治疗师</h1>
          <p className="text-xs text-gray-500 mt-1">
            工单式结构化咨询，治疗师回复限 500 字文字，不收图片/语音/视频，保护隐私。
          </p>

          {/* 提问表单 */}
          <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 space-y-3">
            <p className="text-sm font-bold text-gray-700">选择问题类型</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                    type === t.id
                      ? "bg-indigo-500 text-white border-indigo-500"
                      : "bg-gray-50 text-gray-600 border-gray-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={200}
              placeholder="用 200 字内描述你的情况，系统会自动附带最近 3 天训练数据供治疗师参考…"
              className="w-full h-28 p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">{desc.length}/200 字 · 已自动附带训练数据</span>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-indigo-500 text-white text-sm font-bold disabled:opacity-50 active:scale-95 transition-all"
              >
                {submitting ? "提交中…" : "提交工单"}
              </button>
            </div>
            {toast && <p className="text-[11px] text-center text-indigo-600">{toast}</p>}
          </div>

          {/* 我的工单 */}
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-700">我的工单（{mine.length}）</h2>
              <span className="text-[10px] text-gray-400">{backend ? "☁️ 云端" : "📱 本地"}</span>
            </div>
            {mine.length === 0 ? (
              <p className="text-[11px] text-gray-400 py-3 text-center">还没有提交过工单</p>
            ) : (
              <ul className="space-y-2">
                {mine.map((c) => (
                  <li key={c.id} className="py-2 border-b border-gray-50 last:border-0">
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
                    </div>
                    <p className="text-xs text-gray-700 mt-1 leading-relaxed">{c.description}</p>
                    {c.therapistReply && (
                      <p className="text-[11px] text-emerald-700 mt-1 bg-emerald-50 rounded-lg p-2 leading-relaxed">
                        👨‍⚕️ {c.therapistReply}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <BottomNav activeTab="community" onTabChange={handleTabChange} tabs={bottomTabs} />
    </div>
  );
}
