// POST /api/admin/maintenance —— 受控运维通道（阶段二·钥匙2）
// 设计原则（对应方案"密钥三层模型"）：
//   - service_role key 仅存于 .env.local / 服务端环境变量，绝不进前端、绝不进 git
//   - 本端点由 Next.js 服务端代码持有 service key，用于清理脏数据 / 统计行数
//   - 访问保护：环境变量总开关 ADMIN_MAINTENANCE_ENABLED + 管理员邮箱白名单 ADMIN_ALLOWED_EMAILS
//   - 调用者需携带自身登录态 Bearer token；服务端用 service key 解析出 email 做白名单校验
//   - 仅开放白名单内的表，禁止任意表删除（防误删）
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 允许运维操作的表白名单（防止任意表删除）
const ALLOWED_TABLES = [
  "task_voice_ratings",
  "practice_voice_ratings",
  "therapist_recommendations",
];

function getServiceClient() {
  if (!SUPA_URL || !SERVICE_KEY) {
    throw new Error("缺少 SUPABASE_SERVICE_ROLE_KEY 或 NEXT_PUBLIC_SUPABASE_URL 配置");
  }
  return createClient(SUPA_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isEnabled(): boolean {
  return process.env.ADMIN_MAINTENANCE_ENABLED === "true";
}

function allowedEmails(): string[] {
  const raw = process.env.ADMIN_ALLOWED_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  // 1. 功能总开关
  if (!isEnabled()) {
    return NextResponse.json(
      { error: "运维通道未启用（ADMIN_MAINTENANCE_ENABLED != true）" },
      { status: 403 }
    );
  }
  // 2. 服务端必须配置 service key
  if (!SERVICE_KEY) {
    return NextResponse.json(
      { error: "服务端未配置 SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 }
    );
  }
  // 3. 校验调用者身份：用前端传来的 session token 经 service role 解析出 email
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "缺少 Authorization Bearer token" }, { status: 401 });
  }
  let callerEmail: string | null = null;
  try {
    const sb = getServiceClient();
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) {
      return NextResponse.json({ error: "无效或过期的登录态" }, { status: 401 });
    }
    callerEmail = (data.user.email || "").toLowerCase();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: "身份校验失败: " + msg }, { status: 401 });
  }
  // 4. 邮箱白名单
  const whitelist = allowedEmails();
  if (!callerEmail || !whitelist.includes(callerEmail)) {
    return NextResponse.json({ error: "无权限：不在管理员白名单" }, { status: 403 });
  }

  // 5. 解析并执行业务操作
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体非法" }, { status: 400 });
  }
  const action = body.action;
  try {
    const sb = getServiceClient();
    if (action === "deleteRow") {
      const table = String(body.table || "");
      const id = String(body.id || "");
      if (!table || !id) {
        return NextResponse.json({ error: "缺少 table 或 id" }, { status: 400 });
      }
      if (!ALLOWED_TABLES.includes(table)) {
        return NextResponse.json({ error: "表不在允许列表" }, { status: 400 });
      }
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, deleted: { table, id } });
    } else if (action === "tableStats") {
      const requested = Array.isArray(body.tables)
        ? (body.tables as unknown[]).map(String)
        : [];
      const tables = requested.length
        ? requested.filter((t) => ALLOWED_TABLES.includes(t))
        : ALLOWED_TABLES;
      const stats: Record<string, number> = {};
      for (const t of tables) {
        const { count, error } = await sb
          .from(t)
          .select("*", { count: "exact", head: true });
        stats[t] = error ? -1 : (count ?? -1);
      }
      return NextResponse.json({ ok: true, stats });
    }
    return NextResponse.json({ error: "未知 action" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "处理失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}
