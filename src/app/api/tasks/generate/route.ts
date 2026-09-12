// POST /api/tasks/generate
// 调用 LLM 根据周目标生成每日任务

import { NextRequest, NextResponse } from "next/server";
import { generateDailyTasks } from "@/lib/llm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { weekTargetWords, weekStrategies, babyAge, babyName } = body;

    if (!weekTargetWords || !Array.isArray(weekTargetWords)) {
      return NextResponse.json(
        { error: "缺少 weekTargetWords（目标词列表）" },
        { status: 400 }
      );
    }

    if (!weekStrategies || !Array.isArray(weekStrategies)) {
      return NextResponse.json(
        { error: "缺少 weekStrategies（策略列表）" },
        { status: 400 }
      );
    }

    const tasks = await generateDailyTasks({
      weekTargetWords,
      weekStrategies,
      babyAge,
      babyName,
    });

    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("[API] /tasks/generate 错误:", err);
    const message =
      err instanceof Error ? err.message : "生成任务失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
