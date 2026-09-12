"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AudioRecorderProps {
  taskId: string;
  onRecordingComplete?: (url: string, duration: number) => void;
}

type RecorderState = "idle" | "recording" | "uploading" | "done" | "playing" | "error";

export default function AudioRecorder({ taskId, onRecordingComplete }: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [fileUrl, setFileUrl] = useState("");
  const [note, setNote] = useState("");
  const [mood, setMood] = useState<"happy" | "neutral" | "tired" | "">("");
  const [errorMsg, setErrorMsg] = useState("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const savedRef = useRef("");

  // 情绪或笔记变化时自动保存
  useEffect(() => {
    if (state !== "done") return;
    const signature = `${mood}|${note}`;
    if (signature === savedRef.current) return; // 已保存过，跳过
    if (!mood && !note) return; // 都没填，不保存

    savedRef.current = signature;
    fetch("/api/tasks/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, mood: mood || undefined, note: note || undefined }),
    }).catch(() => {
      // 保存失败，允许下次重试
      savedRef.current = "";
    });
  }, [mood, note, state, taskId]);

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      setErrorMsg("");
      setDuration(0);
      audioChunks.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        const dur = duration;
        setState("uploading");

        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, `recording-${taskId}-${Date.now()}.webm`);
          formData.append("taskId", taskId);
          formData.append("duration", String(dur));
          formData.append("mood", mood);
          formData.append("note", note);

          const res = await fetch("/api/recordings/upload", { method: "POST", body: formData });
          if (!res.ok) throw new Error("上传失败");

          const data = await res.json();
          setFileUrl(data.fileUrl);
          setState("done");
          onRecordingComplete?.(data.fileUrl, dur);
        } catch {
          setState("error");
          setErrorMsg("上传失败，请重试");
        }
      };

      mediaRecorder.current = recorder;
      recorder.start(250);
      setState("recording");

      let sec = 0;
      timerRef.current = setInterval(() => {
        sec++;
        setDuration(sec);
        if (sec >= 180) recorder.stop();
      }, 1000);
    } catch (err: unknown) {
      setState("error");
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setErrorMsg("请允许麦克风权限");
      } else {
        setErrorMsg("无法访问麦克风");
      }
    }
  }, [taskId, duration, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setDuration(0);
    setErrorMsg("");
    setFileUrl("");
    setNote("");
    setMood("");
    savedRef.current = "";
    audioChunks.current = [];
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  }, []);

  const togglePlayback = useCallback(() => {
    if (!fileUrl) return;
    if (state === "playing") {
      audioRef.current?.pause();
      setState("done");
    } else {
      const audio = new Audio(fileUrl);
      audioRef.current = audio;
      audio.onended = () => setState("done");
      audio.play();
      setState("playing");
    }
  }, [fileUrl, state]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-2">
      {/* 录音按钮区 */}
      <div className="flex items-center gap-1.5">
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.button key="idle" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              onClick={startRecording}
              className="w-11 h-11 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center text-lg hover:bg-gray-200 active:scale-95 transition-all"
              style={{ minHeight: 44, minWidth: 44 }} title="开始录音">
              🎙️
            </motion.button>
          )}

          {state === "recording" && (
            <motion.div key="recording" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <motion.button
                className="w-28 h-11 rounded-xl bg-red-500 text-white flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-red-600"
                onClick={stopRecording} style={{ minHeight: 44 }} whileTap={{ scale: 0.9 }}>
                <span className="flex items-center gap-1.5">
                  <motion.span className="w-2 h-2 rounded-full bg-white"
                    animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                  {formatTime(duration)}
                  <span className="text-red-200">停止</span>
                </span>
              </motion.button>
            </motion.div>
          )}

          {state === "uploading" && (
            <motion.div key="uploading" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-500 flex items-center justify-center" style={{ minHeight: 44, minWidth: 44 }}>
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>⏳</motion.span>
            </motion.div>
          )}

          {(state === "done" || state === "playing") && (
            <motion.div key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1.5">
              {/* 播放/暂停 */}
              <button onClick={togglePlayback}
                className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg hover:bg-indigo-200 transition-all"
                style={{ minHeight: 44, minWidth: 44 }}
                title={state === "playing" ? "暂停" : "播放录音"}>
                {state === "playing" ? "⏸️" : "▶️"}
              </button>
              {/* 重新录制 */}
              <button onClick={reset}
                className="w-11 h-11 rounded-xl bg-green-100 text-green-600 flex items-center justify-center text-sm hover:bg-green-200 transition-all"
                style={{ minHeight: 44, minWidth: 44 }} title="重新录制">
                ✅
              </button>
            </motion.div>
          )}

          {state === "error" && (
            <motion.div key="error" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="flex items-center gap-1">
              <div onClick={reset}
                className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center text-sm cursor-pointer hover:bg-red-100"
                style={{ minHeight: 44, minWidth: 44 }} title={errorMsg}>
                ❌
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {state === "done" && (
          <span className="text-[10px] text-green-500">{formatTime(duration)}</span>
        )}
      </div>

      {/* 互动笔记 + 情绪（仅录音完成后显示） */}
      <AnimatePresence>
        {state === "done" && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
            {/* 情绪标签 */}
            <div className="flex gap-1.5">
              {(["happy", "neutral", "tired"] as const).map((m) => (
                <button key={m} onClick={() => setMood(m === mood ? "" : m)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                    mood === m ? "ring-1 ring-indigo-300 bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-400 hover:text-gray-600"
                  }`}>
                  {m === "happy" ? "😊 顺利" : m === "neutral" ? "😐 一般" : "😴 疲惫"}
                </button>
              ))}
            </div>
            {/* 文字笔记 */}
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="记录一下宝宝的反应…（选填）"
              rows={1}
              className="w-full px-2 py-1 rounded-lg border border-gray-200 text-[11px] resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder-gray-300"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
