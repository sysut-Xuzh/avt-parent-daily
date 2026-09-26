// GET /api/dashboard — 治疗师 Dashboard 数据
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function headers() {
  return { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY };
}

export async function GET(request: NextRequest) {
  try {
    const babyId = request.nextUrl.searchParams.get("babyId") || "";
    const babyName = request.nextUrl.searchParams.get("babyName") || "";

    // 根据名字查 UUID
    let filteredBabyId = babyId;
    if (babyName && !filteredBabyId) {
      const bRes = await fetch(`${SUPA_URL}/rest/v1/babies?select=id&name=eq.${encodeURIComponent(babyName)}&limit=1`, { cache: "no-store", headers: headers()  }).then(r => r.json());
      if (bRes?.[0]?.id) filteredBabyId = bRes[0].id;
    }

    // 获取日计划（可选过滤宝宝）
    let plansUrl = `${SUPA_URL}/rest/v1/daily_plans?select=id,date,baby_id&order=date.desc`;
    if (filteredBabyId) plansUrl += `&baby_id=eq.${filteredBabyId}`;
    const plans = await fetch(plansUrl, { cache: "no-store", headers: headers()  }).then(r => r.json());

    // 选中具体孩子时，只对投该孩子做异常检测（防止遍历全库、跨家庭泄漏）
    const babiesUrl = filteredBabyId
      ? `${SUPA_URL}/rest/v1/babies?select=id,name&id=eq.${filteredBabyId}`
      : `${SUPA_URL}/rest/v1/babies?select=id,name`;
    const babies = await fetch(babiesUrl, { cache: "no-store", headers: headers() }).then(r => r.json());

    let allTasks: any[] = [];
    for (const p of (plans || []).slice(0, 20)) {
      const tasks = await fetch(`${SUPA_URL}/rest/v1/tasks?select=daily_plan_id,status,strategy,target_word,completed_at&daily_plan_id=eq.${p.id}&limit=20`, { cache: "no-store", headers: headers() }).then(r => r.json());
      if (tasks) allTasks = allTasks.concat(tasks.map((t: any) => ({ ...t, date: p.date })));
    }

    // 日完成率
    const dateMap = new Map<string, { completed: number; total: number }>();
    for (const t of allTasks) {
      if (!t.date) continue;
      const g = dateMap.get(t.date) || { completed: 0, total: 0 };
      g.total++; if (t.status === "completed") g.completed++;
      dateMap.set(t.date, g);
    }
    const dailyRates = Array.from(dateMap.entries()).map(([date, g]) => ({
      date, completed: g.completed, total: g.total,
      rate: Math.round((g.completed / g.total) * 100),
    })).sort((a, b) => a.date.localeCompare(b.date));

    // 策略分布
    const stratMap = new Map<string, number>();
    for (const t of allTasks) { if (t.strategy) stratMap.set(t.strategy, (stratMap.get(t.strategy) || 0) + 1); }
    const strategyDistribution = Array.from(stratMap.entries()).map(([name, count]) => ({ name, count }));

    // 热力图
    const heatMap = new Map<string, Map<string, boolean>>();
    for (const t of allTasks) {
      if (!t.target_word || !t.date) continue;
      if (!heatMap.has(t.date)) heatMap.set(t.date, new Map());
      heatMap.get(t.date)!.set(t.target_word, t.status === "completed");
    }
    const heatmapData = Array.from(heatMap.entries()).map(([date, words]) => ({
      date, words: Array.from(words.entries()).map(([word, done]) => ({ word, done })),
    }));

    // 异常检测
    const anomalyBabies: any[] = [];
    for (const baby of (babies || [])) {
      const babyPlans = (plans || []).filter((p: any) => p.baby_id === baby.id);
      let gaps = 0;
      for (const p of babyPlans.slice(0, 7)) {
        const done = allTasks.filter((t: any) => t.daily_plan_id === p.id && t.status === "completed").length;
        if (done === 0) gaps++; else gaps = 0;
      }
      if (gaps >= 3) anomalyBabies.push({ babyId: baby.id, babyName: baby.name, status: "danger" });
    }

    // 徽章
    const badges = {
      weekStreak: dailyRates.filter(d => d.rate > 0).length,
      totalCompleted: allTasks.filter((t: any) => t.status === "completed").length,
      auditoryFirstCount: allTasks.filter((t: any) => t.strategy === "听觉先行" && t.status === "completed").length,
    };

    return NextResponse.json({
      dailyRates, strategyDistribution, heatmapData, anomalyBabies, badges,
      totalFamilies: babies?.length || 0,
      weekTotal: allTasks.length,
      weekCompleted: allTasks.filter((t: any) => t.status === "completed").length,
    });
  } catch (err) {
    console.error("[API] /api/dashboard 错误:", err);
    return NextResponse.json({ error: "获取数据失败" }, { status: 500 });
  }
}
