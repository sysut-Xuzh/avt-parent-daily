# Supabase 控制台执行包（粘贴即用）

本文件夹的文件**按执行顺序编号**，请依次在 Supabase 控制台 → SQL Editor 中打开、整段粘贴、点击「Run」。

| 文件 | 对应步骤 | 何时运行 |
| --- | --- | --- |
| `01_stage1_migrations.sql` | 迁移 015→016→018→017→019 | 第一步 |
| `02_stage2_verification.sql` | 阶段一验收（Part A 灰度期 / Part B 收紧后） | 第二步（跑 A）；第四步（跑 B） |
| `03_stage3_drop_old.sql` | 迁移 020（删旧全开放策略） | 第三步 |
| `04_stage4_backfill_cleanup.sql` | 历史行回填 + 清理 `__selftest__` | 第五步 |

> ⚠️ 关键：SQL Editor 默认以 **绕过 RLS 的角色** 执行，所以 `02` 的隔离测试里特意用了 `SET ROLE authenticated/anon` 让 RLS 真正生效。
> 不要手动修改脚本里的 `SET ROLE` 行，否则测试会失真。
>
> 📌 所有脚本均使用 `IF NOT EXISTS` / `DROP POLICY IF EXISTS`，可重复粘贴不报错（除 `017` 归档 INSERT 重复跑会主键冲突，已注明只跑一次）。
