// POST /api/push/send — 手动触发推送（测试用）

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 简化版推送发送（直接从后端用 web-push）
import webpush from "web-push";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails("mailto:contact@avt-assist.com", vapidPublicKey, vapidPrivateKey);
}

export async function POST(request: NextRequest) {
  try {
    const { taskId, title, body } = await request.json();

    if (!taskId) {
      return NextResponse.json({ error: "缺少 taskId" }, { status: 400 });
    }

    // 查找活跃的推送订阅
    const res = await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?select=endpoint,p256dh_key,auth_key&active=eq.true&limit=10`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    const subs = await res.json();

    if (!subs || subs.length === 0) {
      return NextResponse.json({ error: "没有推送订阅", hint: "请先在前端允许推送权限" }, { status: 404 });
    }

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
          JSON.stringify({
            title: title || "🧪 测试推送",
            body: body || "这是一条手动触发的测试通知",
            icon: "/icons/icon-192.svg",
            vibrate: [200, 100, 200],
            data: { taskId, manual: true },
          })
        );
        sent++;
      } catch {
        // 跳过过期订阅
      }
    }

    return NextResponse.json({ success: true, sent, total: subs.length });
  } catch (err) {
    console.error("[Push] 手动发送失败:", err);
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}
