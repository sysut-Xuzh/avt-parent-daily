// 测试 Supabase Storage 上传权限（临时诊断脚本）
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tekrqwudpvzrklnjotmf.supabase.co";
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || require("fs").readFileSync(
  "C:\\Users\\徐子涵\\AppData\\Roaming\\reasonix\\global-workspace\\avt-parent-daily\\.env.local", "utf8"
).match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function main() {
  // 测试1: 直接 PUT 到 Storage
  console.log("=== 测试1: 直接 PUT webm 到 Storage ===");
  try {
    const res = await fetch(`${SUPA_URL}/storage/v1/object/audio-recordings/diag-test.webm`, {
      method: "PUT",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "audio/webm",
        "x-upsert": "true",
      },
      body: new Uint8Array([0, 1, 2, 3, 4]),
    });
    const text = await res.text();
    console.log(`  状态: ${res.status}`);
    console.log(`  响应: ${text}`);
  } catch (e) {
    console.log(`  异常: ${e.message}`);
  }

  // 测试2: 列出文件（检查 SELECT 策略影响）
  console.log("\n=== 测试2: 列出 storage 文件列表 ===");
  try {
    const res = await fetch(`${SUPA_URL}/storage/v1/object/list/audio-recordings`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefix: "", limit: 10 }),
    });
    const text = await res.text();
    console.log(`  状态: ${res.status}`);
    console.log(`  响应: ${text.substring(0, 300)}`);
  } catch (e) {
    console.log(`  异常: ${e.message}`);
  }
}

main();
