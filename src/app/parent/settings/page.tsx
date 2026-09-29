"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import VoicePrintSetup from "@/components/voice-recorder/VoicePrintSetup";
import { registerServiceWorker, subscribeToPush, showLocalDemoNotification } from "@/lib/push-client";
import FeedbackWidget from "@/components/FeedbackWidget";
import { getVoiceProfile, type VoiceProfileStatus } from "@/lib/recording-store";
import {
  loadParentProfile,
  saveParentProfile,
  type ParentProfile,
} from "@/data/community";

interface RoutineSlot {
  label: string;
  icon: string;
  time: string;
  scenes: string[];
}

const defaultRoutine: RoutineSlot[] = [
  { label: "起床", icon: "🌅", time: "07:00", scenes: ["起床", "早餐"] },
  { label: "早餐", icon: "🍳", time: "07:30", scenes: ["早餐"] },
  { label: "上午活动", icon: "🎮", time: "10:00", scenes: ["游戏"] },
  { label: "午睡", icon: "😴", time: "12:30", scenes: [] },
  { label: "下午活动", icon: "📚", time: "15:00", scenes: ["阅读", "游戏"] },
  { label: "洗澡", icon: "🛁", time: "18:00", scenes: ["洗澡"] },
  { label: "睡前", icon: "🌙", time: "20:00", scenes: ["睡前"] },
];

const allScenes = ["早餐", "游戏", "洗澡", "睡前", "阅读", "外出"];

const ROLE_LABEL: Record<ParentProfile["role"], string> = {
  primary: "主要照护人",
  secondary: "次要照护人",
};

