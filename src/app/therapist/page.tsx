"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import TherapistDashboard from "@/components/therapist-dashboard";
import TherapistCommunity from "@/components/therapist-community";
import TherapistConsult from "@/components/therapist-consult";
import TherapistRecommend from "@/components/therapist-recommend";
import { TRAINING_ACTIVITIES, getActivityById } from "@/data/training-activities";

type TabView = "plan" | "dashboard" | "community" | "consult" | "recommend";

// 按模块分组
const CATEGORIES = ["听觉技能", "核心策略", "日常常规", "游戏互动", "设备管理", "家长技巧"];
const SCENES = ["早餐", "游戏", "洗澡", "睡前", "阅读", "外出"];

interface PlanActivity {
  activityId: string;
  targetWord: string;
  scene: string;
}

export default function TherapistPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabView>("plan");
  const [babyList, setBabyList] = useState<{ id: string; name: string }[]>([]);
  const [babyId, setBabyId] = useState("");
  const [babyName, setBabyName] = useState("");
  const [activities, setActivities] = useState<PlanActivity[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [familyMsg, setFamilyMsg] = useState("");

  // 创建/显示家庭码
  const handleFamilyCode = async () => {
    setFamilyMsg("");
    try {
      // 从 Supabase session 取 token
      const supabase = (await import("@/lib/supabase")).getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/families", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: "create", babyName: babyName || "小宝" }),
      });
      const data2 = await res.json();
      if (data2.success && data2.family) {
        setFamilyCode(data2.family.code);
        setFamilyMsg(`家庭码已创建，发给家长即可加入`);
      } else {
        setFamilyMsg(data2.error || "创建失败（需先登录）");
      }
    } catch {
      setFamilyMsg("创建失败");
    }
  };

  // 加载宝宝列表，默认选中小宝
  useEffect(() => {
    fetch("/api/babies")
      .then(r => r.json())
      .then(d => {
        if (d?.babies && d.babies.length > 0) {
          setBabyList(d.babies);
          const defaultBaby = d.babies.find((b: { name: string }) => b.name === "小宝") || d.babies[0];
          setBabyId(defaultBaby.id);
          setBabyName(defaultBaby.name);
          loadPlan(defaultBaby.id, defaultBaby.name);
        }
      })
      .catch(() => {});
  }, []);

  // 加载当前方案（基于今天日计划的任务）
  // ⚠️ 用 baby_id 查询而不是名字：同名宝宝（种子"小宝"与真实家长"小宝"）不会串号
  const loadPlan = (id: string, name?: string) => {
    const qs = id ? `baby_id=${encodeURIComponent(id)}` : `baby_name=${encodeURIComponent(name || "")}`;
    fetch(`/api/weekly-plans/current?${qs}`)
      .then(r => r.json())
      .then(d => {
        if (d?.plan && d.plan.activities && d.plan.activities.length > 0) {
          setActivities(d.plan.activities);
        } else {
          // 默认给4个活动占位
          const defaults: PlanActivity[] = [
            { activityId: "sound-detection", targetWord: "", scene: "游戏" },
            { activityId: "audition-first", targetWord: "", scene: "游戏" },
            { activityId: "auditory-bombardment", targetWord: "", scene: "游戏" },
            { activityId: "wait-time", targetWord: "", scene: "游戏" },
          ];
          setActivities(defaults);
        }
      })
      .catch(() => {});
  };

  const handleBabyChange = (id: string) => {
    const baby = babyList.find((b) => b.id === id);
    setBabyId(id);
    setBabyName(baby?.name || "");
    loadPlan(id, baby?.name);
  };

  // 修改某个活动的目标词/场景
  const updateActivity = (index: number, field: keyof PlanActivity, value: string) => {
    setActivities((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  };

  // 添加一个活动
  const addActivity = () => {
    setActivities((prev) => [...prev, { activityId: "sound-detection", targetWord: "", scene: "游戏" }]);
  };

  // 移除一个活动
  const removeActivity = (index: number) => {
    setActivities((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      // 校验：每个活动必须填目标词
      const valid = activities.filter((a) => a.targetWord.trim());
      if (valid.length === 0) {
        setSaveMsg("❌ 请至少为1个训练活动填写目标词");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/weekly-plans/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyId,
          babyName,
          activities: valid.map((a) => ({
            activityId: a.activityId,
            targetWord: a.targetWord.trim(),
            scene: a.scene,
          })),
          strategies: [],
          scenes: [],
          dailyCount: valid.length,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg(`✅ 已保存！生成了 ${data.tasksGenerated} 个任务`);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveMsg(`❌ ${data.error || "保存失败"}`);
      }
    } catch {
      setSaveMsg("❌ 网络错误");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 md:bg-gray-100">
      <header className="relative bg-white border-b border-gray-200 px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-gray-600 text-lg shrink-0">←</button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-800">治疗师工作台</h1>
            <p className="text-xs text-gray-400">陈治疗师</p>
          </div>
          <button onClick={handleFamilyCode}
            className="ml-auto shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-amber-100 text-amber-700 hover:bg-amber-200"
            title="创建家庭码，发给家长加入">
            🏠 家庭码{familyCode ? `：${familyCode}` : ""}
          </button>
        </div>
        {/* 标签栏：窄屏可横向滚动，确保「推荐内容」等入口不被挤出 */}
        <div className="mt-2 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-1 whitespace-nowrap">
            <button onClick={() => setTab("plan")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === "plan" ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"}`}>
              📋 方案配置
            </button>
            <button onClick={() => setTab("dashboard")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === "dashboard" ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"}`}>
              📊 数据面板
            </button>
            <button onClick={() => setTab("community")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === "community" ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"}`}>
              💬 康复圈
            </button>
            <button onClick={() => setTab("consult")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === "consult" ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"}`}>
              📨 工单
            </button>
            <button onClick={() => setTab("recommend")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === "recommend" ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"}`}>
              📤 推荐内容
            </button>
          </div>
        </div>
        {familyMsg && (
          <div className="absolute top-[5rem] right-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 shadow-sm z-20">
            {familyMsg}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-4xl mx-auto w-full">
        {tab === "plan" ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* 标题 */}
            <div>
              <h2 className="text-lg font-bold text-gray-800">本周训练方案</h2>
              <p className="text-sm text-gray-400">
                {new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" })} 起，共 7 天
              </p>
            </div>

            {/* 选择宝宝 */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <label className="text-sm font-semibold text-gray-700 block mb-2">👶 选择宝宝</label>
              <select value={babyId} onChange={(e) => handleBabyChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {babyList.length === 0 && <option value="">加载中...</option>}
                {babyList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}（{b.id.slice(-4)}）
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                任务会写入该宝宝名下，仅其家长可见（括号内为宝宝编号末四位，用于区分同名宝宝）
              </p>
            </div>

            {/* 训练活动列表 */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">🎬 训练活动（从32个基本活动中选择）</label>
                <button onClick={addActivity}
                  className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100">
                  ＋ 添加活动
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-3">每个活动选择一个训练类型 + 填写本周目标词</p>

              <div className="space-y-3">
                {activities.map((act, i) => {
                  const actInfo = getActivityById(act.activityId);
                  return (
                    <div key={i} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-500">活动 #{i + 1}</span>
                        <button onClick={() => removeActivity(i)}
                          className="text-[10px] text-red-400 hover:text-red-600">✕ 移除</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {/* 训练类型选择 */}
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">训练类型</label>
                          <select value={act.activityId}
                            onChange={(e) => updateActivity(i, "activityId", e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none">
                            {CATEGORIES.map((cat) => (
                              <optgroup key={cat} label={cat}>
                                {TRAINING_ACTIVITIES.filter((a) => a.category === cat).map((a) => (
                                  <option key={a.id} value={a.id}>{a.no}. {a.name}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                        {/* 目标词 */}
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">目标词</label>
                          <input value={act.targetWord}
                            onChange={(e) => updateActivity(i, "targetWord", e.target.value)}
                            placeholder="如：苹果、狗"
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                        </div>
                        {/* 场景 */}
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">场景</label>
                          <select value={act.scene}
                            onChange={(e) => updateActivity(i, "scene", e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none">
                            {SCENES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      {/* 活动说明 */}
                      {actInfo && (
                        <p className="text-[10px] text-gray-400 mt-1.5">
                          {actInfo.description}
                          {actInfo.animFile ? " 🎬 有示范动画" : " 🎬 用通用动画"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 保存按钮 */}
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all">
              {saving ? "⏳ 保存中..." : saved ? "✅ 已保存！" : `💾 为「${babyName || "宝宝"}」保存方案`}
            </button>
            {saveMsg && <p className="text-xs text-gray-500 text-center">{saveMsg}</p>}

            {/* 预览摘要 */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
              <h3 className="text-sm font-bold text-gray-700 mb-2">📄 本周方案摘要</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <p>👶 宝宝：{babyName}</p>
                {activities.filter((a) => a.targetWord.trim()).map((a, i) => {
                  const info = getActivityById(a.activityId);
                  return (
                    <p key={i}>🎬 {info?.name || "?"} → 🎯 {a.targetWord}</p>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : tab === "community" ? (
          <TherapistCommunity />
        ) : tab === "consult" ? (
          <TherapistConsult />
        ) : tab === "recommend" ? (
          <TherapistRecommend />
        ) : (
          <TherapistDashboard babyName={babyName} />
        )}
      </div>
    </div>
  );
}
