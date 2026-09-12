"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { findClipAt, ActivityTimeline } from "@/data/activity-audio-timeline";

interface AnimationModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  steps: string[];
  title: string;
  character: string;
  characterName: string;
  speechText?: string;
  audioUrl?: string;
  timeline?: ActivityTimeline; // 分镜时间表（音画同步核心）
}

function isVideo(url: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|ogg)$/i.test(url);
}

export default function AnimationModal({
  open,
  onClose,
  imageUrl,
  steps,
  title,
  character,
  characterName,
  speechText,
  audioUrl,
  timeline,
}: AnimationModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  // 视频默认带声音播放：弹窗由用户点击按钮打开（用户手势），可绕过浏览器自动播放限制
  const [videoMuted, setVideoMuted] = useState(false);
  // 当前分镜台词（随视频进度更新，来自时间表）
  const [currentSpeech, setCurrentSpeech] = useState(speechText || "");
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const envAudioRef = useRef<HTMLAudioElement>(null);
  const stepRef = useRef(0); // 用于避免重复推进同一句
  const lastClipIdRef = useRef(""); // 避免重复播同一分镜配音
  const speechModeRef = useRef<"video" | "tts">("video"); // 配音来源模式

  const hasMedia = imageUrl && imageUrl.length > 0;
  const mediaIsVideo = isVideo(imageUrl);
  const allStepsShown = currentStep >= steps.length;

  // 播放配音（预录音频优先，回退 TTS）
  const playClipAudio = useCallback((clipSpeech: string, clipAudioUrl?: string) => {
    // 视频原声模式：不叠加配音（视频自带声音）
    if (speechModeRef.current === "video" && clipAudioUrl?.includes("/audio/")) {
      return;
    }
    if (clipAudioUrl && audioRef.current) {
      audioRef.current.src = clipAudioUrl;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // 音频文件不存在 → 回退 TTS
        speakWithWebAPI(clipSpeech);
      });
    } else {
      speakWithWebAPI(clipSpeech);
    }
  }, []);

  // 播放环境音
  const playEnvAudio = useCallback((envUrl?: string) => {
    if (!envUrl || !envAudioRef.current) return;
    envAudioRef.current.src = envUrl;
    envAudioRef.current.volume = 0.4;
    envAudioRef.current.loop = true;
    envAudioRef.current.play().catch(() => {});
  }, []);

  const stopEnvAudio = useCallback(() => {
    if (envAudioRef.current) {
      envAudioRef.current.pause();
      envAudioRef.current.src = "";
    }
  }, []);

  const speakWithWebAPI = useCallback((text: string) => {
    if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    const voices = synth.getVoices();
    const zhFemale =
      voices.find((v) => v.lang.startsWith("zh") && /female|huihui|yaoyao|tingting/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("zh"));
    if (zhFemale) utterance.voice = zhFemale;
    synth.speak(utterance);
  }, []);

  // 打开/关闭时重置状态
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      stepRef.current = 0;
      lastClipIdRef.current = "";
      setVideoMuted(false);
      stopEnvAudio();
      setCurrentSpeech(speechText || "");
      return;
    }
    setCurrentStep(0);
    stepRef.current = 0;
    lastClipIdRef.current = "";
    setVideoMuted(false);
    setCurrentSpeech(speechText || "");
    // 弹窗由用户点击按钮打开（有用户手势），允许带声自动播放原视频配音
    const t = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.play().catch(() => {});
      }
    }, 100);
    return () => {
      clearTimeout(t);
      stopEnvAudio();
    };
  }, [open, speechText, stopEnvAudio]);

  // —— 步骤驱动：时间表驱动（音画同步核心）——
  // 视频 timeupdate → 查分镜时间表 → 更新步骤/字幕/配音/环境音
  const handleVideoTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // 无时间表时回退旧逻辑：按视频时长均分步骤
    if (!timeline) {
      if (steps.length === 0) return;
      const duration = video.duration || 18;
      const segLen = duration / steps.length;
      const seg = Math.min(steps.length - 1, Math.floor(video.currentTime / segLen));
      if (seg !== stepRef.current) {
        stepRef.current = seg;
        setCurrentStep(seg);
      }
      return;
    }

    // 有时间表：查当前分镜
    const clip = findClipAt(timeline, video.currentTime);
    if (!clip) return;

    if (clip.shotIndex !== stepRef.current) {
      stepRef.current = clip.shotIndex;
      setCurrentStep(clip.shotIndex);
    }

    // 更新字幕（每分镜一次）
    if (clip.id !== lastClipIdRef.current) {
      lastClipIdRef.current = clip.id;
      setCurrentSpeech(clip.speech);

      // 开场分镜播环境音
      if (clip.shotIndex === 0) {
        playEnvAudio(clip.envAudio);
      }

      // 示范分镜播主配音（视频无声时才有意义；视频有声则跳过避免叠加）
      if (clip.shotIndex === 1 && clip.audioUrl) {
        playClipAudio(clip.speech, clip.audioUrl);
      }
    }
  }, [timeline, steps, playClipAudio, playEnvAudio]);

  // 定时器回退：无视频或视频时长未知时，每 3 秒推进一步
  useEffect(() => {
    if (!open) return;
    if (mediaIsVideo) return; // 有视频走 timeupdate 驱动
    if (currentStep >= steps.length) return;
    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
      stepRef.current = currentStep + 1;
    }, 3000);
    return () => clearTimeout(timer);
  }, [open, currentStep, steps.length, mediaIsVideo, steps]);

  // 点击视频区域：取消静音播放原声
  const handleVideoClick = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setVideoMuted(false);
    }
  };

  // 切换静音/取消静音
  const toggleMute = () => {
    if (videoRef.current) {
      const next = !videoRef.current.muted;
      videoRef.current.muted = next;
      setVideoMuted(next);
      if (!next) {
        speechModeRef.current = "video"; // 恢复原声
      }
    }
  };

  const handleReplay = () => {
    setCurrentStep(0);
    stepRef.current = 0;
    lastClipIdRef.current = "";
    stopEnvAudio();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 30 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 隐藏的音频元素 */}
            <audio ref={audioRef} preload="auto" />
            <audio ref={envAudioRef} preload="auto" loop />

            {/* 头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <motion.span
                  className="text-xl"
                  animate={{ rotate: [0, -8, 8, 0], y: [0, -2, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  {character}
                </motion.span>
                <span className="text-sm font-bold text-gray-800">{title}</span>
                {mediaIsVideo && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-600">
                    动画
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 text-lg"
              >
                x
              </button>
            </div>

            {/* 媒体区域 */}
            <div className="relative aspect-[4/3] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden">
              {hasMedia && mediaIsVideo ? (
                <video
                  ref={videoRef}
                  src={imageUrl}
                  className="w-full h-full object-cover cursor-pointer"
                  autoPlay
                  muted={videoMuted}
                  loop
                  playsInline
                  preload="auto"
                  onClick={handleVideoClick}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={() => {
                    handleVideoTimeUpdate();
                  }}
                />
              ) : hasMedia ? (
                <motion.img
                  src={imageUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 8, ease: "easeOut" }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <motion.div
                    className="text-7xl"
                    animate={{ y: [0, -10, 0], rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {character}
                  </motion.div>
                  <p className="text-xs text-gray-400">{characterName}的示范动画</p>
                </div>
              )}

              {/* 静音/取消静音按钮 */}
              {mediaIsVideo && (
                <button
                  onClick={toggleMute}
                  className={`absolute top-2 left-2 flex items-center gap-1.5 px-2.5 h-7 rounded-full transition-colors z-20 ${
                    videoMuted
                      ? "bg-black/50 hover:bg-black/70"
                      : "bg-green-500/90 hover:bg-green-600"
                  }`}
                  title={videoMuted ? "点击开启声音" : "静音"}
                >
                  {videoMuted ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                  <span className="text-white text-[10px] font-medium">
                    {videoMuted ? "点击开启声音" : "声音开启"}
                  </span>
                </button>
              )}

              {/* 台词字幕 — 随分镜更新（时间表驱动） */}
              {currentSpeech && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-2 right-2 left-12 z-10"
                >
                  <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1 border border-white/20">
                    <span className="text-white text-xs font-medium leading-tight line-clamp-2">
                      💬 {currentSpeech}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* 分镜步骤覆盖 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 space-y-1.5">
                {steps.slice(0, currentStep + 1).map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-2"
                  >
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                      i === currentStep ? "bg-green-500 text-white" : "bg-white/25 text-white/70"
                    }`}>
                      {i + 1}
                    </span>
                    <span className={`text-white text-sm font-medium drop-shadow ${i === currentStep ? "" : "text-white/60"}`}>
                      {step}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* 进度指示器 */}
              <div className="absolute top-2 right-2 flex gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i <= currentStep ? "bg-green-400" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 底部操作 */}
            <div className="p-3 flex items-center gap-2">
              {!allStepsShown ? (
                <button
                  onClick={() => {
                    const next = currentStep + 1;
                    setCurrentStep(next);
                    stepRef.current = next;
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors active:scale-95"
                >
                  下一步 →
                </button>
              ) : (
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors active:scale-95"
                >
                  {characterName}说：学会啦！ ✓
                </motion.button>
              )}
              <button
                onClick={handleReplay}
                className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                重播
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
