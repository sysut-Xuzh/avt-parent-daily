"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getSupabaseBrowser } from "@/lib/supabase";

type Role = "parent" | "therapist";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("parent");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [babyName, setBabyName] = useState("");
  const [justCreatedFamily, setJustCreatedFamily] = useState(false);
  const [step, setStep] = useState<"phone" | "otp" | "family">("phone");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // 发送验证码
  // 【测试模式】用 Supabase 匿名登录（signInAnonymously）创建真实用户，无需短信/密码
  // 换成阿里云/Twilio 真短信时：testMode=false，恢复 signInWithOtp 流程
  const testMode = true; // ← 真短信配置好后改成 false

  const handleSendCode = async () => {
    setError("");
    setMessage("");
    if (!/^1\d{10}$/.test(phone)) {
      setError("请输入正确的 11 位手机号");
      return;
    }
    if (testMode) {
      // 测试模式：匿名登录（真实创建 Supabase 用户，家庭码可用）
      setLoading(true);
      try {
        const supabase = getSupabaseBrowser();
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;

        // 自动在 users 业务表建档（保证 families.created_by 外键可关联）
        const uid = data.user?.id;
        if (uid) {
          const { error: upsertError } = await supabase.from("users").upsert(
            {
              id: uid,
              role,
              name: role === "therapist" ? "治疗师" : "家长",
            },
            { onConflict: "id" }
          );
          if (upsertError) {
            // 建档失败时提示，方便排查（不阻塞登录）
            setMessage("已登录，但用户档案同步中（" + upsertError.message + "）");
          }
        }

        await storeRole(role);
        setStep("family");
        setMessage("（测试模式）已登录！请确认您的家庭信息");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "登录失败（匿名登录可能未开启）");
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setStep("otp");
      setMessage("验证码已发送，请输入");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "发送失败，请检查 Supabase SMS 配置");
    } finally {
      setLoading(false);
    }
  };

  // 验证验证码并登录（真短信模式用）
  const handleVerify = async () => {
    setError("");
    setMessage("");
    if (!/^\d{6}$/.test(code)) {
      setError("请输入 6 位验证码");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: "sms",
      });
      if (error) throw error;
      // 登录成功 → 进入家庭码步骤
      await storeRole(role);
      setStep("family");
      setMessage("登录成功！请确认您的家庭信息");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "验证失败");
    } finally {
      setLoading(false);
    }
  };

  // 保存角色到本地（后续可扩展为数据库 user_metadata）
  const storeRole = async (r: Role) => {
    try {
      const supabase = getSupabaseBrowser();
      await supabase.auth.updateUser({ data: { role: r } });
    } catch {
      // 非致命错误
    }
    localStorage.setItem("avt_role", r);
  };

  // Email magic link 登录（阶段四·①：先于手机号 OTP 落地，零成本）
  // 发送带回调链接的邮件，点击即登录；会话由 supabase 浏览器端 detectSessionInUrl 自动接管。
  const handleSendEmailLink = async () => {
    setError("");
    setMessage("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("请输入有效邮箱地址");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/parent` },
      });
      if (error) throw error;
      await storeRole(role);
      setMessage("✅ 登录链接已发送至邮箱，请点击邮件中的链接完成登录");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "发送失败，请检查邮箱格式或 Supabase Email 配置");
    } finally {
      setLoading(false);
    }
  };

  // 从 Supabase session 取 token，加到 API 请求头
  const authHeaders = async () => {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // 进入对应端（家庭码步骤：尝试真实加入家庭）
  const handleEnter = async (join: boolean) => {
    setError("");
    setLoading(true);
    try {
      // 如果刚创建了家庭码（创建者已自动加入），无需再次 join
      if (join && familyCode && !justCreatedFamily) {
        // 真实加入家庭
        const res = await fetch("/api/families", {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify({ action: "join", code: familyCode, role }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "加入家庭失败");
          setLoading(false);
          return;
        }
      }
    } catch {
      // 网络错误时仍可进入（数据隔离靠登录）
      console.warn("家庭码加入失败，直接进入");
    }
    localStorage.setItem("avt_family_code", familyCode || "");
    setLoading(false);
    router.push(role === "parent" ? "/parent" : "/therapist");
  };

  // 创建家庭码（家长：同时创建宝宝）
  const handleCreateFamily = async () => {
    setError("");
    setMessage("");
    if (!babyName.trim()) {
      setError("请先填写宝宝姓名");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/families", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ action: "create", babyName: babyName.trim(), role }),
      });
      const data = await res.json();
      if (data.success && data.family) {
        setFamilyCode(data.family.code);
        setJustCreatedFamily(true); // 创建者已自动加入，标记跳过 join
        setMessage(`✅ 家庭码已创建：${data.family.code}`);
      } else {
        setError(data.error || "创建失败");
      }
    } catch {
      setError("创建失败（需先完成手机号登录）");
    } finally {
      setLoading(false);
    }
  };

  // 体验模式（大创演示用，无需真实手机号）
  const handleGuestEnter = async () => {
    setError("");
    try {
      await storeRole(role);
      router.push(role === "parent" ? "/parent" : "/therapist");
    } catch {
      router.push(role === "parent" ? "/parent" : "/therapist");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <motion.span
            className="text-5xl block mb-3"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            👂
          </motion.span>
          <h1 className="text-xl font-bold text-gray-800">AVT 康复训练平台</h1>
          <p className="text-sm text-gray-400 mt-1">听损儿童听觉口语康复</p>
        </div>

        {/* 角色选择 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setRole("parent")}
            className={`py-3 rounded-xl text-sm font-semibold transition-all ${
              role === "parent"
                ? "bg-indigo-500 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            👩 家长端
          </button>
          <button
            onClick={() => setRole("therapist")}
            className={`py-3 rounded-xl text-sm font-semibold transition-all ${
              role === "therapist"
                ? "bg-teal-500 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            👩‍⚕️ 治疗师端
          </button>
        </div>

        {/* 步骤：手机号 → 验证码 → 家庭码 */}
        {step === "phone" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">手机号</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="请输入 11 位手机号"
                maxLength={11}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <button
              onClick={handleSendCode}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-50 transition-all"
            >
              {loading ? "登录中..." : "获取验证码 / 测试登录"}
            </button>
            <p className="text-[10px] text-gray-400 text-center">
              （测试模式：输入手机号后点上方按钮即可登录）
            </p>
            {/* Email magic link 登录（推荐优先路径） */}
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">邮箱（magic link 登录）</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
            <button
              onClick={handleSendEmailLink}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-teal-500 text-white font-semibold text-sm hover:bg-teal-600 disabled:opacity-50 transition-all"
            >
              {loading ? "发送中..." : "📧 发送登录链接（邮箱 magic link）"}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-gray-400">或</span>
              </div>
            </div>
            <button
              onClick={handleGuestEnter}
              className="w-full py-3 rounded-xl border border-indigo-200 text-indigo-600 font-semibold text-sm hover:bg-indigo-50 transition-all"
            >
              体验模式直接进入（演示用）
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center">
              验证码已发送至 <span className="font-semibold">{phone}</span>
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="6 位验证码"
              maxLength={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-50 transition-all"
            >
              {loading ? "验证中..." : "登录"}
            </button>
            <button
              onClick={() => setStep("phone")}
              className="w-full py-2 text-xs text-gray-400 hover:text-gray-600"
            >
              ← 重新输入手机号
            </button>
          </div>
        )}

        {step === "family" && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-3xl">🏠</span>
              <p className="text-sm text-gray-600 mt-2 font-medium">家庭信息确认</p>
              <p className="text-xs text-gray-400 mt-1">
                {role === "therapist"
                  ? "作为治疗师：输入家长给你的家庭码加入即可"
                  : "作为家长：先填写宝宝姓名创建你的家庭，或输入家庭码加入"}
              </p>
            </div>

            {/* 家长：创建自己的家庭 + 宝宝 */}
            {role === "parent" && (
              <div className="space-y-2">
                <label className="text-xs text-gray-500 block">宝宝姓名</label>
                <input
                  type="text"
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                  placeholder="如：小明"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  onClick={handleCreateFamily}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-50 transition-all"
                >
                  {loading ? "创建中..." : "🏠 创建我的家庭"}
                </button>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-gray-400">或</span>
              </div>
            </div>

            <input
              type="text"
              value={familyCode}
              onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
              placeholder="家庭码（如 AVT-3F7K）"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              onClick={() => handleEnter(true)}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-50 transition-all"
            >
              {loading ? "处理中..." : `加入并进入${role === "parent" ? "家长端" : "治疗师端"} →`}
            </button>
            <button
              onClick={() => handleEnter(false)}
              className="w-full py-2 text-xs text-gray-400 hover:text-gray-600"
            >
              跳过（暂不关联家庭）
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-xs">
            ⚠️ {error}
          </div>
        )}
        {message && (
          <div className="mt-4 p-3 rounded-xl bg-green-50 text-green-600 text-xs">
            ✅ {message}
          </div>
        )}
      </motion.div>
    </div>
  );
}
