// 诊断：家长端 API 实际查的日计划
const SUPA_URL = "https://tekrqwudpvzrklnjotmf.supabase.co";
const SUPA_KEY = require("fs").readFileSync(
  "C:\\Users\\徐子涵\\AppData\\Roaming\\reasonix\\global-workspace\\avt-parent-daily\\.env.local", "utf8"
).match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const headers = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };

async function main() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  console.log("本地今天:", today);

  // 家长端 API 的查询：baby_id = DEFAULT_BABY_ID = b0000000-...001
  const babyId = "b0000000-0000-0000-0000-000000000001";
  const plans = await fetch(`${SUPA_URL}/rest/v1/daily_plans?select=id&baby_id=eq.${babyId}&date=eq.${today}`, { headers }).then(r => r.json());
  console.log("家长端查到的日计划:", plans.map(p => p.id));

  // 每个日计划下的任务
  for (const p of plans) {
    const tasks = await fetch(`${SUPA_URL}/rest/v1/tasks?select=target_word,status,sort_order&daily_plan_id=eq.${p.id}&order=sort_order.asc`, { headers }).then(r => r.json());
    console.log(`日计划 ${p.id.slice(0,8)} 任务:`);
    tasks.forEach(t => console.log(`  ${t.target_word} sort=${t.sort_order} status=${t.status}`));
  }
}
main();
