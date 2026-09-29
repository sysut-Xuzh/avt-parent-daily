// /api/feedback — 建议信箱 提交与查询
// POST：当前用户提交整体 + 三项核心功能评星 + 文字 + 标签
// GET：返回当前用户自己提交的反馈
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getAuthedClient(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  return createClient(SUPA_URL, SUPA_KEY, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    auth: { persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getAuthedClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const body = await request.json();
    const overall = Number(body.overall_star);
    if (!overall || overall < 1 || overall > 5) {
      return NextResponse.json({ error: "请先给整体满意度评分" }, { status: 400 });
    }
    const { error } = await supabase
      .from("feedback")
      .insert({
        user_id: user.id,
        overall_star: overall,
        rating_task: body.rating_task ? Number(body.rating_task) : null,
        rating_practice: body.rating_practice ? Number(body.rating_practice) : null,
        rating_hearing: body.rating_hearing ? Number(body.rating_hearing) : null,
        comment: body.comment || "",
        tags: Array.isArray(body.tags) ? body.tags : [],
      });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] /api/feedback POST 错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getAuthedClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const { data, error } = await supabase
      .from("feedback")
      .select("id, overall_star, rating_task, rating_practice, rating_hearing, comment, tags, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ items: data || [] });
  } catch (err) {
    console.error("[API] /api/feedback GET 错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
