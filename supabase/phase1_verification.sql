-- =============================================================
-- 阶段一 · 验收验证脚本（对应 1.2 验收清单）
-- 在 Supabase SQL Editor（以 postgres / service_role 角色）执行。
-- 隔离类检查用"模拟 JWT"技术：临时把 request.jwt.claims 设为某用户，
--   使后续 SELECT 在 RLS 下以该用户身份求值。
-- 用法：把 <用户A_UUID> / <用户B_UUID> / <治疗师_UUID> 换成真实 id。
-- =============================================================

-- 0. 旧策略应已全部 DROP（验收项⑥）
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('task_voice_ratings','practice_voice_ratings','therapist_recommendations')
  AND policyname LIKE 'public_%';   -- 013/014 创建的旧策略名以 public_ 开头；结果应为 0 行

-- 0b. 新策略应存在（019 创建，_v2 后缀）
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE policyname LIKE '%_v2'
ORDER BY tablename;

-- 1. 未登录（匿名）SELECT → 0 行（验收项①）
--    模拟：清空 claims，角色设为 anon
SET LOCAL "request.jwt.claims" TO '{}';
SELECT count(*) AS anon_task_ratings FROM task_voice_ratings;   -- 期望 0
SELECT count(*) AS anon_reco       FROM therapist_recommendations; -- 期望 0
RESET "request.jwt.claims";

-- 2. 家长A 看不到 家长B 的评级（验收项②）
--    准备：先插入两条分别归属 A、B 的测试行（baby_A 属 A，baby_B 属 B）
SET LOCAL "request.jwt.claims" TO json_build_object('sub','<用户A_UUID>','role','authenticated')::text;
SELECT count(*) AS a_sees FROM task_voice_ratings;  -- 应只含 baby_A 归属行，不含 baby_B
RESET "request.jwt.claims";

-- 3. 双娃切换：家长A 切到 baby_B 后只看到 baby_B（验收项③）
SET LOCAL "request.jwt.claims" TO json_build_object('sub','<用户A_UUID>','role','authenticated')::text;
SELECT count(*) FILTER (WHERE baby_id = '<baby_A_UUID>') AS a_babyA,
       count(*) FILTER (WHERE baby_id = '<baby_B_UUID>') AS a_babyB
FROM task_voice_ratings;  -- a_babyA / a_babyB 应分别只统计各自归属
RESET "request.jwt.claims";

-- 4. 治疗师仅看己方桥表家庭（验收项④）
SET LOCAL "request.jwt.claims" TO json_build_object('sub','<治疗师_UUID>','role','authenticated')::text;
SELECT count(*) AS therapist_sees FROM task_voice_ratings; -- 应仅含其 family_therapists 内 baby 的行
RESET "request.jwt.claims";

-- 5. 推荐定向：治疗师给家庭X推 → 仅家庭X家长可见（验收项⑤）
--    插入 therapist_recommendations(baby_id=<baby_X_UUID>, therapist_id=<治疗师_UUID>)
--    家长X（parent of baby_X）应 SELECT 到 1 行；家长Y 应 0 行。
SET LOCAL "request.jwt.claims" TO json_build_object('sub','<家长X_UUID>','role','authenticated')::text;
SELECT count(*) AS parentX_sees FROM therapist_recommendations WHERE baby_id = '<baby_X_UUID>'; -- 期望 1
RESET "request.jwt.claims";
SET LOCAL "request.jwt.claims" TO json_build_object('sub','<家长Y_UUID>','role','authenticated')::text;
SELECT count(*) AS parentY_sees FROM therapist_recommendations WHERE baby_id = '<baby_X_UUID>'; -- 期望 0
RESET "request.jwt.claims";

-- 6. tsc --noEmit 0 错误（CI/本地执行：node_modules/.bin/tsc --noEmit）——本脚本不覆盖，需另行运行。
-- 7. 全功能手动走查：登录→建档→任务录音→日历⭐→治疗师推荐→家长端可见，按 /parent、/therapist 实测。
