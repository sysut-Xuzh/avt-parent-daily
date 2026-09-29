"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// 建议信箱组件：
// - asCard=true：作为设置页的一张可点击卡片（手动打开）
// - auto=true：页面挂载后若距上次 ≥30 天则自动弹出（每月提醒一次）
// 提交时写云端 /api/feedback，同时 localStorage 留一份备份

const LS_LAST_PROMPT = "avt_feedback_last_prompt";
const LS_BACKUP = "avt_feedback_backup";
const QUICK_TAGS = ["好用", "卡顿", "听不清", "内容棒", "想加功能", "界面好看"];

const FEATURES = [
  { key: "rating_task", label: "任务布置" },
  { key: "rating_practice", label: "语音练习·陪练" },
  { key: "rating_hearing", label: "听力测试" },
] as const;

function StarRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className={`text-2xl leading-none ${
            n <= (hover || value) ? "text-amber-400" : "text-gray-300"
          }`}
          aria-label={`${n} 星`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function FeedbackWidget({
  auto = false,
  asCard = false,
}: {
  auto?: boolean;
  asCard?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [overall, setOverall] = useState(0);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!auto) return;
    try {
      const last = Number(localStorage.getItem(LS_LAST_PROMPT) || "0");
      if (!last || Date.now() - last > 30 * 24 * 3600 * 1000) {
        setOpen(true);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const close = () => {
    setOpen(false);
    setDone(false);
  };

  const submit = async () => {
    if (overall < 1) {
      alert("请先给整体满意度评分");
      return;
    }
    setSending(true);
    const payload = {
      overall_star: overall,
      rating_task: ratings["rating_task"] || null,
      rating_practice: ratings["rating_practice"] || null,
      rating_hearing: ratings["rating_hearing"] || null,
      comment,
      tags,
    };
    // 本地备份（即使网络失败也不丢）
    try {
      localStorage.setItem(LS_BACKUP, JSON.stringify({ ...payload, at: Date.now() }));
    } catch {
      /* ignore */
    }
    try {
      const { getSupabaseBrowser } = await import("@/lib/supabase");
      const supabase = getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.success) {
        try {
          localStorage.setItem(LS_LAST_PROMPT, String(Date.now()));
        } catch {
          /* ignore */
        }
        setDone(true);
        setTimeout(close, 1500);
      } else {
        alert(d.error || "提交失败");
      }
    } catch {
      alert("网络错误，已为你本地留存，稍后可重试");
    } finally {
      setSending(false);
    }
  };

  const trigger = asCard ? (
    <button
      onClick={() => setOpen(true)}
      className="w-full flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-indigo-100 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">💌</span>
        <div className="text-left">
          <p className="text-sm font-bold text-gray-700">建议信箱</p>
          <p className="text-[11px] text-gray-400 mt-0.5">说说你的使用感受，直达开发团队</p>
        </div>
      </div>
      <span className="text-gray-300 text-sm">›</span>
    </button>
  ) : null;

  return (
    <>
      {trigger}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={close}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-2">💌</div>
                <p className="text-sm font-bold text-gray-700">感谢你的反馈！</p>
                <p className="text-[11px] text-gray-400 mt-1">我们已经收到，会认真阅读</p>
              </div>
            ) : (
              <>
                <h2 className="text-base font-bold text-gray-800 mb-1">💌 建议信箱</h2>
                <p className="text-xs text-gray-400 mb-4">
                  你的建议会直达开发团队，帮助我们做得更好
                </p>

                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-1">整体满意度</p>
                  <StarRow value={overall} onChange={setOverall} />
                </div>

                {FEATURES.map((f) => (
                  <div key={f.key} className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">{f.label}</span>
                    <StarRow
                      value={ratings[f.key] || 0}
                      onChange={(v) => setRatings((r) => ({ ...r, [f.key]: v }))}
                    />
                  </div>
                ))}

                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-1">想对我们说</p>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="使用感受、想要的功能、遇到的问题…"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                <div className="mb-4 flex flex-wrap gap-1.5">
                  {QUICK_TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setTags((prev) =>
                          prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                        )
                      }
                      className={`text-[11px] px-2 py-1 rounded-full border ${
                        tags.includes(t)
                          ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                          : "text-gray-400 border-gray-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <button
                  onClick={submit}
                  disabled={sending}
                  className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {sending ? "发送中…" : "发送建议"}
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}
