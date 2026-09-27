// /api/custom-activities — 治疗师自定义训练类型 / 内容的 CRUD
// GET：列出当前治疗师自己创建的训练
// POST：新建一条
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
      .from("custom_activities")
      .select("id, title, category, description, target_words, instructions, animation_url, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ activities: data || [] });
  } catch (err) {
    console.error("[API] /api/custom-activities GET 错误:", err);
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
    if (!title) {
      return NextResponse.json({ error: "请填写训练名称" }, { status: 400 });
    }
    const targetWords = Array.isArray(body.targetWords)
      ? body.targetWords
      : (body.targetWords
          ? String(body.targetWords)
              .split(/[、，,\s]+/)
              .map((s: string) => s.trim())
              .filter(Boolean)
          : []);
    const { data, error } = await supabase
      .from("custom_activities")
      .insert({
        therapist_id: user.id,
        title,
        category: (body.category || "自定义训练").trim() || "自定义训练",
        description: body.description || "",
        target_words: targetWords,
        instructions: body.instructions || "",
        animation_url: body.animationUrl || null,
      })
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("[API] /api/custom-activities POST 错误:", err);
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
    // 用 therapist_id = user.id 约束，确保只能删自己的
    const { error } = await supabase
      .from("custom_activities")
      .delete()
      .eq("id", id)
      .eq("therapist_id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] /api/custom-activities DELETE 错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
