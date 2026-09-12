// POST /api/sms/send — 发送短信验证码（Supabase Custom SMS Provider 回调）
// Supabase 会向此接口 POST：{ phone, message, channel }
// message 形如 "Your code is 123456" 或 "你的验证码是 123456"
import { NextRequest, NextResponse } from "next/server";
import { sendSmsCode } from "@/lib/aliyun-sms";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phone = body.phone || "";
    const message = body.message || "";

    if (!phone) {
      return NextResponse.json({ error: "缺少手机号" }, { status: 400 });
    }

    // 从 Supabase 消息中提取 6 位验证码
    // 兼容格式："Your code is 123456" / "你的验证码是 123456" / "123456 is your code"
    const codeMatch = message.match(/\b(\d{6})\b/);
    const code = codeMatch ? codeMatch[1] : "";

    if (!code) {
      console.warn("[SMS] 未能从消息提取验证码:", message);
      return NextResponse.json({ error: "无法解析验证码" }, { status: 400 });
    }

    // 手机号规范化：Supabase 传的可能是 +86138xxxx，转成 138xxxx
    const normalizedPhone = phone.replace(/^\+86/, "");

    const result = await sendSmsCode(normalizedPhone, code);

    if (!result.success) {
      console.error("[SMS] 发送失败:", result.message);
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[SMS] 接口错误:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
