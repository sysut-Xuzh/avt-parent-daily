// POST /api/reports/weekly-story — 周进步故事生成
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { babyId } = await request.json();
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    // 本地时区格式化（与 /api/tasks/today 一致）
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const ws = fmt(weekStart);
    const we = fmt(today);

    // 获取本周所有日计划
    const plans = await fetch(
      `${SUPA_URL}/rest/v1/daily_plans?select=id,date&order=date.desc`,
      { cache: "no-store", headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } }
    ).then(r => r.json());

    const weekPlans = (plans || []).filter((p: any) => p.date >= ws && p.date <= we);
    if (weekPlans.length === 0) {
      return NextResponse.json({ title: "本周还没有训练记录", story: "下周继续加油！" });
    }

    // 获取任务
    let allWords: string[] = [];
    let total = 0, completed = 0;
    for (const plan of weekPlans) {
      const tasks = await fetch(
        `${SUPA_URL}/rest/v1/tasks?select=target_word,status&daily_plan_id=eq.${plan.id}`,
        { cache: "no-store", headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } }
      ).then(r => r.json());
      if (tasks) {
        total += tasks.length;
        completed += tasks.filter((t: any) => t.status === "completed").length;
        tasks.forEach((t: any) => { if (t.target_word && !allWords.includes(t.target_word)) allWords.push(t.target_word); });
      }
    }

    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const daysActive = new Set(weekPlans.map((p: any) => p.date)).size;

    // 尝试 LLM
    const llmKey = process.env.LLM_API_KEY || "";
    const llmBase = process.env.LLM_BASE_URL || "https://api.deepseek.com/v1";

    let title = "", story = "";
    try {
      const prompt = `你是一位AVT康复助手。请生成一段周进步故事。

本周数据：
• 训练天数：${daysActive}天
• 总任务：${total}个
• 完成：${completed}个
• 完成率：${rate}%
• 练习的词：${allWords.join("、")}

要求：
1. 以故事形式呈现（"这一周，xxx…"）
2. 突出进步，即使很小
3. 总字数≤100字
4. 返回JSON：{title: "4-8字标题", story: "..."}`;

      const res = await fetch(`${llmBase}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + llmKey },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || "deepseek-chat",
          messages: [{ role: "system", content: "你生成周进步故事，JSON格式。" }, { role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
      title = parsed.title || "";
      story = parsed.story || "";
    } catch { /* fallback below */ }

    if (!title) {
      title = `🌟 进步的一周`;
      story = `这一周训练了${daysActive}天，完成${completed}/${total}个任务。练习了${allWords.join("、")}，继续加油！`;
    }

    return NextResponse.json({ title, story, rate, completed, total, daysActive, words: allWords });
  } catch (err) {
    console.error("[API] /api/reports/weekly-story 错误:", err);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
