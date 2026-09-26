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
// body: { action: "create" | "join", babyName? | babyId?, code?, role? }
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
    const roleGuess: string = body.role || "parent";
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!existingUser) {
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
      // 创建家庭：先确定宝宝（按名查找，找不到则创建）
      let babyId: string | null = body.babyId || null;
      if (!babyId && body.babyName) {
        const { data: found } = await supabase
          .from("babies")
          .select("id")
          .eq("name", body.babyName)
          .limit(1);
        if (found && found.length > 0) {
          babyId = found[0].id;
        } else {
          const { data: newBaby, error: babyErr } = await supabase
            .from("babies")
            .insert({
              parent_id: user.id,
              name: body.babyName,
              ...(body.birthDate ? { birth_date: body.birthDate } : {}),
            })
            .select("id")
            .single();
          if (babyErr || !newBaby) {
            return NextResponse.json(
              { error: `创建宝宝失败: ${babyErr?.message || "未知错误"}` },
              { status: 500 }
            );
          }
          babyId = newBaby.id;
        }
      }
      if (!babyId) {
        return NextResponse.json(
          { error: "缺少宝宝信息（请填写宝宝姓名）" },
          { status: 400 }
        );
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

      // 创建者自动加入家庭成员
      const { error: memberError } = await supabase
        .from("family_members")
        .insert({ family_id: inserted.id, user_id: user.id, role: roleGuess })
        .select()
        .single();
      if (memberError) {
        return NextResponse.json(
          { error: `家庭码已创建但加入失败: ${memberError.message}` },
          { status: 500 }
        );
      }

      // 治疗师创建时，建立 family_therapists 关联
      if (roleGuess === "therapist") {
        await supabase
          .from("family_therapists")
          .insert({ baby_id: babyId, therapist_id: user.id })
          .select()
          .single();
      }

      return NextResponse.json({ success: true, family: inserted });
    }

    if (action === "join") {
      const code = (body.code || "").toUpperCase().trim();
      if (!code) {
        return NextResponse.json({ error: "缺少家庭码" }, { status: 400 });
      }
      // 查家庭（按 code 精确查询）
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
      // 治疗师加入时，建立 family_therapists 关联（用于治疗师端查看负责家庭）
      if (role === "therapist") {
        await supabase
          .from("family_therapists")
          .insert({ baby_id: family.baby_id, therapist_id: user.id })
          .select()
          .single();
      }
      return NextResponse.json({ success: true, family });
    }

    return NextResponse.json({ error: "未知 action" }, { status: 400 });
  } catch (err) {
    console.error("[API] /api/families 错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// GET /api/families — 查询当前用户的家庭 / 治疗师负责的孩子
export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("action");
    if (action === "my-babies") {
      return await getMyBabies(request);
    }

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

// GET /api/families?action=my-babies
// 治疗师 / 家庭成员可见的"负责孩子"列表。
// 关键点：用带 JWT 的 authed 客户端查询，RLS（babies_therapist / babies_family_member）
// 已按 auth.uid() 隔离，只会返回当前用户通过 family_therapists / family_members 关联的宝宝，
// 不会泄漏其他家庭的宝宝。
async function getMyBabies(request: NextRequest) {
  try {
    const supabase = getAuthedClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { data: babies, error } = await supabase
      .from("babies")
      .select("id, name")
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ babies: babies || [] });
  } catch (err) {
    console.error("[API] /api/families my-babies 错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
