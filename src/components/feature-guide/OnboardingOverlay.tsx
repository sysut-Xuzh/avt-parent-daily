"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ONBOARDING_STEPS, type ScreenKey } from "@/lib/guide-content";

/**
 * 首次登录引导浮层（方案：地铁跑酷式「边做边学」）
 * - 全屏遮罩 + 手机界面示意 + 引导气泡
 * - 进度条 / 跳过 / 下一步
 * - 每步约 <10 秒，总时长 ~60 秒
 */

function PhoneScreen({ screen }: { screen: ScreenKey }) {
  // 通用手机外壳
  const Shell = ({ children, accent = "#6366f1" }: { children: React.ReactNode; accent?: string }) => (
    <div className="w-[230px] h-[440px] bg-white rounded-[34px] border-[10px] border-gray-900 shadow-2xl overflow-hidden flex flex-col">
      <div className="h-6 bg-gray-900 flex items-center justify-center shrink-0">
        <div className="w-16 h-1.5 rounded-full bg-gray-700" />
      </div>
      <div className="flex-1 flex flex-col" style={{ background: "#f8fafc" }}>
        {children}
      </div>
      <div className="h-1.5 bg-gray-900 flex items-center justify-center shrink-0">
        <div className="w-12 h-1 rounded-full bg-gray-700" />
      </div>
      <span className="hidden">{accent}</span>
    </div>
  );

  const Bar = ({ w = "100%", h = 10, c = "#e2e8f0", r = 6 }: { w?: string; h?: number; c?: string; r?: number }) => (
    <div style={{ width: w, height: h, background: c, borderRadius: r }} />
  );
  const Header = ({ icon, title }: { icon: string; title: string }) => (
    <div className="px-3 py-2.5 bg-white border-b border-gray-100 flex items-center gap-2 shrink-0">
      <span className="text-base">{icon}</span>
      <span className="text-[13px] font-bold text-gray-700">{title}</span>
    </div>
  );
  const Card = ({ children, ring }: { children: React.ReactNode; ring?: boolean }) => (
    <div
      className={`mx-2.5 my-2 rounded-xl bg-white p-2.5 shadow-sm border ${ring ? "border-amber-400 ring-2 ring-amber-300" : "border-gray-100"}`}
    >
      {children}
    </div>
  );

  switch (screen) {
    case "welcome":
      return (
        <Shell>
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3" style={{ background: "linear-gradient(160deg,#eef2ff,#faf5ff)" }}>
            <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center text-3xl shadow-lg">🤖</div>
            <p className="text-base font-extrabold text-indigo-900">AI 康复助手</p>
            <p className="text-[11px] text-indigo-500/80 leading-relaxed">陪您和孩子一起，把每一次练习都变得简单</p>
            <div className="mt-2 px-3 py-1 rounded-full bg-white/70 text-[10px] text-indigo-400">1 分钟带您了解核心功能</div>
          </div>
        </Shell>
      );
    case "tasks":
      return (
        <Shell>
          <Header icon="📋" title="今日任务" />
          <div className="flex-1 pt-1">
            <Card ring>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-gray-700">🌅 早餐时光</p>
                <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">进行中</span>
              </div>
              <Bar w="70%" h={6} c="#e2e8f0" />
            </Card>
            <Card>
              <p className="text-[11px] font-bold text-gray-700">🎮 听觉游戏</p>
              <Bar w="55%" h={6} c="#e2e8f0" />
            </Card>
            <Card>
              <p className="text-[11px] font-bold text-gray-700">🛁 洗澡儿歌</p>
              <Bar w="60%" h={6} c="#e2e8f0" />
            </Card>
          </div>
          <div className="px-3 py-2 bg-white border-t border-gray-100 flex justify-around text-[9px] text-gray-400">
            <span className="text-indigo-500 font-bold">📋 今日任务</span>
            <span>🎧</span><span>📚</span><span>💬</span><span>⚙️</span>
          </div>
        </Shell>
      );
    case "taskCard":
      return (
        <Shell>
          <Header icon="📋" title="今日任务" />
          <div className="flex-1 pt-1">
            <Card ring>
              <p className="text-[11px] font-bold text-gray-700">🌅 早餐时光</p>
              <p className="text-[9px] text-gray-400 mt-0.5">让孩子跟读「爸爸 / 妈妈」</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center text-white text-sm">▶</div>
                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-white text-sm ring-2 ring-amber-300">🎙️</div>
              </div>
            </Card>
            <Card>
              <p className="text-[10px] text-gray-500">完成后自动打卡，点 🎙️ 录音评参与度</p>
            </Card>
          </div>
        </Shell>
      );
    case "hearing":
      return (
        <Shell>
          <Header icon="🎧" title="听力测试" />
          <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-2xl">🔊</div>
            <p className="text-[11px] font-bold text-gray-700">点击你听到的声音</p>
            <div className="grid grid-cols-2 gap-2 w-full mt-1">
              <div className="rounded-lg bg-white border border-gray-100 py-2 text-center text-lg">🐶</div>
              <div className="rounded-lg bg-white border border-gray-100 py-2 text-center text-lg">🚗</div>
              <div className="rounded-lg bg-white border border-gray-100 py-2 text-center text-lg">🔔</div>
              <div className="rounded-lg bg-white border border-gray-100 py-2 text-center text-lg">🐱</div>
            </div>
          </div>
        </Shell>
      );
    case "learning":
      return (
        <Shell>
          <Header icon="📚" title="每日学习" />
          <div className="flex-1 pt-1">
            <div className="flex gap-1 px-2.5 mb-1 flex-wrap">
              {["听觉", "言语", "语言", "认知"].map((t) => (
                <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500">{t}</span>
              ))}
            </div>
            <Card>
              <p className="text-[11px] font-bold text-gray-700">📖 如何在家做听觉训练</p>
              <Bar w="80%" h={6} c="#e2e8f0" />
            </Card>
            <Card ring>
              <p className="text-[11px] font-bold text-gray-700">🎯 拟声词游戏</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[9px] text-amber-600">带孩子一起练</span>
                <span className="text-[9px] text-white bg-amber-500 px-2 py-0.5 rounded-full">去练习 ›</span>
              </div>
            </Card>
          </div>
        </Shell>
      );
    case "community":
      return (
        <Shell>
          <Header icon="💬" title="康复圈" />
          <div className="flex-1 pt-1">
            <Card>
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-xs">🐰</span>
                <p className="text-[10px] font-bold text-gray-700">豆豆妈</p>
              </div>
              <p className="text-[9px] text-gray-500 mt-1">今天孩子主动说了「苹果」！</p>
              <div className="flex gap-2 mt-1 text-[9px] text-gray-400"><span>❤️ 12</span><span>💬 3</span></div>
            </Card>
            <Card>
              <p className="text-[10px] text-gray-600">＋ 记录孩子的进步瞬间 / 向社区提问</p>
            </Card>
          </div>
        </Shell>
      );
    case "profile":
      return (
        <Shell>
          <Header icon="⚙️" title="我的" />
          <div className="flex-1 px-3 pt-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl">🐰</div>
              <div>
                <p className="text-[11px] font-bold text-gray-700">张妈妈</p>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500">主要照护人</span>
              </div>
            </div>
            {[
              ["🎓", "功能导览", "NEW", true],
              ["📊", "训练记录", "", false],
              ["💬", "联系治疗师", "", false],
              ["⚙️", "设置", "", false],
            ].map(([ic, label, badge, hl]) => (
              <div key={label as string} className={`flex items-center gap-2 my-1.5 rounded-lg px-2 py-1.5 bg-white border ${hl ? "border-indigo-300 ring-2 ring-indigo-200" : "border-gray-100"}`}>
                <span className="text-sm">{ic as string}</span>
                <span className="text-[10px] text-gray-600 flex-1">{label as string}</span>
                {badge && <span className="text-[8px] text-white bg-red-500 px-1.5 py-0.5 rounded-full">NEW</span>}
              </div>
            ))}
          </div>
        </Shell>
      );
    case "done":
      return (
        <Shell>
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-2" style={{ background: "linear-gradient(160deg,#ecfdf5,#eff6ff)" }}>
            <div className="text-5xl">🥇</div>
            <p className="text-sm font-extrabold text-emerald-700">导览完成！</p>
            <p className="text-[10px] text-emerald-600/80 leading-relaxed">首周计划已生成，您和孩子都很棒 🎉</p>
          </div>
        </Shell>
      );
    default:
      return <Shell><div /></Shell>;
  }
}

export default function OnboardingOverlay({
  open,
  onDone,
}: {
  open: boolean;
  onDone: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const step = ONBOARDING_STEPS[idx];
  const total = ONBOARDING_STEPS.length;
  const isLast = idx === total - 1;

  const next = () => {
    if (isLast) onDone();
    else setIdx((i) => i + 1);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/70 px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 进度条 + 跳过 */}
          <div className="w-full max-w-[300px] flex items-center gap-2 mb-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/25 overflow-hidden">
              <motion.div
                className="h-full bg-indigo-400 rounded-full"
                animate={{ width: `${((idx + 1) / total) * 100}%` }}
                transition={{ type: "spring", damping: 20 }}
              />
            </div>
            <button onClick={onDone} className="text-[11px] text-white/70 underline whitespace-nowrap">
              跳过引导
            </button>
          </div>

          <p className="text-[11px] text-white/60 mb-2">步骤 {idx + 1} / {total}</p>

          {/* 手机示意 */}
          <PhoneScreen screen={step.key} />

          {/* 引导气泡 */}
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 w-full max-w-[300px] bg-white rounded-2xl p-4 shadow-xl"
          >
            <p className="text-sm font-extrabold text-gray-800">{step.title}</p>
            <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{step.bubble}</p>
            <button
              onClick={next}
              className="mt-3 w-full py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold active:scale-95"
            >
              {isLast ? "开始康复之旅 🚀" : "下一步 ›"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
