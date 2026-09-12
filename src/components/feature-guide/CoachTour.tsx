"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * 游戏式「手把手指哪点哪」强制引导引擎（依据《录音识别与内容扩展》方案 1.1~1.3）
 * - 手机界面示意 + 高亮按钮（脉冲光圈）+ SVG 箭头精确指向按钮几何中心
 * - 强制点击：只有点中高亮按钮才进入下一步；点别处 → 光圈抖动 + 「请点这里」提示
 * - 顶部进度条 / 跳过（欢迎页除外）/ 自动流转
 */

export type MockScreen =
  | "welcome"
  | "tasks"
  | "taskCard"
  | "hearing"
  | "learning"
  | "community"
  | "profile"
  | "done"
  | "recIdle"
  | "recRecorded"
  | "recResult";

export interface CoachStep {
  screen: MockScreen;
  /** 该步骤在示意界面中需要被点中的按钮（对应 mock 内的 data-mock-btn） */
  highlight: string;
  title: string;
  bubble: React.ReactNode;
}

// ───────────────────────────────────────────────────────────
// 步骤定义
// ───────────────────────────────────────────────────────────

export const FIRST_LOGIN_TOUR: CoachStep[] = [
  {
    screen: "welcome",
    highlight: "start",
    title: "欢迎使用 AI 康复助手",
    bubble: (
      <>接下来用 <b>1 分钟</b>，像玩游戏一样带你完成第一次训练。点下面的按钮开始吧！</>
    ),
  },
  {
    screen: "taskCard",
    highlight: "mic",
    title: "① 找到任务里的 🎙️",
    bubble: (
      <>每天在「今日任务」里，点这个 <b>🎙️ 麦克风按钮</b>，给孩子录一段跟读，评估参与度。</>
    ),
  },
  {
    screen: "recIdle",
    highlight: "record",
    title: "② 按住红色按钮录音",
    bubble: (
      <>看到题目「苹果」后，<b>按住红色按钮</b>，让孩子大声跟读，说完松手。</>
    ),
  },
  {
    screen: "recRecorded",
    highlight: "replay",
    title: "③ 回放确认",
    bubble: (
      <>录音完成后，点 <b>「回放确认」</b> 听一遍，确认是孩子独立完成的。</>
    ),
  },
  {
    screen: "recRecorded",
    highlight: "submit",
    title: "④ 提交分析",
    bubble: (
      <>确认无误后，点 <b>「提交分析」</b> 保存成绩，解锁下一个任务！</>
    ),
  },
  {
    screen: "recResult",
    highlight: "done",
    title: "⑤ 完成 ✓",
    bubble: (
      <>太棒了！评分已记录。点 <b>「完成」</b> 返回首页，继续今天的计划。</>
    ),
  },
  {
    screen: "done",
    highlight: "enter",
    title: "🎉 首次训练完成！",
    bubble: (
      <>首周计划已生成，您和孩子都很棒！点 <b>「进入首页」</b> 开启康复之旅 🚀</>
    ),
  },
];

// 各模块「重新演示」用的精简步骤
export const MODULE_TOURS: Record<string, CoachStep[]> = {
  tasks: [
    { screen: "taskCard", highlight: "mic", title: "今日任务 · 录音评估", bubble: <>点任务里的 <b>🎙️</b> 给孩子录音，AI 评估参与度并打卡。</> },
    { screen: "recIdle", highlight: "record", title: "按住录音", bubble: <>看到题目后，<b>按住红色按钮</b>让孩子跟读。</> },
    { screen: "recRecorded", highlight: "submit", title: "提交分析", bubble: <>点 <b>「提交分析」</b> 保存 ⭐ 评分。</> },
    { screen: "recResult", highlight: "done", title: "完成", bubble: <>点 <b>「完成」</b> 记录本次成绩。</> },
  ],
  hearing: [
    { screen: "hearing", highlight: "play", title: "听力测试 · 点声音", bubble: <>每周做一次测评：<b>点击你听到的声音</b>，像玩游戏一样完成。</> },
    { screen: "done", highlight: "enter", title: "完成测评", bubble: <>完成后出雷达图报告，红色区域是待加强方向。</> },
  ],
  learning: [
    { screen: "learning", highlight: "goPractice", title: "每日学习 · 去练习", bubble: <>学完理论，点 <b>「带孩子一起练」</b> 立刻实践。</> },
    { screen: "recIdle", highlight: "record", title: "跟读练习", bubble: <>进入声线实验室，<b>按住录音</b>跟读几个词。</> },
  ],
  community: [
    { screen: "community", highlight: "post", title: "康复圈 · 发布", bubble: <>记录孩子的进步瞬间，或向社区提问：点 <b>「＋ 发布」</b>。</> },
    { screen: "done", highlight: "enter", title: "互动", bubble: <>给其他家长点赞、留言，一起抱团。</> },
  ],
  recording: [
    { screen: "recIdle", highlight: "record", title: "录音 · 按住", bubble: <>看到题目后，<b>按住红色按钮</b>让孩子跟读。</> },
    { screen: "recRecorded", highlight: "replay", title: "回放确认", bubble: <>点 <b>「回放确认」</b> 听一遍。</> },
    { screen: "recRecorded", highlight: "submit", title: "提交分析", bubble: <>点 <b>「提交分析」</b> 出 ⭐ 星级。</> },
    { screen: "recResult", highlight: "done", title: "完成", bubble: <>点 <b>「完成」</b> 保存评分。</> },
  ],
  therapist: [
    { screen: "profile", highlight: "contact", title: "联系治疗师", bubble: <>在「我的」点 <b>「联系治疗师」</b>，200 字内描述问题。</> },
    { screen: "done", highlight: "enter", title: "查看回复", bubble: <>治疗师回复后会横幅提醒，点开即可查看。</> },
  ],
};

