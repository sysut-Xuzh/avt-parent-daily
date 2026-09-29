// /api/content-library — 治疗师内容策展 增删查
// GET ?mine=1：列出当前治疗师自己发布的；否则列出全部（家长浏览）
// GET ?type=xxx：按类型过滤
// POST：新建一条（therapist_id = 当前用户）
// DELETE?id=xxx：删除自己的一条
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

const VALID_TYPES = ["article", "paper", "book", "podcast"];

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
    const mine = request.nextUrl.searchParams.get("mine") === "1";
    const type = request.nextUrl.searchParams.get("type");
    let query = supabase
      .from("content_library")
      .select("id, therapist_id, type, title, url, summary, author, file_url, tags, created_at")
      .order("created_at", { ascending: false });
    if (mine) query = query.eq("therapist_id", user.id);
    if (type) query = query.eq("type", type);
    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ items: data || [] });
  } catch (err) {
    console.error("[API] /api/content-library GET 错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
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
    const title = (body.title || "").trim();
    const type = body.type;
    if (!title) {
      return NextResponse.json({ error: "请填写标题" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "类型不合法" }, { status: 400 });
    }
    const tags = Array.isArray(body.tags)
      ? body.tags
      : body.tags
        ? String(body.tags)
            .split(/[、，,\s]+/)
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];
    const { data, error } = await supabase
      .from("content_library")
      .insert({
        therapist_id: user.id,
        type,
        title,
        url: body.url || null,
        summary: body.summary || "",
        author: body.author || null,
        file_url: body.file_url || null,
        tags,
      })
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("[API] /api/content-library POST 错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getAuthedClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }
    const { error } = await supabase
      .from("content_library")
      .delete()
      .eq("id", id)
      .eq("therapist_id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] /api/content-library DELETE 错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
