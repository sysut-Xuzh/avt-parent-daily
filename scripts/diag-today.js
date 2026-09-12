// 模拟 /api/tasks/today 的完整查询逻辑，找问题
const SUPA_URL = "https://tekrqwudpvzrklnjotmf.supabase.co";
const SUPA_KEY = require("fs").readFileSync(
  "C:\\Users\\徐子涵\\AppData\\Roaming\\reasonix\\global-workspace\\avt-parent-daily\\.env.local", "utf8"
).match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const headers = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };

async function main() {
  // 1. 本地日期
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  console.log("本地今天:", today);

  // 2. 查今天的日计划（API 同款，不带 baby_id）
  const plans = await fetch(`${SUPA_URL}/rest/v1/daily_plans?select=id&date=eq.${today}`, { headers }).then(r => r.json());
  console.log("查到的日计划数:", plans.length);
  plans.forEach(p => console.log("  日计划:", p.id));

  // 3. in.() 查询任务
  const planIds = plans.map(p => p.id);
  const filter = planIds.join(",");
  console.log("filter:", filter);
  const tasks = await fetch(`${SUPA_URL}/rest/v1/tasks?select=id,target_word,status,sort_order,animation_url&daily_plan_id=in.(${filter})&order=sort_order.asc`, { headers }).then(r => r.json());
  console.log("查到的任务数:", tasks.length);
  tasks.forEach(t => console.log(`  id=${t.id.slice(0,8)} word=${t.target_word} status=${t.status} sort=${t.sort_order} anim=${t.animation_url || "无"}`));
}

main();
