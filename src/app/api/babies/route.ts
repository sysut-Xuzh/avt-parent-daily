// GET /api/babies — 获取宝宝列表；POST /api/babies — 创建宝宝（家长注册时调用）
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 从请求头读取用户 JWT，创建带用户身份的 Supabase 客户端
function getAuthedClient(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  return createClient(SUPA_URL, SUPA_KEY, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    auth: { persistSession: false },
  });
}

export async function GET() {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/babies?select=id,name&order=name.asc`, {
      cache: "no-store",
      headers: { apiKey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY },
    });
    if (!res.ok) return NextResponse.json({ babies: [] });
    const data = await res.json();
    return NextResponse.json({ babies: data || [] });
  } catch {
    return NextResponse.json({ babies: [] });
  }
}

// POST /api/babies — 创建宝宝
// body: { name, birthDate?, hearingStatus?, avtStage?, role? }
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
    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "缺少宝宝姓名" }, { status: 400 });
    }

    // 确保 users 业务表有该用户（防止 babies.parent_id 外键失败）
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!existingUser) {
      const roleGuess = body.role || "parent";
      await supabase.from("users").upsert(
        {
          id: user.id,
          role: roleGuess,
          name: roleGuess === "therapist" ? "治疗师" : "家长",
        },
        { onConflict: "id" }
      );
    }

    const insertObj: Record<string, unknown> = { parent_id: user.id, name };
    if (body.birthDate) insertObj.birth_date = body.birthDate;
    if (body.hearingStatus) insertObj.hearing_status = body.hearingStatus;
    if (body.avtStage) insertObj.avt_stage = body.avtStage;

    const { data: baby, error } = await supabase
      .from("babies")
      .insert(insertObj)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: "创建宝宝失败: " + error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, baby });
  } catch (err) {
    console.error("[API] /api/babies 错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
