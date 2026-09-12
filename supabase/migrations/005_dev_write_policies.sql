-- 开发阶段：允许匿名用户写入数据（上线前需改为仅认证用户）
CREATE POLICY "public_insert_daily_plans" ON daily_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "public_insert_tasks" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "public_insert_weekly_plans" ON weekly_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete_tasks" ON tasks FOR DELETE USING (true);
CREATE POLICY "public_update_tasks" ON tasks FOR UPDATE USING (true);
