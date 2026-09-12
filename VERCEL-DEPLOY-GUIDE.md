# AVT 家长端 · Vercel 部署指南（阶段四·③）

> 配套《AVT 项目全面改善执行方案》阶段四（登录、部署与三层存储）。
> 本文聚焦**生产部署的硬性约束、环境变量配置、以及部署后必须手动完成的数据库收尾**。

---

## 0. 部署前置条件（先做完再点 Deploy）

| 序号 | 事项 | 必须在哪里做 | 说明 |
| --- | --- | --- | --- |
| 1 | 在 Supabase 控制台执行迁移 015 → 016 → 018 → 017 → 019 | Supabase SQL Editor | 顺序很关键：先统一身份、再加列、再归档脏数据、最后新增 `_v2` 收紧策略。**阶段 B（020）先不跑**。 |
| 2 | 执行 `supabase/phase1_verification.sql` 做隔离验收 | Supabase SQL Editor | 脚本会用 `SET LOCAL "request.jwt.claims"` 模拟多角色 JWT，断言「未登录 0 行 / A 家长看不到 B 家长 / 治疗师仅己方 / 推荐定向」。全部 PASS 才算验收通过。 |
| 3 | 验收通过后，执行 `supabase/migrations/020_rls_drop_old.sql` | Supabase SQL Editor | 头注「仅验收通过后执行」。删掉旧 `public_*` 三条全开放策略，留 `_v2` 收紧策略生效。 |
| 4 | 回填身份字段（仅当已存在历史 `users` 行时） | Supabase SQL Editor | 见文末「部署后收尾」。 |
| 5 | 清理 `__selftest__` / 测试脏数据 | Supabase SQL Editor 或运维端点 | 见文末「部署后收尾」。 |

> ⚠️ **没有 Supabase CLI 链接**，因此所有 DDL / RLS 只能手动在 SQL Editor 执行，无法走 `supabase db push`。这是当前环境限制，不影响产物本身。

---

## 1. 环境变量（Vercel Project → Settings → Environment Variables）

### 1.1 前端可暴露（Vercel 中设为任意环境均可）

```
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的-anon-public-key
```

- 这两个带 `NEXT_PUBLIC_` 前缀，**会被打包进浏览器 JS**，但**只有 anon key 是安全的**——它受 RLS 保护，本身不能越权。
- 来源：Supabase 控制台 Project Settings → API。

### 1.2 仅服务端（Vercel 中务必**取消**勾选「Expose to client-side code」）

```
SUPABASE_SERVICE_ROLE_KEY=你的-service-role-secret-key
ADMIN_MAINTENANCE_ENABLED=false
ADMIN_ALLOWED_EMAILS=admin@example.com
```

- `SUPABASE_SERVICE_ROLE_KEY`：**绕过 RLS 的全能钥匙**，等同数据库管理员。
  **绝不可**加 `NEXT_PUBLIC_` 前缀、绝不可进 git、绝不可出现在任何前端代码里。
  它只被 `src/app/api/admin/maintenance/route.ts` 的服务端代码读取。
- `ADMIN_MAINTENANCE_ENABLED`：运维通道总开关，默认 `false`（关闭）。需要清理脏数据时临时置 `true`。
- `ADMIN_ALLOWED_EMAILS`：逗号分隔的管理员邮箱白名单；调用 `/api/admin/maintenance` 时服务端用 service key 解析请求者 email 并比对。

### 1.3 可选（用到才填）

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
# LLM_API_KEY=sk-xxxx
# LLM_BASE_URL=https://api.deepseek.com/v1
# LLM_MODEL=deepseek-chat
```

> 规则：**所有可选 key 也都不要加 `NEXT_PUBLIC_`**，除非明确需要浏览器使用。`VAPID_PUBLIC_KEY` 的 public 部分才允许暴露。

---

## 2. HTTPS 是硬需求（不是建议）

Email magic link 登录（`signInWithOtp({ email, options: { emailRedirectTo } })`）依赖 Supabase 把带 token 的链接发到邮箱，用户点击后浏览器端 `detectSessionInUrl: true` 自动接管会话。这条链路要求：

1. **生产域名必须是 HTTPS**——`emailRedirectTo` 若设为 `http://`（明文），Supabase 会拒绝或邮件被标脏。
2. 在 Supabase 控制台 **Auth → URL Configuration** 中把 Vercel 生产域名加入：
   - Site URL：`https://你的域名`
   - Redirect URLs：至少包含 `https://你的域名/parent`（magic link 回调）以及其它需要回跳的路由。
