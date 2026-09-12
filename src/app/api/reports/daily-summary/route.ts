// POST /api/reports/daily-summary — 今日小结生成（LLM）
// 读取今日数据 → 调用LLM → 返回鼓励文案

import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { babyId } = await request.json();
    // 用本地时区日期（与 /api/tasks/today 一致）
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // 1. 获取今日数据
    const plans = await fetch(
      `${SUPA_URL}/rest/v1/daily_plans?select=id&date=eq.${today}&limit=1`,
      { cache: "no-store", headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } }
    ).then(r => r.json());

    if (!plans || plans.length === 0) {
      return NextResponse.json({ summary: "今天还没有训练计划哦，去治疗师那里看看吧 😊", suggestion: "" });
    }

    const tasks = await fetch(
      `${SUPA_URL}/rest/v1/tasks?select=time,scene,scene_icon,strategy,target_word,status&daily_plan_id=eq.${plans[0].id}&order=sort_order.asc`,
      { cache: "no-store", headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } }
    ).then(r => r.json());

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ summary: "今天还没有任务哦 😊", suggestion: "" });
    }

    const total = tasks.length;
    const completed = tasks.filter((t: any) => t.status === "completed").length;
    const rate = Math.round((completed / total) * 100);
    const words = Array.from(new Set(tasks.map((t: any) => t.target_word)));
    const scenes = Array.from(new Set(tasks.map((t: any) => t.scene)));

    // 2. 调用 LLM
    const llmKey = process.env.LLM_API_KEY || "";
    const llmBase = process.env.LLM_BASE_URL || "https://api.deepseek.com/v1";

    const prompt = `你是一位AVT康复助手。请根据以下数据，生成今日完成小结。

【今日执行数据】
• 日期：${today}
• 计划任务：${total}个
• 完成任务：${completed}个
• 完成率：${rate}%
• 执行的场景：${scenes.join("、")}
• 练习的目标词：${words.join("、")}

要求：
1. 以鼓励为主，无论完成多少
2. 如完成率<50%，降低期望（"今天可以先休息"）
3. 如连续打卡≥7天，特别庆祝（可添加数据）
4. 一句话建议明天可以尝试什么
5. 总字数≤80字

输出JSON：{summary: "...", suggestion: "..."}`;

    let summary = "";
    let suggestion = "";

    try {
      const llmRes = await fetch(`${llmBase}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + llmKey },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || "deepseek-chat",
          messages: [
            { role: "system", content: "你是AVT康复助手，生成鼓励性小结。只返回JSON。" },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });
      const llmData = await llmRes.json();
      const content = llmData.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(content);
      summary = parsed.summary || "";
      suggestion = parsed.suggestion || "";
    } catch {
      // LLM 调用失败时用本地生成的小结
      if (rate >= 100) {
        summary = `🎉 太棒了！今天${total}个任务全部完成！${words.slice(0, 3).join("、")}都练习到了，继续加油！`;
      } else if (rate >= 50) {
        summary = `👏 今天完成了${completed}/${total}个任务，很不错！「${words[0] || ""}」的练习效果很好。`;
      } else {
        summary = `😊 今天完成了${completed}/${total}个任务，辛苦了。明天继续加油！`;
      }
      suggestion = `明天可以试试在${scenes[0] || "日常活动"}中练习「${words[0] || ""}」。`;
    }

    return NextResponse.json({ summary, suggestion, rate, completed, total });
  } catch (err) {
    console.error("[API] /api/reports/daily-summary 错误:", err);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
