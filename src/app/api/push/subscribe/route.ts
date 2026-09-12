// POST /api/push/subscribe
// 前端推送订阅注册 — 保存到 push_subscriptions 表

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 默认用户 ID（与 constants.ts 中 DEFAULT_BABY_ID 的 parent 一致）
const DEFAULT_USER_ID = "a0000000-0000-0000-0000-000000000001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, keys, browserInfo } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "缺少推送订阅信息（endpoint / keys）" },
        { status: 400 }
      );
    }

    // upsert 到 push_subscriptions 表
    const res = await fetch(`${SUPA_URL}/rest/v1/push_subscriptions`, { cache: "no-store", method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: "Bearer " + SUPA_KEY,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        user_id: DEFAULT_USER_ID,
        endpoint: endpoint,
        p256dh_key: keys.p256dh,
        auth_key: keys.auth,
        device_info: browserInfo || "unknown",
        active: true,
      }), });

    if (!res.ok) {
      const text = await res.text();
      console.error("[Push] 订阅保存失败:", res.status, text);
      // 如果是 RLS 或外键问题，给出明确提示
      if (res.status === 403) {
        return NextResponse.json(
          { error: "数据库权限不足，请先运行 fix_rls_and_data.sql" },
          { status: 500 }
        );
      }
      if (res.status === 400 || res.status === 409) {
        // 可能是外键约束（user_id 不存在）或重复订阅
        // 尝试更新已有记录
        const updateRes = await fetch(
          `${SUPA_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
          {
            method: "PATCH",
            headers: {
              apikey: SUPA_KEY,
              Authorization: "Bearer " + SUPA_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              p256dh_key: keys.p256dh,
              auth_key: keys.auth,
              active: true,
              updated_at: new Date().toISOString(),
            }),
          }
        );
        if (updateRes.ok) {
          return NextResponse.json({ success: true, note: "更新已有订阅" });
        }
        return NextResponse.json(
          { error: "订阅保存失败，请先运行 fix_rls_and_data.sql 确保默认用户存在" },
          { status: 500 }
        );
      }
      throw new Error(`保存失败 (${res.status}): ${text}`);
    }

    console.log("[Push] 订阅保存成功");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] /push/subscribe 错误:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "订阅失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/push/subscribe — 取消订阅
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json(
        { error: "缺少 endpoint 参数" },
        { status: 400 }
      );
    }

    await fetch(
      `${SUPA_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPA_KEY,
          Authorization: "Bearer " + SUPA_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: false }),
      }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] /push/subscribe 删除错误:", err);
    return NextResponse.json(
      { error: "取消订阅失败" },
      { status: 500 }
    );
  }
}
