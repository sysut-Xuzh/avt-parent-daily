# 阶段五 · 整合验收与上线门槛

> 配套《AVT 项目全面改善执行方案》。本文件给出**登录边界对照表**、**四项上线门槛的现状核验**、以及**五阶段完成度总表**，作为是否可以「正式上线」的判据。

---

## 一、登录边界对照表（阶段四·① 落地现状）

| 入口 | 当前实现 | 身份来源 | 数据归属（baby_id / parent_id） | 生产建议 |
| --- | --- | --- | --- | --- |
| **Email magic link** | `signInWithOtp({email, emailRedirectTo: origin+/parent})`；会话由 `detectSessionInUrl` 自动接管 | Supabase Auth 真实账号（email） | 登录后用户经 `auth.users.id` 统一，写入 `users.auth_user_id` | ✅ **生产主路径** |
| **手机号 OTP** | `signInWithOtp({phone})` + `verifyOtp` | Supabase Auth 真实账号（phone） | 同上 | 真短信配置好后把 `testMode=false` 启用 |
| **测试模式匿名登录** | `signInAnonymously()`（testMode=true 默认开） | 匿名用户（无 email/phone） | 自动 upsert `users.id=匿名id` | ⚠️ 仅演示/大创；生产应关闭 |
| **体验模式直进** | `storeRole` + 直接 `router.push` | 仅本地 `avt_role`，无登录态 | 无登录态 → 走 anon RLS 旧策略（user_id=null） | ⚠️ 仅演示 |
| **治疗师端** | 同样支持上述三种方式 | 同家长 | 通过 `family_therapists` 关联负责的孩子 | ✅ |

**边界判定（是否满足上线门槛）：**

1. 真实登录具备 → ✅（Email magic link + 手机号 OTP 两条真实路径都已编码，仅需配置 Supabase Email/SMS）。
2. 匿名/体验模式**不写真实身份**，仅在演示时可用 → ✅ 设计符合「生产关闭、演示开启」。
3. 所有写入业务表的操作均带 `baby_id` + `parent_id`（见 `voice-ratings-service.ts` / `recommendations-service.ts`）+ 收紧后的 RLS 按 `auth.my_baby_ids()` 隔离 → ✅（验收脚本 `phase1_verification.sql` 覆盖）。

---

## 二、四项上线门槛现状核验

### 门槛 1：评级数据隔离（RLS 不再全开放）
- **代码产物**：`019_rls_tighten_phase_a.sql`（新增 `_v2` 收紧策略）、`020_rls_drop_old.sql`（删旧 `public_*` 全开放策略）。
- **表**：`task_voice_ratings` / `practice_voice_ratings` / `therapist_recommendations` 均已加 `baby_id` / `parent_id` 列（016 / 018）。
- **验收手段**：`phase1_verification.sql` 断言未登录 0 行、A/B 家长隔离、治疗师仅己方、推荐定向。
- **状态**：✅ 代码就绪；⏳ **需用户在 Supabase 控制台按 015→016→018→017→019 执行、跑验收、再执行 020**。

### 门槛 2：身份唯一空间（不再两套并行）
- **代码产物**：`015_identity_unification.sql`（新增 `auth_user_id UUID UNIQUE REFERENCES auth.users(id)` + 触发器 `on_auth_user_created` 自动建 `users` 行，且 `users.id = auth.users.id`）。
- **效果**：app 用 anon 登录后，`auth.uid()` 即真实用户，业务表 `parent_id = auth.uid()` 不再为 null。
- **状态**：✅ 代码就绪；⏳ 需执行迁移 + 历史行 `UPDATE users SET auth_user_id = id WHERE auth_user_id IS NULL`。

### 门槛 3：隐私基线（原始音频不出本地）
- **代码产物**：`src/lib/recording-store.ts`——IndexedDB 仅存本地、按 `baby_id` 分桶；`getStoredBabyId()` 分桶声纹基线/同意标志。
- **云端**：只存脱敏结构化指标（星级/分数/时长/基频），绝不传原始音频（已无上传调用）。
- **状态**：✅ 已实现；隐私同意标志 `hasVoiceConsent()` / `setVoiceConsent()` 按孩子分桶。

### 门槛 4：密钥分层（service key 不落前端）
- **代码产物**：`.env.local.example` 三层声明；`/api/admin/maintenance` 服务端持 `SUPABASE_SERVICE_ROLE_KEY`，带 `ADMIN_MAINTENANCE_ENABLED` 开关 + `ADMIN_ALLOWED_EMAILS` 白名单。
- **git 安全**：`.env.local` 在 `.gitignore` 中；仓库当前 0 提交，无历史泄漏。
- **状态**：✅ 代码就绪；⏳ 用户需在 Vercel / `.env.local` 填入真实 `SUPABASE_SERVICE_ROLE_KEY`（仅服务端）。

---

## 三、五阶段完成度总表

| 阶段 | 主题 | 核心交付 | 代码/SQL 状态 | 需用户手动 | 验收 |
| --- | --- | --- | --- | --- | --- |
| 一 | 数据库身份建模 + RLS 改造 | 015 身份统一 / 016 评级表加列 / 018 推荐表指娃 / 017 脏数据归档 / 019 RLS 阶段A / 020 RLS 阶段B / 验收SQL | ✅ 全部产出（tsc 0 错） | 控制台按序执行迁移 + 跑验收 + 回填 | ⏳ 待验 |
| 二 | 密钥分层 + 运维通道 | git 扫描（无泄漏）/ `.gitignore` 核对 / admin 运维端点 + `.env.local.example` | ✅ 全部产出 | Vercel 填 service key + 白名单 | ⏳ 待配 |
| 三 | ASR 发音评估原型 | `docs/phase3_asr_feasibility_report.md`（sherpa-onnx + GOP 可行性） | ✅ 调研报告 | 二期工程化（WASM 集成） | ✅ 调研完成 |
| 四 | 登录 / 部署 / 三层存储 | Email magic link 登录 / 三层存储职责落地（`recording-store.ts` 分桶）/ `VERCEL-DEPLOY-GUIDE.md` | ✅ 全部产出（tsc 0 错） | Supabase Email/SMS 配置 + Vercel 部署 | ⏳ 待部 |
| 五 | 整合验收 + 上线门槛 | 本文档（登录边界表 / 四门槛核验 / 完成度总表） | ✅ 本文 | 逐条对照门槛 1–4 勾选 | ⏳ 待签 |

---

## 四、上线前最终 Checklist（逐条勾选）

- [ ] 迁移 015→016→018→017→019 已在 Supabase 执行
- [ ] `phase1_verification.sql` 全部 PASS（隔离断言通过）
- [ ] 迁移 020 已执行（旧 `public_*` 策略已删）
- [ ] 历史 `users` 已回填 `auth_user_id`
- [ ] `__selftest__` / 测试脏数据已清理
- [ ] Supabase Auth 已配置 Email 模板回调 + Redirect URLs（HTTPS）
- [ ] Vercel 环境变量已填：`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`（仅服务端）/ `ADMIN_*`
- [ ] 生产关闭 `testMode`（匿名登录演示开关）与体验模式入口
- [ ] `tsc --noEmit` 通过（本地已 EXIT=0）
- [ ] 部署后重跑 `phase1_verification.sql` 确认 `_v2` 策略生效

> 全部勾选 = 满足「上线门槛」，可正式开放真实用户注册。任一 ⏳ 项未完成则视为未达上线标准。

---

_本文件与 `VERCEL-DEPLOY-GUIDE.md`、`docs/phase3_asr_feasibility_report.md` 配套，构成阶段四/五完整验收材料。_
