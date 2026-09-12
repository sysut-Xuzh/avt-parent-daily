# AVT 项目 · Supabase / Vercel 上线分步手册

> 把《AVT 项目全面改善执行方案》里「需你在控制台/部署中手动完成」的 8 项，拆成可照做的步骤。
> 所有 SQL 已预先拼好，放在 `supabase/console/`，**逐个打开 → 全选复制 → 粘进 Supabase SQL Editor → Run**。

---

## 前置准备（一次性）
1. 打开 [supabase.com](https://supabase.com) → 进入你的项目。
2. 左侧菜单 **SQL Editor** → **New query**（空查询框）。
3. 备好以下两个值（Project Settings → API 页面）：
   - `Project URL`（形如 `https://xxxx.supabase.co`）
   - `anon public key` 与 `service_role secret key`（后者**只用于服务端/本地 .env.local，绝不进前端**）。

---

## 步骤 1 ｜迁移 015 → 016 → 018 → 017 → 019
- 打开 `supabase/console/01_stage1_migrations.sql`
- 全选复制 → 粘进 SQL Editor → **Run**
- ✅ 通过标志：底部出现多行 `ALTER TABLE` / `CREATE POLICY` / `CREATE TRIGGER` 成功提示，无红色 ERROR；最后一行返回 `Step1 OK`。
- ⚠️ 017 含归档 INSERT，**只跑一次**；若需重跑先 `DROP TABLE _archive_*`。

## 步骤 2 ｜隔离验收（灰度期 / Part A）
- 打开 `supabase/console/02_stage2_verification.sql`
- **只运行 Part A 部分**（从文件开头到 `Part A` 结束、`Part B` 之前）。
- ✅ 通过标志：
  - A0 策略清单能看到旧 `public_*` + 新 `*_access_v2` 共 9 条；
  - A1 输出 `✅ GATE OK（写入被拒）`（说明陌生人已插不进评级）。
- 若 `babies` 表为空，A1 会提示跳过 —— 属正常，可继续。

## 步骤 3 ｜执行 020（删旧全开放策略）
- 打开 `supabase/console/03_stage3_drop_old.sql` → 复制 → Run。
- ✅ 通过标志：多行 `DROP POLICY` 成功，末行 `Step3 OK`。

## 步骤 4 ｜隔离验收（收紧后 / Part B）
- 回到 `02_stage2_verification.sql`，**只运行 Part B 部分**（从 `Part B` 到文件末尾）。
- ✅ 通过标志：
  - B0：`public_%` 策略结果为 **0 行**，只剩 `*_access_v2`；
  - B2：匿名 `anon_ratings` / `anon_reco` 均为 **0**；
  - B3：本人 `owner` 两值均为 **1**；
  - B4：陌生人两值均为 **0**；
  - B5：`PartB cleanup done`。
- 若 `babies` 为空，B2–B4 会跳过，请部署后在应用内实测（登录→建档→录音→日历⭐）。

## 步骤 5 ｜历史行回填 + 清理 `__selftest__`
- 打开 `supabase/console/04_stage4_backfill_cleanup.sql` → 复制 → Run。
- ✅ 通过标志：
  - `users_needing_backfill` = **0**（若有孤立档案 >0，需人工核对）；
  - `leftover_task` / `leftover_practice` 均为 **0**（测试脏数据已清）。

> ✅ 至此数据库侧 8 项中前 6 项（迁移 / 验收 / 020 / 回填 / 清理）全部完成。

---

## 步骤 6 ｜`.env.local` / Vercel 填 `SUPABASE_SERVICE_ROLE_KEY`
**这是服务端密钥，绝不进前端、绝不进 git。**

### 6a. 本地 `.env.local`
项目根已有 `.env.local.example`。复制为 `.env.local` 并补全：
```env
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的-anon-public-key

# ↓↓↓ 仅服务端：service_role secret key（Project Settings → API → service_role）↓↓↓
SUPABASE_SERVICE_ROLE_KEY=你的-service-role-secret-key

ADMIN_MAINTENANCE_ENABLED=false
ADMIN_ALLOWED_EMAILS=admin@example.com
```

### 6b. Vercel（生产）
Vercel 项目 → **Settings → Environment Variables**，逐行添加：

| Key | Value | 注意 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://你的项目.supabase.co` | 可暴露前端 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key | 可暴露前端（受 RLS 保护） |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret key | **仅服务端**；Vercel 里**不要**勾选「Expose to client」 |
| `ADMIN_MAINTENANCE_ENABLED` | `false` | 运维通道总开关，平时关 |
| `ADMIN_ALLOWED_EMAILS` | `admin@example.com` | 逗号分隔白名单 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 等 | （用到推送才填） | 可选 |
| `LLM_API_KEY` 等 | （用到 AI 才填） | 可选 |

> 规则：**只有带 `NEXT_PUBLIC_` 前缀的才能进前端**。`SUPABASE_SERVICE_ROLE_KEY` 绝不能加此前缀。

## 步骤 7 ｜Supabase Auth 配 Email 回调（HTTPS）+ 重定向
Email magic link 依赖「Supabase 发带 token 的邮件 → 用户点击 → 浏览器端自动接管会话」，因此必须配置 HTTPS 回调：
1. Supabase 控制台 → **Authentication → URL Configuration**
2. **Site URL** 填：`https://你的生产域名`（如 `https://avt.example.com`）
3. **Redirect URLs** 至少加一条：`https://你的生产域名/parent`
   （代码里 `emailRedirectTo` 用的是 `window.location.origin + "/parent"`，生产下即 HTTPS 域名）
4. **Email Templates**：默认的 Magic Link 模板已包含 `{{ .SiteURL }}/auth/v1/verify?...&redirect_to=...`，无需改；如有自定义模板，确保链接带 `redirect_to`。
5. 本地开发可用 `http://localhost:3000`（Supabase 默认放行 localhost），但**线上必须 HTTPS**，不可降级。

## 步骤 8 ｜生产关闭 `testMode`（匿名登录演示开关）
文件：`src/app/login/page.tsx`，约第 25 行：
```ts
const testMode = true; // ← 真短信配置好后改成 false
```
改为：
```ts
const testMode = false; // 生产关闭匿名登录演示开关
```
- 含义：关闭「输入手机号即匿名登录」的演示后门；生产走 **Email magic link**（已就绪）或后续真实手机号 OTP。
- 副作用：关闭 `testMode` 后，手机号按钮会走真实 `signInWithOtp({phone})`，**需先在 Supabase Auth 配好 SMS Provider（Twilio / 阿里云）**；若暂未配置，手机号路径会发不出去——但匿名后门已封，安全目标达成。Email magic link 不受此影响，仍是可用主路径。
- 改完跑一次 `tsc --noEmit` 确认无错，再 `git commit` + 部署。

---

## 总验收清单（全部 ✅ 即满足上线门槛）
- [ ] 步骤1：迁移 015→016→018→017→019 执行成功（Step1 OK）
- [ ] 步骤2：Part A 验收通过（GATE OK）
- [ ] 步骤3：020 执行成功（旧 public_* 已删）
- [ ] 步骤4：Part B 验收通过（匿名0 / 本人1 / 陌生人0）
- [ ] 步骤5：回填 `users_needing_backfill=0`、脏数据 `leftover=0`
- [ ] 步骤6：`.env.local` 与 Vercel 均已填 `SUPABASE_SERVICE_ROLE_KEY`（仅服务端）
- [ ] 步骤7：Supabase Auth Site URL + Redirect URLs 配好 HTTPS
- [ ] 步骤8：`testMode=false` 已提交并部署

对应代码/SQL 产物位置：
- 迁移：`supabase/migrations/015~020`
- 验收脚本：`supabase/phase1_verification.sql`（原始版，含占位说明）
- 本手册执行包：`supabase/console/01~04` + 本文件
- 部署指南：`VERCEL-DEPLOY-GUIDE.md`
- 验收门槛文档：`docs/phase5_acceptance.md`
