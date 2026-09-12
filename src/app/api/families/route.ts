// 家庭码 API：创建 / 加入 / 查询
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
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: { persistSession: false },
  });
}

// 生成家庭码：AVT-XXXX（4位字母数字）
function generateFamilyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉易混淆 I/O/0/1
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `AVT-${code}`;
}

// POST /api/families
// body: { action: "create" | "join", babyName?, code? }
export async function POST(request: NextRequest) {
  try {
    const supabase = getAuthedClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "未登录，请重新登录" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // 确保 users 业务表有该用户（防止 families.created_by 外键失败）
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

    if (action === "create") {
      // 创建家庭码：需要指定宝宝（用宝宝名字查）
      const babyName = body.babyName;
      if (!babyName) {
        return NextResponse.json({ error: "缺少宝宝名称" }, { status: 400 });
      }
      // 查宝宝（已登录用户可读，靠 babies_authenticated_read 策略）
      const { data: babies } = await supabase
        .from("babies")
        .select("id")
        .eq("name", babyName)
        .limit(1);
      const babyId = babies?.[0]?.id;
      if (!babyId) {
        return NextResponse.json({ error: `找不到宝宝 ${babyName}` }, { status: 404 });
      }

      // 生成唯一家庭码
      let code = generateFamilyCode();
      let inserted = null;
      let lastInsertError: string | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await supabase
          .from("families")
          .insert({ code, baby_id: babyId, created_by: user.id })
          .select()
          .single();
        if (!error) {
          inserted = data;
          break;
        }
        lastInsertError = error.message;
        code = generateFamilyCode(); // 冲突则重试
      }
      if (!inserted) {
        return NextResponse.json(
          { error: `创建家庭码失败: ${lastInsertError || "未知错误"}` },
          { status: 500 }
        );
      }

      // 创建者自动加入
      const { error: memberError } = await supabase
        .from("family_members")
        .insert({ family_id: inserted.id, user_id: user.id, role: "parent" })
        .select()
        .single();
      if (memberError) {
        return NextResponse.json(
          { error: `家庭码已创建但加入失败: ${memberError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, family: inserted });
    }

    if (action === "join") {
      const code = (body.code || "").toUpperCase().trim();
      if (!code) {
        return NextResponse.json({ error: "缺少家庭码" }, { status: 400 });
      }
      // 查家庭（按 code 精确查询，靠 families_lookup 策略；API 只允许按码查，无法列出全部）
      const { data: family } = await supabase
        .from("families")
        .select("id, code, baby_id")
        .eq("code", code)
        .maybeSingle();
      if (!family) {
        return NextResponse.json({ error: "家庭码不存在" }, { status: 404 });
      }
      // 加入（角色由 body 指定，默认 parent）
      const role = body.role || "parent";
      const { error: joinError } = await supabase
        .from("family_members")
        .insert({ family_id: family.id, user_id: user.id, role });
      if (joinError) {
        return NextResponse.json(
          { error: "加入失败（可能已在该家庭）" },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, family });
    }

    return NextResponse.json({ error: "未知 action" }, { status: 400 });
  } catch (err) {
    console.error("[API] /api/families 错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// GET /api/families — 查询当前用户的家庭
export async function GET(request: NextRequest) {
  try {
    const supabase = getAuthedClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { data: memberships } = await supabase
      .from("family_members")
      .select("family_id, role")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ families: [] });
    }

    const familyIds = memberships.map((m) => m.family_id);
    const { data: families } = await supabase
      .from("families")
      .select("id, code, baby_id")
      .in("id", familyIds);

    return NextResponse.json({ families: families || [] });
  } catch (err) {
    console.error("[API] /api/families GET 错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