// ───────────────────────────────────────────────────────────
// 手机示意界面（复用既有视觉语言，高亮按钮带 data-mock-btn）
// ───────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[232px] h-[440px] bg-white rounded-[34px] border-[10px] border-gray-900 shadow-2xl overflow-hidden flex flex-col">
      <div className="h-6 bg-gray-900 flex items-center justify-center shrink-0">
        <div className="w-16 h-1.5 rounded-full bg-gray-700" />
      </div>
      <div className="flex-1 flex flex-col bg-[#f8fafc] overflow-hidden">{children}</div>
      <div className="h-1.5 bg-gray-900 flex items-center justify-center shrink-0">
        <div className="w-12 h-1 rounded-full bg-gray-700" />
      </div>
    </div>
  );
}

function Bar({ w = "100%", h = 6, c = "#e2e8f0" }: { w?: string; h?: number; c?: string }) {
  return <div style={{ width: w, height: h, background: c, borderRadius: 6 }} />;
}
function Header({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="px-3 py-2.5 bg-white border-b border-gray-100 flex items-center gap-2 shrink-0">
      <span className="text-base">{icon}</span>
      <span className="text-[13px] font-bold text-gray-700">{title}</span>
    </div>
  );
}
function Card({ children, ring }: { children: React.ReactNode; ring?: boolean }) {
  return (
    <div className={`mx-2.5 my-2 rounded-xl bg-white p-2.5 shadow-sm border ${ring ? "border-amber-400 ring-2 ring-amber-300" : "border-gray-100"}`}>
      {children}
    </div>
  );
}

