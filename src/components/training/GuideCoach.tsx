"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { GuideScript, GuideStep } from "@/lib/guide-script";
import { startVoicePerception, VoicePerceptionUnsupportedError } from "@/lib/voice-perception";
import { startFacePerception } from "@/lib/face-perception";

type StepPhase = "prompt" | "waiting" | "success" | "retry";

interface GuideCoachProps {
  script: GuideScript;
  /** 全部步骤走完 → 标记任务完成等 */
  onComplete?: () => void;
  /** 跳过陪练直接完成 */
  onSkip?: () => void;
  /** 是否显示「跳过直接完成」入口（任务场景传 true） */
  allowSkip?: boolean;
}

// Focus Traveller 配色（内联，不动 tailwind.config / globals.css，避免与视觉分支冲突）
const C = {
  paper: "#FBF7F0",
  pine: "#6B8F71",
  pineDeep: "#557A5C",
  dusk: "#E8A87C",
  duskDeep: "#D98E5A",
  ink: "#3E3A33",
  inkSoft: "#8A7A68",
  card: "#FFFFFF",
};

export default function GuideCoach({ script, onComplete, onSkip, allowSkip }: GuideCoachProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<StepPhase>("prompt");
  const [voiceOn, setVoiceOn] = useState(true);
  const [faceOn, setFaceOn] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [faceSupported, setFaceSupported] = useState<boolean | null>(null);
  const [level, setLevel] = useState({ rms: 0, baseline: 0 });

  const voiceHandle = useRef<{ stop: () => void } | null>(null);
  const faceHandle = useRef<{ stop: () => void } | null>(null);

  const step: GuideStep | undefined = script.steps[stepIndex];
  const isLast = stepIndex >= script.steps.length - 1;

  const stopAll = useCallback(() => {
    voiceHandle.current?.stop();
    voiceHandle.current = null;
    faceHandle.current?.stop();
    faceHandle.current = null;
  }, []);

  // 进入某一步：根据 detect 模式决定初始相位 + 是否启感知
  const enterStep = useCallback(
    (i: number) => {
      const s = script.steps[i];
      if (!s) return;
      stopAll();
      setVoiceError(null);
      if (s.detect === "manual") {
        setPhase("prompt");
      } else {
        setPhase("waiting");
      }
      setStepIndex(i);
    },
    [script.steps, stopAll]
  );

  // 成功（被感知或手动触发）→ success 相位
  const markSuccess = useCallback(() => {
    stopAll();
    setPhase("success");
  }, [stopAll]);

  // 下一步 / 完成
  const goNext = useCallback(() => {
    if (isLast) {
      onComplete?.();
    } else {
      enterStep(stepIndex + 1);
    }
  }, [isLast, onComplete, enterStep, stepIndex]);

  // ---- 感知生命周期：随 stepIndex / 开关变化重新挂载 ----
  useEffect(() => {
    if (!step) return;
    let cancelled = false;

    if (step.detect === "voice" && voiceOn) {
      startVoicePerception({
        onLevel: (rms, baseline) => {
          if (!cancelled) setLevel({ rms, baseline });
        },
        onVocalization: () => {
          if (cancelled) return;
          voiceHandle.current?.stop();
          voiceHandle.current = null;
          setPhase("success");
        },
      })
        .then((h) => {
          if (!cancelled) voiceHandle.current = h;
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          const code = e instanceof VoicePerceptionUnsupportedError ? e.code : "unknown";
          setVoiceError(
            code === "denied"
              ? "麦克风权限被拒绝，已切换为手动模式"
              : code === "no-mic"
              ? "未检测到麦克风，已切换为手动模式"
              : "语音感知不可用，已切换为手动模式"
          );
          setVoiceOn(false);
          // 该步本需语音，降级为手动
          if (step.detect === "voice") setPhase("prompt");
        });
    }

    if (step.detect === "visual" && faceOn) {
      startFacePerception({
        onPresent: () => {
          if (cancelled) return;
          faceHandle.current?.stop();
          faceHandle.current = null;
          setPhase("success");
        },
        onEngage: () => {
          /* 仅用于可视化，可扩展 */
        },
      }).then((res) => {
        if (cancelled) return;
        setFaceSupported(res.supported);
        if (res.supported && res.handle) {
          faceHandle.current = res.handle;
        } else {
          // 不支持摄像头感知：该步降级为手动
          setFaceOn(false);
          if (step.detect === "visual") setPhase("prompt");
        }
      });
    }

    return () => {
      cancelled = true;
      voiceHandle.current?.stop();
      voiceHandle.current = null;
      faceHandle.current?.stop();
      faceHandle.current = null;
    };
  }, [step, voiceOn, faceOn]);

  // ---- 超时：waiting 超过 timeoutSec → retry ----
  useEffect(() => {
    if (phase === "waiting" && step?.timeoutSec) {
      const t = setTimeout(() => setPhase("retry"), step.timeoutSec * 1000);
      return () => clearTimeout(t);
    }
  }, [phase, step]);

  // 卸载清理
  useEffect(() => () => stopAll(), [stopAll]);

  if (!step) return null;

  const needsPerception = step.detect !== "manual";
  const showWaiting = phase === "waiting" && needsPerception;
  const showManualOnly = step.detect === "manual" || phase === "prompt" || phase === "retry";

  return (
    <div
      className="rounded-3xl border border-[#EADFD0] shadow-sm bg-white overflow-hidden"
      style={{ fontFamily: "inherit" }}
    >
      {/* 顶部：感知开关 */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b border-[#F0E8DB]"
        style={{ background: C.paper }}
      >
        <span className="text-xs font-semibold" style={{ color: C.inkSoft }}>
          🎧 感知模式
        </span>
        <button
          onClick={() => setVoiceOn((v) => !v)}
          disabled={!!voiceError}
          className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
          style={{
            background: voiceOn ? C.pine : "#EFE7DA",
            color: voiceOn ? "#fff" : C.inkSoft,
            opacity: voiceError ? 0.5 : 1,
          }}
        >
          🎤 语音{voiceOn ? "开" : "关"}
        </button>
        <button
          onClick={async () => {
            if (!faceOn) {
              setFaceSupported(null);
              const r = await startFacePerception({});
              setFaceSupported(r.supported);
              r.handle?.stop();
              if (r.supported) setFaceOn(true);
            } else {
              setFaceOn(false);
            }
          }}
          className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
          style={{
            background: faceOn ? C.dusk : "#EFE7DA",
            color: faceOn ? "#fff" : C.inkSoft,
          }}
          title={faceSupported === false ? "当前环境不支持摄像头感知" : "开启摄像头感知（默认关闭）"}
        >
          📷 摄像头{faceOn ? "开" : "关"}
        </button>
        {faceSupported === false && (
          <span className="text-[10px]" style={{ color: C.inkSoft }}>
            摄像头不可用
          </span>
        )}
      </div>

      {/* 进度条 */}
      <div className="h-1.5 w-full" style={{ background: "#F0E8DB" }}>
        <div
          className="h-full transition-all"
          style={{
            width: `${((stepIndex + 1) / script.steps.length) * 100}%`,
            background: `linear-gradient(90deg, ${C.pine}, ${C.dusk})`,
          }}
        />
      </div>

      {/* 主体 */}
      <div className="px-5 py-5">
        <p className="text-[11px] font-semibold" style={{ color: C.inkSoft }}>
          第 {stepIndex + 1} / {script.steps.length} 步 ·{" "}
          {step.detect === "voice"
            ? "等待孩子发声"
            : step.detect === "visual"
            ? "等待孩子参与"
            : "家长操作"}
        </p>

        {/* 等待环 */}
        {showWaiting && (
          <div className="flex flex-col items-center my-4">
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
              style={{ background: `radial-gradient(circle, ${C.dusk}33, ${C.dusk}11)`, border: `2px solid ${C.dusk}` }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              👂
            </motion.div>
            <p className="text-sm mt-3 font-medium" style={{ color: C.ink }}>
              正在聆听孩子…
            </p>
            {/* 音量条 */}
            <div className="w-40 h-2 mt-2 rounded-full overflow-hidden" style={{ background: "#EFE7DA" }}>
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.min(100, (level.rms / Math.max(level.baseline * 2.2, 0.04)) * 100)}%`,
                  background: C.pine,
                }}
              />
            </div>
          </div>
        )}

        {/* 提示 / 反馈 */}
        <div
          className="rounded-2xl p-4 mt-2"
          style={{
            background:
              phase === "success" ? "#EAF1EA" : phase === "retry" ? "#FBF0DD" : C.paper,
            border: `1px solid ${phase === "success" ? C.pine : phase === "retry" ? C.dusk : "#EADFD0"}`,
          }}
        >
          {phase === "success" ? (
            <>
              <p className="text-lg font-bold" style={{ color: C.pineDeep }}>
                {step.successHint}
              </p>
              <p className="text-xs mt-1" style={{ color: C.inkSoft }}>
                这一步完成啦，继续下一程 🌟
              </p>
            </>
          ) : phase === "retry" ? (
            <>
              <p className="text-sm font-semibold" style={{ color: C.duskDeep }}>
                ⏳ {step.retryHint}
              </p>
              <p className="text-xs mt-1" style={{ color: C.inkSoft }}>
                可以再试一次，或手动确认孩子已配合。
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold" style={{ color: C.ink }}>
                👨‍👩‍👧 {step.prompt}
              </p>
              <p className="text-xs mt-1.5" style={{ color: C.inkSoft }}>
                在等孩子：{step.expect}
              </p>
            </>
          )}
        </div>

        {/* 操作区 */}
        <div className="mt-4 flex flex-col gap-2">
          {phase === "success" && (
            <button
              onClick={goNext}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors"
              style={{ background: C.pine }}
            >
              {isLast ? "🎉 完成全部，标记完成" : "下一步 →"}
            </button>
          )}

          {phase === "retry" && (
            <>
              <button
                onClick={() => enterStep(stepIndex)}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors"
                style={{ background: C.dusk }}
              >
                🔁 再试一次
              </button>
              <button
                onClick={markSuccess}
                className="w-full py-2.5 rounded-xl font-medium text-sm transition-colors"
                style={{ background: "#EFE7DA", color: C.ink }}
              >
                ✓ 手动确认孩子已配合
              </button>
            </>
          )}

          {showManualOnly && step.detect === "manual" && (
            <button
              onClick={markSuccess}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors"
              style={{ background: C.pine }}
            >
              ✓ 完成本步
            </button>
          )}

          {/* 任何步骤都保留手动兜底（防设备无麦克风 / 摄像头） */}
          {needsPerception && phase !== "success" && (
            <button
              onClick={markSuccess}
              className="w-full py-2 rounded-xl font-medium text-xs transition-colors"
              style={{ background: "transparent", color: C.inkSoft, border: "1px solid #EADFD0" }}
            >
              无设备？手动确认本步完成
            </button>
          )}

          {allowSkip && (
            <button
              onClick={() => onSkip?.()}
              className="w-full py-2 mt-1 rounded-xl font-medium text-xs transition-colors"
              style={{ background: "transparent", color: C.inkSoft }}
            >
              跳过陪练，直接标记完成
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
