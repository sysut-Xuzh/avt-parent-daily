"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChannelId, PostType, PublishInput } from "@/data/community";
import { CURRENT_STAGE_LABEL } from "@/data/community";

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  onPublish: (input: PublishInput) => void;
  todayTask?: string; // 今日训练任务（快捷关联）
}

const TOPICS: { tag: string; channel: Exclude<ChannelId, "recommend"> }[] = [
  { tag: "训练打卡", channel: "checkin" },
  { tag: "经验分享", channel: "checkin" },
  { tag: "设备养护", channel: "device" },
  { tag: "心情树洞", channel: "mood" },
  { tag: "融合准备", channel: "integrate" },
  { tag: "问答", channel: "qa" },
  { tag: "听觉训练", channel: "checkin" },
];

type Format = "text" | "image" | "video";

export default function PublishModal({ open, onClose, onPublish, todayTask }: PublishModalProps) {
  const [step, setStep] = useState(1);
  const [format, setFormat] = useState<Format>("text");
  const [relatedTask, setRelatedTask] = useState<string | undefined>(undefined);
  const [text, setText] = useState("");
  const [mediaCount, setMediaCount] = useState(3);
  const [topics, setTopics] = useState<string[]>([]);
  const [allowComment, setAllowComment] = useState(true);
  const [allowShare, setAllowShare] = useState(true);

  const reset = () => {
    setStep(1);
    setFormat("text");
    setRelatedTask(undefined);
    setText("");
    setMediaCount(3);
    setTopics([]);
    setAllowComment(true);
    setAllowShare(true);
  };

  const close = () => { reset(); onClose(); };

  const toggleTopic = (t: string) => {
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const doPublish = () => {
    const firstTopic = topics[0];
    const channel = (TOPICS.find((t) => t.tag === firstTopic)?.channel) || (relatedTask ? "checkin" : "mood");
    const type: PostType = relatedTask || channel === "checkin" ? "checkin" : channel === "qa" ? "qa" : "experience";
    onPublish({
      type,
      channel,
      text: text.trim(),
      format,
      mediaCount: format === "image" ? mediaCount : 0,
      tags: topics.length ? topics : [relatedTask ? "今日训练打卡" : "经验分享"],
      relatedTask,
    });
    reset();
  };

  const canNext = step === 1 ? !!format : step === 2 ? text.trim().length > 0 : true;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={close}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <button onClick={close} className="text-gray-400 text-sm">取消</button>
              <h3 className="text-sm font-bold text-gray-700">发布到康复圈</h3>
              <button
                disabled={step === 1}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="text-indigo-500 text-sm disabled:opacity-30"
              >
                上一步
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* 步骤1：选择类型 */}
              {step === 1 && (
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-3">你想分享什么？</p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { f: "text", icon: "📝", label: "文字" },
                      { f: "image", icon: "🖼️", label: "图文" },
                      { f: "video", icon: "🎬", label: "短视频" },
                    ] as { f: Format; icon: string; label: string }[]).map((o) => (
                      <button
                        key={o.f}
                        onClick={() => setFormat(o.f)}
                        className={`flex flex-col items-center gap-1 py-4 rounded-2xl border transition-all active:scale-95 ${
                          format === o.f ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white"
                        }`}
                      >
                        <span className="text-2xl">{o.icon}</span>
                        <span className="text-xs text-gray-600">{o.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* 快捷关联今日训练 */}
                  <p className="text-xs font-semibold text-gray-500 mt-5 mb-2">快捷关联</p>
                  {todayTask ? (
                    <button
                      onClick={() => setRelatedTask(relatedTask ? undefined : todayTask)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        relatedTask ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600"
                      }`}
                    >
                      <span>📅 今日训练：{todayTask}</span>
                      <span>{relatedTask ? "✓" : "+"}</span>
                    </button>
                  ) : (
                    <p className="text-xs text-gray-400">今日还没有训练任务可关联</p>
                  )}
                </div>
              )}

              {/* 步骤2：编辑内容 */}
              {step === 2 && (
                <div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, 300))}
                    placeholder="写点什么…（最多300字）"
                    className="w-full h-32 bg-gray-50 border border-gray-200 rounded-2xl p-3 text-sm outline-none resize-none focus:border-indigo-300"
                  />
                  <p className="text-right text-[10px] text-gray-400 mt-1">{text.length}/300</p>

                  {format === "image" && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1.5">添加图片（原型占位）</p>
                      <div className="flex gap-2">
                        {[1, 3, 6, 9].map((n) => (
                          <button
                            key={n}
                            onClick={() => setMediaCount(n)}
                            className={`w-10 h-10 rounded-xl border text-sm ${mediaCount === n ? "border-indigo-400 bg-indigo-50 text-indigo-600" : "border-gray-200 text-gray-500"}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs font-semibold text-gray-500 mt-4 mb-2">添加话题（至少选1个）</p>
                  <div className="flex flex-wrap gap-2">
                    {TOPICS.map((t) => (
                      <button
                        key={t.tag}
                        onClick={() => toggleTopic(t.tag)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          topics.includes(t.tag) ? "border-indigo-400 bg-indigo-50 text-indigo-600" : "border-gray-200 text-gray-500"
                        }`}
                      >
                        #{t.tag}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-gray-500 mt-4 mb-1">康复阶段标签</p>
                  <div className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-600">
                    {CURRENT_STAGE_LABEL}（自动，可代表宝宝当前阶段）
                  </div>
                </div>
              )}

              {/* 步骤3：预览与发布 */}
              {step === 3 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">预览效果</p>
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-50 rounded-full w-9 h-9 flex items-center justify-center text-lg">🙂</div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">我</p>
                        <p className="text-[10px] text-gray-400">{CURRENT_STAGE_LABEL} · 刚刚</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-line leading-relaxed">{text || "（未填写内容）"}</p>
                    {format === "image" && mediaCount > 0 && (
                      <div className="grid grid-cols-3 gap-1.5 mt-2">
                        {Array.from({ length: Math.min(mediaCount, 3) }).map((_, i) => (
                          <div key={i} className="aspect-square rounded-lg bg-indigo-100" />
                        ))}
                      </div>
                    )}
                    {format === "video" && (
                      <div className="mt-2 aspect-video rounded-lg bg-indigo-100 flex items-center justify-center text-2xl">▶</div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(topics.length ? topics : [relatedTask ? "今日训练打卡" : "经验分享"]).map((t, i) => (
                        <span key={i} className="text-[11px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">#{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className="flex items-center justify-between text-sm text-gray-600">
                      <span>允许评论</span>
                      <input type="checkbox" checked={allowComment} onChange={(e) => setAllowComment(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
                    </label>
                    <label className="flex items-center justify-between text-sm text-gray-600">
                      <span>允许转发</span>
                      <input type="checkbox" checked={allowShare} onChange={(e) => setAllowShare(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
                    </label>
                    <label className="flex items-center justify-between text-sm text-gray-600">
                      <span>同步到成长日历</span>
                      <input type="checkbox" checked={true} readOnly className="w-4 h-4 accent-indigo-500" />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="p-4 border-t border-gray-100">
              {step < 3 ? (
                <button
                  disabled={!canNext}
                  onClick={() => setStep((s) => s + 1)}
                  className="w-full py-3 rounded-2xl bg-indigo-500 text-white font-bold text-sm disabled:opacity-40 active:scale-[0.98]"
                >
                  下一步
                </button>
              ) : (
                <button
                  onClick={doPublish}
                  className="w-full py-3 rounded-2xl bg-indigo-500 text-white font-bold text-sm active:scale-[0.98]"
                >
                  发布
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