export default function ParentSettingsPage() {
  const router = useRouter();
  const [parent, setParent] = useState<ParentProfile>({
    nickname: "张妈妈",
    avatar: "🐰",
    phone: "138****5678",
    city: "北京市",
    bio: "每天进步一点点 🌱",
    role: "primary",
  });
  const [routine, setRoutine] = useState<RoutineSlot[]>(defaultRoutine);
  const [saved, setSaved] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "registering" | "subscribing" | "done" | "error">("idle");
  const [testResult, setTestResult] = useState("");
  const [babyInfo, setBabyInfo] = useState({ name: "小宝", birthDate: "2023-06-15", device: "人工耳蜗（双侧）" });
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceProfileStatus>("none");
  const [showGuideNew, setShowGuideNew] = useState(false);

  // 进入页面时读取已保存的家长档案 / 宝宝信息 / 作息 / 声纹状态
  useEffect(() => {
    setParent(loadParentProfile());
    setVoiceStatus(getVoiceProfile().voice_profile_status);
    try {
      const b = window.localStorage.getItem("avt_baby_info");
      if (b) setBabyInfo(JSON.parse(b));
      const r = window.localStorage.getItem("avt_routine");
      if (r) setRoutine(JSON.parse(r));
    } catch {
      /* 忽略损坏数据 */
    }
    // 功能导览 NEW 红点：记录首次访问，前 7 天显示
    try {
      const fv = window.localStorage.getItem("avt_first_visit");
      const now = Date.now();
      if (!fv) {
        window.localStorage.setItem("avt_first_visit", String(now));
        setShowGuideNew(true);
      } else {
        setShowGuideNew(now - Number(fv) < 7 * 24 * 3600 * 1000);
      }
    } catch {
      setShowGuideNew(false);
    }
  }, []);

  // 页面加载时自动注册推送
  useEffect(() => {
    if (pushStatus === "idle") {
      setPushStatus("registering");
      registerServiceWorker().then((ok) => {
        if (ok) {
          setPushStatus("subscribing");
          subscribeToPush().then((subOk) => {
            setPushStatus(subOk ? "done" : "error");
          });
        } else {
          setPushStatus("error");
        }
      });
    }
  }, [pushStatus]);

  const updateTime = (index: number, time: string) => {
    setRoutine((prev) => prev.map((slot, i) => (i === index ? { ...slot, time } : slot)));
  };

  const toggleSceneForSlot = (slotIndex: number, scene: string) => {
    setRoutine((prev) =>
      prev.map((slot, i) =>
        i === slotIndex
          ? { ...slot, scenes: slot.scenes.includes(scene) ? slot.scenes.filter((s) => s !== scene) : [...slot.scenes, scene] }
          : slot
      )
    );
  };

  const handleSave = () => {
    // 家长档案（新增）
    saveParentProfile(parent);
    // 宝宝信息 + 每日作息（现有）
    window.localStorage.setItem("avt_baby_info", JSON.stringify(babyInfo));
    window.localStorage.setItem("avt_routine", JSON.stringify(routine));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestPush = async () => {
    setTestResult("发送中...");
    const payload = {
      taskId: "test",
      title: "🧪 测试推送",
      body: "如果你看到这条通知，推送设置成功了！",
    };
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(`✅ 已发送给 ${data.sent}/${data.total} 个设备`);
        return;
      }
      // 后端没有真实订阅：先尝试自动补订阅，再发一次
      if (data.error === "没有推送订阅") {
        const subOk = await subscribeToPush();
        if (subOk) {
          const retry = await fetch("/api/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const r2 = await retry.json();
          if (r2.success) {
            setTestResult(`✅ 已发送给 ${r2.sent}/${r2.total} 个设备`);
            return;
          }
        }
        // 仍无订阅：降级为本地演示通知（真实弹出系统通知）
        const localOk = await showLocalDemoNotification(payload.title, payload.body);
        if (localOk) {
          setTestResult("📨 演示通知已发送（本地预览，未接入真实推送服务）");
        } else {
          setTestResult("⚠️ 请先在浏览器允许通知权限，或点击「重新订阅」");
        }
        return;
      }
      setTestResult(`❌ ${data.error || "发送失败"}`);
    } catch {
      setTestResult("❌ 请求失败");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push("/parent")} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <h1 className="text-base font-bold text-gray-800">⚙️ 我的设置</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-5 pb-10">
        {/* 家长信息（新增） */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <h2 className="text-sm font-bold text-gray-700 mb-3">👤 家长信息</h2>

          {/* 头部：头像 + 昵称 + 角色 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl flex-shrink-0">
              {parent.avatar}
            </div>
            <div className="min-w-0">
              <p className="text-base font-extrabold text-gray-800 truncate">{parent.nickname}</p>
              <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                {ROLE_LABEL[parent.role]}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {/* 昵称 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">昵称</label>
              <input value={parent.nickname}
                onChange={(e) => setParent({ ...parent, nickname: e.target.value })}
                maxLength={12}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            </div>
            {/* 手机号（脱敏，只读） */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-400">手机号</span>
              <span className="text-sm text-gray-500 flex items-center gap-1">
                {parent.phone}
                <span className="text-gray-300">›</span>
              </span>
            </div>
            {/* 所在城市 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">所在城市</label>
              <input value={parent.city}
                onChange={(e) => setParent({ ...parent, city: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            </div>
            {/* 个性签名 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">个性签名</label>
              <input value={parent.bio}
                onChange={(e) => setParent({ ...parent, bio: e.target.value })}
                maxLength={30}
                placeholder="写一句话介绍自己吧"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            </div>
            {/* 角色（照护人身份，可在主要/次要间切换） */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">照护身份</label>
              <div className="flex gap-2">
                {(["primary", "secondary"] as ParentProfile["role"][]).map((r) => {
                  const active = parent.role === r;
                  return (
                    <button key={r} onClick={() => setParent({ ...parent, role: r })}
                      className={`flex-1 text-xs py-2 rounded-lg border transition-all active:scale-95 ${
                        active ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-gray-500 border-gray-200"
                      }`}>
                      {ROLE_LABEL[r]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 宝宝信息 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <h2 className="text-sm font-bold text-gray-700 mb-3">👶 宝宝信息</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">名字</label>
              <input value={babyInfo.name} onChange={(e) => setBabyInfo({ ...babyInfo, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">出生日期</label>
              <input type="date" value={babyInfo.birthDate} onChange={(e) => setBabyInfo({ ...babyInfo, birthDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">设备类型</label>
              <select value={babyInfo.device} onChange={(e) => setBabyInfo({ ...babyInfo, device: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <option>人工耳蜗（双侧）</option>
                <option>人工耳蜗（单侧）</option>
                <option>助听器</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* 声纹建档（方案 §3 设置入口） */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎙️</span>
              <div>
                <h2 className="text-sm font-bold text-gray-700">宝宝声线</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {voiceStatus === "completed"
                    ? `已录入（${getVoiceProfile().child_voice_baseline_hz ? `${getVoiceProfile().child_voice_baseline_hz}Hz` : "通用模型"}）`
                    : voiceStatus === "auto_detected"
                    ? "已自动推断（来自任务录音）"
                    : voiceStatus === "skipped"
                    ? "尚未录入，使用通用模型"
                    : "未录入，识别会更准哦"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowVoiceModal(true)}
              className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full active:scale-95"
            >
              {voiceStatus === "completed" || voiceStatus === "auto_detected" ? "重新录入" : "录入声线"}
            </button>
          </div>
        </motion.div>

        {/* 功能导览（常驻入口，方案：我的页第二优先级） */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-indigo-100"
        >
          <button
            onClick={() => router.push("/parent/guide")}
            className="w-full flex items-center justify-between active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🎓</span>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-700">功能导览</p>
                <p className="text-[11px] text-gray-400 mt-0.5">3 分钟了解全部功能 · 随时回看</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {showGuideNew && (
                <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">NEW</span>
              )}
              <span className="text-gray-300 text-sm">›</span>
            </div>
          </button>
        </motion.div>

        {/* 建议信箱（云端汇总 + 本地备份，每月自动提醒一次） */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}>
          <FeedbackWidget asCard />
        </motion.div>

        {/* 作息时间表 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <h2 className="text-sm font-bold text-gray-700 mb-1">⏰ 每日作息</h2>
          <p className="text-xs text-gray-400 mb-3">设置时间，AI据此在合适时机推送话术</p>
          <div className="space-y-3">
            {routine.map((slot, i) => (
              <div key={slot.label} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <span className="text-xl w-8 text-center">{slot.icon}</span>
                <span className="text-sm font-medium text-gray-700 w-14">{slot.label}</span>
                <input type="time" value={slot.time} onChange={(e) => updateTime(i, e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm w-24" />
                <div className="flex-1 flex flex-wrap gap-1">
                  {allScenes.map((scene) => (
                    <button key={scene} onClick={() => toggleSceneForSlot(i, scene)}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${slot.scenes.includes(scene) ? "bg-indigo-100 text-indigo-600" : "text-gray-300"}`}>
                      {scene}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 推送状态 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <h2 className="text-sm font-bold text-gray-700 mb-2">🔔 推送设置</h2>
          <div className="text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">推送状态</span>
              <span className={`text-xs font-medium ${pushStatus === "done" ? "text-green-600" : "text-gray-400"}`}>
                {pushStatus === "idle" && "等待中"}
                {pushStatus === "registering" && "注册服务..."}
                {pushStatus === "subscribing" && "订阅推送..."}
                {pushStatus === "done" && "✅ 已开启"}
                {pushStatus === "error" && "⚠️ 未开启（可点击下方按钮）"}
              </span>
            </div>
            <label className="flex items-center justify-between">
              <span className="text-gray-600">推送提醒</span>
              <input type="checkbox" defaultChecked className="accent-indigo-500" />
            </label>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">提前提醒</span>
              <select defaultValue="10" className="px-2 py-1 rounded-lg border text-xs">
                <option value="5">5 分钟</option>
                <option value="10">10 分钟</option>
                <option value="15">15 分钟</option>
              </select>
            </div>
          </div>

          {/* 手动注册 + 测试 */}
          <div className="mt-3 flex gap-2">
            <button onClick={async () => {
                setPushStatus("registering");
                const ok = await registerServiceWorker();
                if (!ok) { setPushStatus("error"); return; }
                setPushStatus("subscribing");
                const subOk = await subscribeToPush();
                setPushStatus(subOk ? "done" : "error");
              }}
              className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200">
              🔄 重新订阅
            </button>
            <button onClick={handleTestPush}
              className="flex-1 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100">
              📨 测试推送
            </button>
          </div>
          {testResult && <p className="text-xs text-gray-500 mt-1">{testResult}</p>}
        </motion.div>

        <button onClick={handleSave}
          className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 active:scale-[0.98] transition-all">
          {saved ? "✅ 已保存" : "💾 保存设置"}
        </button>
      </div>

      <VoicePrintSetup
        open={showVoiceModal}
        onDone={() => {
          setShowVoiceModal(false);
          setVoiceStatus(getVoiceProfile().voice_profile_status);
        }}
      />
    </div>
  );
}