/** 把高亮按钮包一层相对定位 + 脉冲光圈 */
function Hot({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span className="relative inline-flex">
      <motion.span
        className="pointer-events-none absolute -inset-2 rounded-2xl border-[3px] border-[#4F8CFF]"
        style={{ boxShadow: "0 0 0 4px rgba(79,140,255,0.25), 0 0 22px rgba(79,140,255,0.45)" }}
        animate={{ scale: [1, 1.12, 1], opacity: [1, 0.6, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <span data-mock-btn={id}>{children}</span>
    </span>
  );
}

function MockPhone({ screen, highlight }: { screen: MockScreen; highlight: string }) {
  switch (screen) {
    case "welcome":
      return (
        <Shell>
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3" style={{ background: "linear-gradient(160deg,#eef2ff,#faf5ff)" }}>
            <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center text-3xl shadow-lg">🤖</div>
            <p className="text-base font-extrabold text-indigo-900">AI 康复助手</p>
            <p className="text-[11px] text-indigo-500/80 leading-relaxed">陪您和孩子一起，把每一次练习都变得简单</p>
            <div className="mt-2 px-3 py-1 rounded-full bg-white/70 text-[10px] text-indigo-400">1 分钟带您了解核心功能</div>
            <div className="mt-3">
              <Hot id="start">
                <button className="px-5 py-2.5 rounded-full bg-indigo-500 text-white text-sm font-bold active:scale-95">开始体验 🚀</button>
              </Hot>
            </div>
          </div>
        </Shell>
      );
    case "tasks":
      return (
        <Shell>
          <Header icon="📋" title="今日任务" />
          <div className="flex-1 pt-1">
            <Card ring>
              <p className="text-[11px] font-bold text-gray-700">🌅 早餐时光</p>
              <Bar w="70%" />
            </Card>
            <Card><p className="text-[11px] font-bold text-gray-700">🎮 听觉游戏</p><Bar w="55%" /></Card>
            <Card><p className="text-[11px] font-bold text-gray-700">🛁 洗澡儿歌</p><Bar w="60%" /></Card>
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
                <Hot id="mic">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-white text-sm">🎙️</div>
                </Hot>
              </div>
            </Card>
            <Card><p className="text-[10px] text-gray-500">完成后自动打卡，点 🎙️ 录音评参与度</p></Card>
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
              {["🐶", "🚗", "🔔", "🐱"].map((e, i) => (
                <div key={e} className={`rounded-lg bg-white border border-gray-100 py-2 text-center text-lg ${i === 1 ? "border-indigo-300 ring-2 ring-indigo-200" : ""}`}>
                  {i === 1 ? <Hot id="play">{e}</Hot> : e}
                </div>
              ))}
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
              <Bar w="80%" />
            </Card>
            <Card ring>
              <p className="text-[11px] font-bold text-gray-700">🎯 拟声词游戏</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[9px] text-amber-600">带孩子一起练</span>
                <Hot id="goPractice">
                  <span className="text-[9px] text-white bg-amber-500 px-2 py-0.5 rounded-full">去练习 ›</span>
                </Hot>
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
              <Hot id="post">
                <div className="text-[10px] text-center text-white bg-indigo-500 py-1.5 rounded-lg">＋ 发布动态</div>
              </Hot>
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
              ["🎓", "功能导览"],
              ["📊", "训练记录"],
            ].map(([ic, label]) => (
              <div key={label as string} className="flex items-center gap-2 my-1.5 rounded-lg px-2 py-1.5 bg-white border border-gray-100">
                <span className="text-sm">{ic as string}</span>
                <span className="text-[10px] text-gray-600 flex-1">{label as string}</span>
              </div>
            ))}
            <div className="mt-1">
              <Hot id="contact">
                <div className="flex items-center gap-2 my-1.5 rounded-lg px-2 py-1.5 bg-white border border-indigo-300 ring-2 ring-indigo-200">
                  <span className="text-sm">💬</span>
                  <span className="text-[10px] text-indigo-700 font-semibold flex-1">联系治疗师</span>
                </div>
              </Hot>
            </div>
          </div>
        </Shell>
      );
    case "recIdle":
      return (
        <Shell>
          <div className="flex-1 flex flex-col items-center justify-center px-5 gap-3" style={{ background: "linear-gradient(160deg,#fff7ed,#fef2f2)" }}>
            <div className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">🎯 目标词：苹果</div>
            <p className="text-[11px] text-gray-400">原始音频仅留本机，不会上传</p>
            <Hot id="record">
              <button className="w-20 h-20 rounded-3xl bg-red-500 text-white text-3xl shadow-lg active:scale-95 flex items-center justify-center">🎙️</button>
            </Hot>
            <p className="text-[11px] text-gray-500">点击 / 按住开始录音</p>
          </div>
        </Shell>
      );
    case "recRecorded":
      return (
        <Shell>
          <div className="flex-1 flex flex-col items-center justify-center px-5 gap-3" style={{ background: "linear-gradient(160deg,#fff7ed,#fef2f2)" }}>
            <div className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">🎯 目标词：苹果</div>
            <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-400 text-2xl flex items-center justify-center">🎙️</div>
            <p className="text-[11px] text-gray-500">录音完成</p>
            <div className="mt-2 w-full flex flex-col gap-2">
              {highlight === "replay" ? (
                <Hot id="replay">
                  <button className="w-full py-2 rounded-xl bg-indigo-100 text-indigo-600 text-xs font-bold active:scale-95">▶️ 回放确认</button>
                </Hot>
              ) : (
                <button className="w-full py-2 rounded-xl bg-indigo-100 text-indigo-600 text-xs font-bold active:scale-95">▶️ 回放确认</button>
              )}
              {highlight === "submit" ? (
                <Hot id="submit">
                  <button className="w-full py-2 rounded-xl bg-green-500 text-white text-xs font-bold active:scale-95">提交分析</button>
                </Hot>
              ) : (
                <button className="w-full py-2 rounded-xl bg-green-500 text-white text-xs font-bold active:scale-95">提交分析</button>
              )}
            </div>
          </div>
        </Shell>
      );
    case "recResult":
      return (
        <Shell>
          <div className="flex-1 flex flex-col items-center justify-center px-5 gap-2" style={{ background: "linear-gradient(160deg,#ecfdf5,#eff6ff)" }}>
            <div className="text-2xl">⭐⭐⭐⭐⭐</div>
            <p className="text-sm font-extrabold text-emerald-700">完美参与！</p>
            <p className="text-[10px] text-gray-500">参与度评分（统一 1-5 星）· 90 分</p>
            <div className="mt-3 w-full">
              <Hot id="done">
                <button className="w-full py-2.5 rounded-xl bg-indigo-500 text-white text-xs font-bold active:scale-95">完成 ✓（本次评分已记录）</button>
              </Hot>
            </div>
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
            <div className="mt-3">
              <Hot id="enter">
                <button className="px-5 py-2.5 rounded-full bg-emerald-500 text-white text-sm font-bold active:scale-95">进入首页 🚀</button>
              </Hot>
            </div>
          </div>
        </Shell>
      );
    default:
      return <Shell><div /></Shell>;
  }
}

// ───────────────────────────────────────────────────────────
// 主组件
// ───────────────────────────────────────────────────────────

export default function CoachTour({
  open,
  steps,
  onDone,
}: {
  open: boolean;
  steps: CoachStep[];
  onDone: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [shake, setShake] = useState(false);
  const [arrow, setArrow] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const total = steps.length;
  const step = steps[idx];
  const isLast = idx === total - 1;
  const isFirst = idx === 0;

  const advance = useCallback(() => {
    setIdx((i) => {
      if (i >= total - 1) {
        onDone();
        return i;
      }
      return i + 1;
    });
  }, [total, onDone]);

  // 计算箭头：从气泡顶部中心 → 高亮按钮几何中心
  const measure = useCallback(() => {
    if (!step) {
      setArrow(null);
      return;
    }
    const wrap = wrapperRef.current;
    if (!wrap) return;
    const hot = wrap.querySelector<HTMLElement>(`[data-mock-btn="${step.highlight}"]`);
    const bubble = bubbleRef.current;
    if (!hot || !bubble) {
      setArrow(null);
      return;
    }
    const wr = wrap.getBoundingClientRect();
    const hr = hot.getBoundingClientRect();
    const br = bubble.getBoundingClientRect();
    setArrow({
      x1: br.left + br.width / 2 - wr.left,
      y1: br.top - wr.top - 4,
      x2: hr.left + hr.width / 2 - wr.left,
      y2: hr.top + hr.height / 2 - wr.top,
    });
  }, [step?.highlight]);

  useLayoutEffect(() => {
    measure();
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [measure, idx]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure]);

  const handleClick = (e: React.MouseEvent) => {
    const wrap = wrapperRef.current;
    if (!wrap) return;
    const hot = wrap.querySelector<HTMLElement>(`[data-mock-btn="${step.highlight}"]`);
    if (hot && hot.contains(e.target as Node)) {
      advance();
    } else {
      // 误点：光圈抖动 + 提示
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 进度条 + 跳过 */}
          <div className="w-full max-w-[300px] flex items-center gap-2 mb-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/25 overflow-hidden">
              <motion.div
                className="h-full bg-[#4F8CFF] rounded-full"
                animate={{ width: `${((idx + 1) / total) * 100}%` }}
                transition={{ type: "spring", damping: 20 }}
              />
            </div>
            {!isFirst && (
              <button onClick={onDone} className="text-[11px] text-white/70 underline whitespace-nowrap">
                跳过引导
              </button>
            )}
          </div>

          <p className="text-[11px] text-white/60 mb-2">步骤 {idx + 1} / {total}</p>

          {/* 手机 + 箭头 + 气泡 包裹层（用于坐标测量） */}
          <div ref={wrapperRef} className="relative flex flex-col items-center" onClick={handleClick}>
            {/* 箭头（精确指向高亮按钮） */}
            {arrow && (
              <svg
                className="pointer-events-none absolute inset-0 w-full h-full"
                style={{ overflow: "visible" }}
              >
                <defs>
                  <marker id="coachArrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill="#4F8CFF" />
                  </marker>
                </defs>
                <path
                  d={`M ${arrow.x1} ${arrow.y1} Q ${(arrow.x1 + arrow.x2) / 2} ${arrow.y1 - 18} ${arrow.x2} ${arrow.y2}`}
                  fill="none"
                  stroke="#4F8CFF"
                  strokeWidth={5}
                  strokeLinecap="round"
                  markerEnd="url(#coachArrow)"
                  style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }}
                />
                <circle cx={arrow.x2} cy={arrow.y2} r={4} fill="#4F8CFF" />
              </svg>
            )}

            <motion.div
              key={step.screen + step.highlight}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : { opacity: 1, scale: 1 }}
              transition={shake ? { duration: 0.45 } : { duration: 0.25 }}
            >
              <MockPhone screen={step.screen} highlight={step.highlight} />
            </motion.div>

            {/* 引导气泡 */}
            <motion.div
              ref={bubbleRef}
              key={"bubble" + idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 w-full max-w-[300px] bg-white rounded-2xl p-4 shadow-xl"
            >
              <p className="text-sm font-extrabold text-gray-800">{step.title}</p>
              <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{step.bubble}</p>
              <button
                onClick={(e) => { e.stopPropagation(); advance(); }}
                className="mt-3 w-full py-2.5 rounded-xl bg-[#4F8CFF] text-white text-sm font-bold active:scale-95"
              >
                {isLast ? "开始康复之旅 🚀" : "下一步 ›"}
              </button>
              <p className="text-center text-[10px] text-gray-300 mt-1.5">必须点中高亮按钮才能继续哦 👆</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
