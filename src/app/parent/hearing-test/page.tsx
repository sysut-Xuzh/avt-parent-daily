"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import BottomNav from "@/components/bottom-nav";
import { bottomTabs } from "@/data/mock-data";
import type { TabId } from "@/types";
import {
  HEARING_LEVELS,
  HEARING_QUESTIONS,
  HearingLevelId,
  HearingLevel,
  REACTION_SCALE,
  IMITATION_SCALE,
  computeResults,
  getInterpretation,
  getSuggestion,
  getLevelGrade,
  NORMS,
  STAGE_LABEL,
  DEVICE_LABEL,
  DEMO_DEVICE,
  DEMO_STAGE,
  PEER_REFERENCE,
  saveTestRecord,
  loadTestRecords,
  HearingTestRecord,
} from "@/data/hearing-test";
import { playTone, speak, loadVoices } from "@/lib/avt-audio";
import VoiceRecorder from "@/components/voice-recorder/VoiceRecorder";
import type { VoiceAnalysis } from "@/lib/voice-analysis";

type Stage = "home" | "guide" | "testing" | "result" | "history";
const MAX_REPLAY = 3;

export default function HearingTestPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("home");
  const [cursor, setCursor] = useState(0);
  const [phase, setPhase] = useState<"playing" | "answered">("playing");
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "recorded" | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const [listening, setListening] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const answersRef = useRef<Record<string, number>>({});
  const engagementsRef = useRef<Record<string, VoiceAnalysis>>({});
  const [results, setResults] = useState<ReturnType<typeof computeResults> | null>(null);
  const [records, setRecords] = useState<HearingTestRecord[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const ordered = useMemo(
    () => HEARING_LEVELS.flatMap((l) => HEARING_QUESTIONS.filter((q) => q.level === l.id)),
    []
  );
  const currentQuestion = ordered[cursor];
  const currentLevel: HearingLevel | undefined = currentQuestion
    ? HEARING_LEVELS.find((l) => l.id === currentQuestion.level)
    : undefined;

  // 预载中文嗓音 + 读取历史记录
  useEffect(() => {
    loadVoices();
    setRecords(loadTestRecords());
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const playCurrent = useCallback(() => {
    const q = currentQuestion;
    if (!q) return;
    setListening(true);
    if (q.type === "detection") {
      if (q.playsSound && q.tone) void playTone(q.tone);
      // 静默控制试次不播放声音；给 1.2s 观察窗口
      window.setTimeout(() => setListening(false), q.playsSound ? 900 : 1200);
    } else if (q.type === "discrimination") {
      if (q.stimA) void playTone(q.stimA);
      window.setTimeout(() => {
        if (q.stimB) void playTone(q.stimB);
      }, 700);
      window.setTimeout(() => setListening(false), q.stimB ? 1500 : 900);
    } else if (q.type === "speech" && q.speech) {
      void speak(q.speech);
      window.setTimeout(() => setListening(false), q.speech.length > 12 ? 2200 : 1400);
    }
  }, [currentQuestion]);

  // 进入每道题自动播放一次
  useEffect(() => {
    if (stage !== "testing" || phase !== "playing" || !currentQuestion) return;
    setPlayCount(0);
    setListening(false);
    const t = window.setTimeout(() => {
      playCurrent();
      setPlayCount(1);
    }, 450);
    return () => window.clearTimeout(t);
  }, [stage, phase, cursor, playCurrent, currentQuestion]);

  const handleReplay = useCallback(() => {
    if (playCount >= MAX_REPLAY || listening) return;
    playCurrent();
    setPlayCount((c) => c + 1);
  }, [playCount, playCurrent, listening]);

  const replayStim = useCallback((i: number) => {
    const q = currentQuestion;
    if (!q || q.type !== "discrimination") return;
    const stim = i === 0 ? q.stimA : q.stimB;
    if (stim) void playTone(stim);
  }, [currentQuestion]);

  const handleAnswer = useCallback(
    (idx: number) => {
      if (phase !== "playing" || !currentQuestion) return;
      const q = currentQuestion;
      let score: number;
      let fb: "correct" | "wrong" | "recorded";
      if (q.scoreType === "reaction") {
        score = REACTION_SCALE[idx]?.score ?? 0;
        fb = "recorded";
      } else if (q.scoreType === "imitation") {
        score = IMITATION_SCALE[idx]?.score ?? 0;
        fb = "recorded";
      } else {
        const correct = idx === q.correctIndex;
        score = correct ? 4 : 0;
        fb = correct ? "correct" : "wrong";
      }
      answersRef.current = { ...answersRef.current, [q.id]: score };
      setAnswers(answersRef.current);
      setSelected(idx);
      setPhase("answered");
      setFeedback(fb);
      window.setTimeout(() => {
        const next = cursor + 1;
        if (next < ordered.length) {
          setCursor(next);
          setSelected(null);
          setFeedback(null);
          setPhase("playing");
        } else {
          const res = computeResults(answersRef.current);
          setResults(res);
          const record: HearingTestRecord = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            totalPct: res.totalPct,
            scores: res.scores,
            passed: res.passed,
            engagements: { ...engagementsRef.current },
          };
          saveTestRecord(record);
          setRecords(loadTestRecords());
          setStage("result");
        }
      }, 1350);
    },
    [phase, currentQuestion, cursor, ordered.length]
  );

  const startTest = useCallback(() => {
    answersRef.current = {};
    setAnswers({});
    setCursor(0);
    setSelected(null);
    setFeedback(null);
    setPhase("playing");
    setResults(null);
    setStage("testing");
  }, []);

  // 模仿题：保存本地声线参与度分析（音频不上传，仅存结构化指标）
  const handleEngagement = useCallback((qid: string, a: VoiceAnalysis) => {
    engagementsRef.current = { ...engagementsRef.current, [qid]: a };
  }, []);

  const handleTabChange = (tab: TabId) => {
    if (tab === "profile") router.push("/parent/settings");
    else if (tab === "hearing") router.push("/parent/hearing-test");
    else if (tab === "learning") router.push("/parent/daily-learning");
    else router.push("/parent");
  };

  // ------------------------------------------------------------------ 渲染
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 md:px-6 pt-5">
        <div className="md:max-w-2xl md:mx-auto">
          <AnimatePresence mode="wait">
            {stage === "home" && (
              <HomeScreen
                key="home"
                onStart={startTest}
                onHistory={() => setStage("history")}
                onVoiceLab={() => router.push("/parent/voice-lab")}
              />
            )}
            {stage === "guide" && (
              <GuideScreen key="guide" onBegin={startTest} onBack={() => setStage("home")} />
            )}
            {stage === "testing" && currentQuestion && currentLevel && (
              <TestingScreen
                key={`test-${cursor}`}
                question={currentQuestion}
                level={currentLevel}
                questionNo={cursor + 1}
                total={ordered.length}
                playCount={playCount}
                maxReplay={MAX_REPLAY}
                listening={listening}
                phase={phase}
                selected={selected}
                feedback={feedback}
                onReplay={handleReplay}
                onReplayStim={replayStim}
                onAnswer={handleAnswer}
                onEngagement={handleEngagement}
              />
            )}
            {stage === "result" && results && (
              <ResultScreen
                key="result"
                results={results}
                onRetest={startTest}
                onHome={() => setStage("home")}
                onShare={() => showToast("已生成报告卡片，可发给治疗师查看～（演示）")}
              />
            )}
            {stage === "history" && (
              <HistoryScreen
                key="history"
                records={records}
                onBack={() => setStage("home")}
                onStart={startTest}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <BottomNav activeTab="hearing" onTabChange={handleTabChange} tabs={bottomTabs} />

      {/* 轻提示 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto"
          >
            <div className="bg-indigo-600 text-white rounded-2xl px-5 py-3 shadow-xl text-sm text-center">
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =================================================================== 首页
function HomeScreen({
  onStart,
  onHistory,
  onVoiceLab,
}: {
  onStart: () => void;
  onHistory: () => void;
  onVoiceLab: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="text-center pt-4">
        <motion.div
          className="text-6xl"
          animate={{ y: [0, -8, 0], rotate: [0, -6, 6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          👂
        </motion.div>
        <h1 className="text-2xl font-extrabold text-gray-800 mt-2">听力小测验</h1>
        <p className="text-sm text-gray-500 mt-1">
          跟着 AVT 国际听觉发展阶梯，看看宝宝的进步！
        </p>
      </div>

      {/* AVT 阶梯说明 */}
      <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
        <p className="text-xs font-bold text-indigo-600 mb-3">📚 AVT 听觉发展四级阶梯</p>
        <div className="grid grid-cols-4 gap-2">
          {HEARING_LEVELS.map((l, i) => (
            <div key={l.id} className="text-center">
              <div
                className="rounded-xl py-3 text-2xl"
                style={{ background: `${l.color}1a`, color: l.color }}
              >
                {l.emoji}
              </div>
              <p className="text-xs font-bold text-gray-700 mt-1.5">{l.name}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{l.enName}</p>
              {i < 3 && (
                <p className="text-[10px] text-indigo-300 mt-0.5">↓</p>
              )}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
          察知 → 分辨 → 识别 → 理解，是听障儿童听觉发展的四个国际通用阶段。本测验按此标准出题。
        </p>
        <p className="text-[11px] text-indigo-400 mt-1.5 leading-relaxed">
          🔒 遵循 AVT「不可跳级」：上一级通过后自动解锁下一级，确保评估与训练同频。
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <button
          onClick={onStart}
          className="w-full py-3.5 rounded-2xl bg-indigo-500 text-white text-base font-bold shadow-sm hover:bg-indigo-600 active:scale-[0.98] transition-all"
        >
          🎮 开始测试
        </button>
        <button
          onClick={onHistory}
          className="w-full py-3 rounded-2xl bg-white text-indigo-600 text-sm font-semibold border border-indigo-100 hover:bg-indigo-50 active:scale-[0.98] transition-all"
        >
          📈 查看成长记录
        </button>
        <button
          onClick={onVoiceLab}
          className="w-full py-3 rounded-2xl bg-pink-50 text-pink-600 text-sm font-semibold border border-pink-100 hover:bg-pink-100 active:scale-[0.98] transition-all"
        >
          🎙️ 声线体验（录音练习）
        </button>
      </div>

      <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
        建议在安静环境中、使用耳机或外放进行，音量适中。<br />
        测试结果可作为阶段性参考，不构成医学诊断。
      </p>
    </motion.div>
  );
}

// =================================================================== 引导
function GuideScreen({ onBegin, onBack }: { onBegin: () => void; onBack: () => void }) {
  const tips = [
    { icon: "🤫", text: "请在安静环境中进行，减少背景噪音" },
    { icon: "👀", text: "不要提前提示答案，让宝宝自己听、自己选" },
    { icon: "🎯", text: "每道题最多听 3 次，按宝宝的节奏来" },
    { icon: "💛", text: "多鼓励，错了也没关系，开心最重要" },
    { icon: "📱", text: "建议使用耳机或外放，音量适中" },
  ];
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
      <button onClick={onBack} className="text-sm text-gray-400 mb-2">
        ← 返回
      </button>
      <div className="text-center">
        <motion.div
          className="text-5xl"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          👂
        </motion.div>
        <h2 className="text-xl font-extrabold text-gray-800 mt-2">测试前的小准备</h2>
        <p className="text-sm text-gray-500 mt-1">AVT 标准化家长引导</p>
      </div>

      <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 space-y-3">
        {tips.map((t) => (
          <div key={t.text} className="flex items-start gap-3">
            <span className="text-xl">{t.icon}</span>
            <p className="text-sm text-gray-600 leading-snug">{t.text}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onBegin}
        className="w-full mt-5 py-3.5 rounded-2xl bg-indigo-500 text-white text-base font-bold shadow-sm hover:bg-indigo-600 active:scale-[0.98] transition-all"
      >
        我准备好了，开始！ 🚀
      </button>
    </motion.div>
  );
}

// =================================================================== 答题
function TestingScreen({
  question,
  level,
  questionNo,
  total,
  playCount,
  maxReplay,
  listening,
  phase,
  selected,
  feedback,
  onReplay,
  onReplayStim,
  onAnswer,
  onEngagement,
}: {
  question: (typeof HEARING_QUESTIONS)[number];
  level: HearingLevel;
  questionNo: number;
  total: number;
  playCount: number;
  maxReplay: number;
  listening: boolean;
  phase: "playing" | "answered";
  selected: number | null;
  feedback: "correct" | "wrong" | "recorded" | null;
  onReplay: () => void;
  onReplayStim: (i: number) => void;
  onAnswer: (idx: number) => void;
  onEngagement?: (qid: string, a: VoiceAnalysis) => void;
}) {
  const pct = Math.round((questionNo / total) * 100);
  const canReplay = playCount < maxReplay && !listening;

  const isReaction = question.scoreType === "reaction";
  const isImitation = question.scoreType === "imitation";
  const isChoice = question.scoreType === "choice";

  // 选项区：choice 用题目 options；reaction/imitation 用统一量表
  const scaleOptions =
    isReaction
      ? REACTION_SCALE.map((r) => ({ emoji: r.emoji, label: r.label }))
      : isImitation
      ? IMITATION_SCALE.map((r) => ({ emoji: r.emoji, label: r.label }))
      : question.options ?? [];

  const stateCls = (idx: number) => {
    const base =
      "flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 py-5 px-2 transition-all active:scale-95 select-none text-center ";
    if (phase !== "answered")
      return base + "border-gray-200 bg-white hover:border-indigo-300 cursor-pointer";
    if (isChoice) {
      if (idx === question.correctIndex) return base + "border-green-400 bg-green-50";
      if (idx === selected) return base + "border-red-400 bg-red-50";
      return base + "border-gray-200 bg-white opacity-60";
    }
    // reaction / imitation：已选中的高亮
    if (idx === selected) return base + "border-indigo-400 bg-indigo-50";
    return base + "border-gray-200 bg-white opacity-70";
  };

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
      {/* 关卡 + 进度 */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold"
          style={{ background: `${level.color}1a`, color: level.color }}
        >
          <span>{level.emoji}</span>
          <span>{level.name}</span>
          {isReaction && <span className="text-[10px] font-normal">· 家长选反应</span>}
        </div>
        <span className="text-xs text-gray-400">第 {questionNo} / {total} 题</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: level.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ease: "easeOut" }}
        />
      </div>

      {/* 主播放按钮 */}
      <div className="mt-6 text-center">
        <motion.button
          onClick={onReplay}
          disabled={!canReplay}
          whileTap={{ scale: 0.92 }}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-md transition-all ${
            canReplay
              ? "bg-indigo-500 text-white hover:bg-indigo-600"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          🔊
          <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[11px] text-gray-400 whitespace-nowrap">
            {listening
              ? "🎧 专心听…"
              : canReplay
              ? `再听一次（剩 ${maxReplay - playCount} 次）`
              : "已达重听上限"}
          </span>
        </motion.button>
        {question.distance && (
          <p className="text-[11px] text-indigo-400 mt-9">📏 测试距离：{question.distance}</p>
        )}
      </div>

      {/* 题目引导语 */}
      <h2 className="text-center text-lg font-bold text-gray-800 mt-10 mb-1">
        {question.prompt}
      </h2>
      {question.parentTip && (
        <p className="text-center text-[11px] text-gray-400 mb-3 px-4 leading-relaxed">
          👨‍👩‍👧 家长提示：{question.parentTip}
        </p>
      )}
      {isReaction && (
        <p className="text-center text-[11px] text-indigo-400 mb-3 px-4 leading-relaxed">
          📝 请观察宝宝反应，从下面 5 档中选出最符合的一项（IT-MAIS 量表）
        </p>
      )}
      {isImitation && (
        <p className="text-center text-[11px] text-pink-400 mb-3 px-4 leading-relaxed">
          🗣️ 宝宝模仿后，请录下 TA 的声音做本地参与度分析（音频不上传），再请您确认清晰程度
        </p>
      )}
      {isImitation && onEngagement && (
        <div className="mt-1 mb-3">
          <VoiceRecorder
            taskId={question.id}
            onComplete={(a) => onEngagement(question.id, a)}
            onSkip={() => {}}
          />
        </div>
      )}

      {/* 选项 / 量表 */}
      <div
        className={`mt-2 grid gap-2.5 ${
          scaleOptions.length === 2
            ? "grid-cols-2"
            : scaleOptions.length === 3
            ? "grid-cols-3"
            : scaleOptions.length >= 5
            ? "grid-cols-5"
            : "grid-cols-2"
        }`}
      >
        {scaleOptions.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => onAnswer(idx)}
            disabled={phase === "answered"}
            className={stateCls(idx)}
          >
            <span className="text-3xl">{opt.emoji}</span>
            <span className="text-[11px] font-semibold text-gray-700 leading-tight">{opt.label}</span>
            {isChoice && question.type === "discrimination" && phase === "playing" && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onReplayStim(idx);
                }}
                className="mt-1 text-[10px] text-indigo-400 underline"
              >
                单独听这边的 🔊
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 反馈 */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mt-5 text-center"
          >
            <motion.div
              className="text-5xl"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.5 }}
            >
              {feedback === "correct" ? "🎉" : feedback === "recorded" ? "✅" : "💡"}
            </motion.div>
            <p
              className={`text-sm font-bold mt-1 ${
                feedback === "correct"
                  ? "text-green-600"
                  : feedback === "recorded"
                  ? "text-indigo-600"
                  : "text-amber-600"
              }`}
            >
              {feedback === "correct"
                ? "太棒了！"
                : feedback === "recorded"
                ? "已记录"
                : "没关系，再试试～"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =================================================================== 结果
function ResultScreen({
  results,
  onRetest,
  onHome,
  onShare,
}: {
  results: ReturnType<typeof computeResults>;
  onRetest: () => void;
  onHome: () => void;
  onShare: () => void;
}) {
  const interp = getInterpretation(results.totalPct, results.passed);
  const radarData = HEARING_LEVELS.map((l) => ({ level: l.name, score: results.scores[l.id] }));
  // 挂载兜底：确保 DOM 布局稳定后再渲染图表，避免首帧宽度算成 0 导致雷达图不显示
  const [chartReady, setChartReady] = useState(false);
  useEffect(() => setChartReady(true), []);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
      <div className="text-center pt-2">
        <motion.div
          className="text-5xl"
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          🏆
        </motion.div>
        <h2 className="text-xl font-extrabold text-gray-800 mt-2">测试完成！</h2>
        <p className="text-sm text-gray-500">本次综合得分</p>
        <p className="text-5xl font-extrabold text-indigo-600 mt-1">{results.totalPct}</p>
        <span className="inline-block mt-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold">
          {interp.label}
        </span>
        <p className="text-xs text-gray-500 mt-2 px-6 leading-relaxed">{interp.text}</p>
      </div>

      {/* 雷达图 */}
      <div className="mt-4 rounded-2xl bg-white p-2 shadow-sm border border-gray-100">
        <p className="text-xs font-bold text-gray-600 text-center pt-2">四项听觉能力雷达</p>
        <div className="w-full" style={{ height: 250 }}>
          {chartReady ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="level" tick={{ fill: "#6b7280", fontSize: 13 }} />
                <Radar
                  dataKey="score"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.35}
                  isAnimationActive
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-300">生成中…</div>
          )}
        </div>
      </div>

      {/* 各关得分 + 通过状态 + 建议 */}
      <div className="mt-3 space-y-2">
        {HEARING_LEVELS.map((l) => {
          const s = results.scores[l.id];
          const passed = results.passed[l.id];
          const grade = getLevelGrade(l.id, s);
          const suggest = getSuggestion(l.id, s);
          return (
            <div key={l.id} className="rounded-2xl bg-white p-3 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">
                  {l.emoji} {l.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      passed ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    {passed ? "✅ 通过" : "⚠️ 需加强"}
                  </span>
                  <span className="text-sm font-extrabold" style={{ color: l.color }}>
                    {s}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${s}%`, background: l.color }}
                />
              </div>
              {!passed && results.failReasons[l.id].length > 0 && (
                <p className="text-[10px] text-amber-600 mt-1 leading-relaxed">
                  ⚠️ {results.failReasons[l.id].join("；")}
                </p>
              )}
              {suggest && (
                <p className="text-[11px] text-indigo-600 mt-1.5 leading-relaxed">💡 {suggest}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* 常模对照（方案 §7） */}
      <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm border border-gray-100">
        <p className="text-xs font-bold text-gray-600 mb-2">
          📊 常模对照 · {DEVICE_LABEL[DEMO_DEVICE]} · {STAGE_LABEL[DEMO_STAGE]}
        </p>
        <div className="space-y-2">
          {HEARING_LEVELS.map((l) => {
            const s = results.scores[l.id];
            const target = NORMS[DEMO_DEVICE][DEMO_STAGE][l.id];
            const met = target != null && s >= target;
            return (
              <div key={l.id} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-8">{l.emoji}</span>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden relative">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${s}%`, background: l.color }}
                    />
                    {target != null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
                        style={{ left: `${target}%` }}
                        title={`阶段目标 ${target}`}
                      />
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-semibold" style={{ color: l.color }}>
                  {s}
                </span>
                <span className="text-[10px] text-gray-400 w-10 text-right">
                  {target == null ? "—" : `${target}${met ? " ✓" : ""}`}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
          ※ 灰线为该康复阶段的目标值；✓ 表示已达阶段目标。常模依据 IT-MAIS / LittlEARS 及国内临床研究。
        </p>
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-500 font-semibold mb-1">同龄健听儿童参考</p>
          <div className="grid grid-cols-1 gap-0.5">
            {PEER_REFERENCE.map((p) => (
              <p key={p.age} className="text-[10px] text-gray-400 leading-tight">
                · {p.age}：{p.level}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={onShare}
          className="py-3 rounded-2xl bg-white text-indigo-600 text-sm font-semibold border border-indigo-100 hover:bg-indigo-50 active:scale-[0.98] transition-all"
        >
          📤 分享给治疗师
        </button>
        <button
          onClick={onRetest}
          className="py-3 rounded-2xl bg-white text-indigo-600 text-sm font-semibold border border-indigo-100 hover:bg-indigo-50 active:scale-[0.98] transition-all"
        >
          🔁 再测一次
        </button>
      </div>
      <button
        onClick={onHome}
        className="w-full mt-3 py-3 rounded-2xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 active:scale-[0.98] transition-all"
      >
        返回首页
      </button>
      <p className="text-[11px] text-gray-400 text-center mt-3">
        ✅ 本次结果已自动保存到「成长记录」
      </p>
    </motion.div>
  );
}

// =================================================================== 历史
function HistoryScreen({
  records,
  onBack,
  onStart,
}: {
  records: HearingTestRecord[];
  onBack: () => void;
  onStart: () => void;
}) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("zh-CN", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
      <button onClick={onBack} className="text-sm text-gray-400 mb-2">
        ← 返回
      </button>
      <h2 className="text-xl font-extrabold text-gray-800">📈 成长记录</h2>
      <p className="text-sm text-gray-500 mt-1">每次听力测验的结果都会留在这里</p>

      <div className="mt-4 space-y-3">
        {records.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
            <span className="text-4xl">🌱</span>
            <p className="text-sm text-gray-500 mt-2">还没有测试记录，快去做第一次吧！</p>
          </div>
        ) : (
          records.map((r) => {
            const passedCount = (Object.keys(r.passed) as HearingLevelId[]).filter(
              (k) => r.passed[k]
            ).length;
            return (
              <div
                key={r.id}
                className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{fmt(r.date)}</span>
                  <span className="text-lg font-extrabold text-indigo-600">{r.totalPct} 分</span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {HEARING_LEVELS.map((l) => (
                    <div key={l.id} className="flex-1">
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${r.scores[l.id]}%`, background: l.color }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 text-center mt-1">
                        {r.passed[l.id] ? "✅" : "⚠️"} {l.name}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  已通过 {passedCount} / 4 级
                  {passedCount === 4 && " · 🌟 听觉阶梯全达标"}
                </p>
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={onStart}
        className="w-full mt-5 py-3.5 rounded-2xl bg-indigo-500 text-white text-base font-bold shadow-sm hover:bg-indigo-600 active:scale-[0.98] transition-all"
      >
        🎮 开始一次新测试
      </button>
    </motion.div>
  );
}