3. **本地开发**可用 `http://localhost:3000`（Supabase 默认放行 localhost），但**线上绝不可降级到 HTTP**。

> 关联代码：`src/lib/supabase.ts` 的 `detectSessionInUrl: true` 已开启；`src/app/login/page.tsx` 的 `handleSendEmailLink` 用 `window.location.origin + "/parent"` 作为回跳地址，生产下即 HTTPS 域名。

---

## 3. Vercel 构建设置

| 项 | 值 |
| --- | --- |
| Framework Preset | Next.js |
| Build Command | `next build`（默认） |
| Output | 自动 |
| Node Version | 22（与本地 managed runtime 一致，Vercel 选 22.x） |
| Install Command | `npm install`（或 `pnpm install`，与仓库 lockfile 一致） |

- 本项目是 **Next.js 14 App Router**，API 路由（`/api/admin/maintenance`）在 Vercel 的 Node 函数环境中运行，能正确读取服务端环境变量。
- 部署后务必跑一次 `tsc --noEmit` 已在本地通过（EXIT=0），构建期不会因类型错误失败。

---

## 4. 部署后收尾（仍需手动，但很小）

### 4.1 身份字段回填（仅当已存在历史 `users` 行）
迁移 015 只保证**此后**新建的 `auth.users` 自动带 `users` 行（触发器）。若部署前已有业务用户，执行：

```sql
-- 仅回填已存在且 auth_user_id 为空的行
UPDATE users
SET auth_user_id = id
WHERE auth_user_id IS NULL;
```

### 4.2 清理测试 / 脏数据
- 删除 `task_voice_ratings` (`task_id`) / `practice_voice_ratings` (`content_id`) 里含 `__selftest__` 的自测行：
  ```sql
  -- 也可用仓库根 supabase/cleanup_selftest_row.sql（只清 task_voice_ratings）
  DELETE FROM task_voice_ratings      WHERE task_id   = '__selftest__';
  DELETE FROM practice_voice_ratings WHERE content_id = '__selftest__';
  ```
  或用运维端点（需 `ADMIN_MAINTENANCE_ENABLED=true` + 白名单邮箱 + 自己的登录 token）：
  ```bash
  curl -X POST https://你的域名/api/admin/maintenance \
    -H "Authorization: Bearer <你的登录token>" \
    -H "Content-Type: application/json" \
    -d '{"action":"deleteRow","table":"task_voice_ratings","id":"<行id>"}'
  ```
- 行数核对：
  ```bash
  curl -X POST https://你的域名/api/admin/maintenance \
    -H "Authorization: Bearer <你的登录token>" \
    -H "Content-Type: application/json" \
    -d '{"action":"tableStats"}'
  ```

### 4.3 最后一道 RLS 校验
验收通过后，`phase1_verification.sql` 再跑一遍，确认 `_v2` 策略已生效、旧 `public_*` 策略已消失（020 执行后）。

---

## 5. 密钥安全红线（上线前后都别破）

- ❌ 不要在前端 import / fetch `SUPABASE_SERVICE_ROLE_KEY`。
- ❌ 不要把 `service_role` key 写进 `NEXT_PUBLIC_*` 或任何 `.tsx` / 静态资源。
- ❌ 不要提交 `.env.local`（已确认在 `.gitignore` 中；当前 git 仓库 0 提交，无历史泄漏风险）。
- ✅ service key 只存在于 Vercel 服务端环境变量 + 本地 `.env.local`。
- ✅ 测试 / 演示用的「体验模式」「测试模式匿名登录」不应作为生产主路径；生产应走 Email magic link（或后续真实手机号 OTP）。

---

## 6. 回滚预案

若上线后发现 RLS 误伤（例如家长看不到自己的数据）：
1. 临时恢复阶段 A 的 `public_*` 旧策略（从 020 文件注释里找回 DDL 或在 SQL Editor 重新 `CREATE POLICY`），恢复全开放。
2. 排查 `auth.my_baby_ids()` / `baby_id` 写入是否缺失（应用层 `getStoredBabyId()` 是否被正确调用）。
3. 定位根因后再跑 019 / 020 收紧，不要长期停留在全开放。

---

_部署指南与《阶段五·整合验收与上线门槛》文档配套使用。_
