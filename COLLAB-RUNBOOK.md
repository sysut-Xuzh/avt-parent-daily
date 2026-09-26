# 双人协作执行手册（复制即跑）

> 适用：徐子涵（后端/部署） + 同学（视觉）并行改 `avt-parent-daily`
> 原则：两条分支各改各的，最后合回 `main`；文件按 `COLLAB.md` 职责划分，互不碰对方文件。

---

## 一、你（徐子涵）本地初始化 · 在 Git Bash 跑

```bash
cd "/c/Users/徐子涵/AppData/Roaming/reasonix/global-workspace/avt-parent-daily"

# 0. 清掉根目录临时文件 + 误生成的 git 裸文件（这些不是代码，别提交）
#    build-check.log / dev-check.log / dev2.log / journey.html / j.html / p.html 是构建探测残留
#    git 是无扩展名的垃圾裸文件，均可删
rm -f build-check.log dev-check.log dev2.log journey.html j.html p.html git

# 1. 精确提交当前改动（务必用文件清单，不要 git add -A，避免误带垃圾文件）
git add \
  src/app/api/weekly-plans/save/route.ts \
  src/app/globals.css \
  src/app/layout.tsx \
  src/app/parent/page.tsx \
  src/app/therapist/page.tsx \
  src/components/bottom-nav.tsx \
  src/components/greeting-header.tsx \
  src/components/streak-card.tsx \
  src/components/task-card.tsx \
  src/components/voice-recorder/TaskVoiceRecorder.tsx \
  tailwind.config.js \
  COLLAB.md \
  "ECS全功能部署指南_RouteA.md" \
  src/app/parent/journey/ \
  src/components/journey/

git commit -m "feat: A旅程页 + E视觉验证片 + B治疗师布置修复 + 协作分工文档"

# 2. 推到 main（这就是共享基线，同学 clone 下来就有你的 .ft-* 设计系统）
git push origin main

# 3. 从 main 切出两条长期分支并推送远端
git checkout -b visual-revamp
git push -u origin visual-revamp
git checkout main
git checkout -b backend-auth
git push -u origin backend-auth

# 4. 切回你自己的分支，开始干后端
git checkout backend-auth
```

---

## 二、GitHub 网页：加同学为协作者（你操作）
仓库页面 → **Settings → Collaborators → Add people** → 输入她 GitHub 账号 → 权限选 **Write** → 她邮箱确认邀请。

---

## 三、同学（她电脑，Git Bash）
```bash
git clone https://github.com/sysut-Xuzh/avt-parent-daily.git
cd avt-parent-daily
git checkout visual-revamp

# —— 她只改 COLLAB.md 里划给她的文件：globals.css / tailwind.config.js / 各组件视觉 / public/assets/ ——
# 例：她完善了设计系统、替换了手绘素材
git add src/app/globals.css tailwind.config.js src/components/bottom-nav.tsx public/assets/
git commit -m "style: 完善 .ft-* 设计系统 + 替换手绘角色与场景素材"
git push origin visual-revamp
```

---

## 四、你日常循环（在 backend-auth 分支）
```bash
git checkout backend-auth
# 改后端：api/**、login、lib、data、部署脚本、therapist 上传逻辑……
git add <你改的具体文件>
git commit -m "feat: 注册即建宝宝 / 治疗师上传接口 / ECS 部署"
git push origin backend-auth

# 每天结束前把 main 的新东西同步进来，避免分叉太久
git pull --rebase origin main
```

---

## 五、上线前合并回 main
```bash
git checkout main
git pull origin main
git merge visual-revamp     # 先合视觉
git merge backend-auth       # 再合后端
# 若有冲突 → 见第六节处理 → 本地 npm run build 验证通过 →
git push origin main
```

---

## 六、冲突保险：parent/page.tsx 的写法约定（关键，保证零冲突）

- **你（后端）只写语义类名，绝不写内联颜色值**：
  ```tsx
  <div className="ft-card ft-p-4">…任务结构…</div>
  ```
- **她（视觉）在 `globals.css` 里定义/完善样式**：
  ```css
  .ft-card { background:#fff; border-radius:20px; box-shadow:0 4px 20px rgba(74,144,182,.08); }
  ```
- 两人永远不碰同一行代码 → 合并零冲突。同理 `globals.css` / `tailwind.config.js` 全归她，`api/**` / `login` / `lib` 全归你。

---

## 七、万一真冲突了
1. `git status` 看哪些文件 `both modified`；
2. 打开文件找 `<<<<<<<` / `=======` / `>>>>>>>` 标记；
3. 按 `COLLAB.md` 职责表判断该留谁的（视觉冲突留她的 CSS，逻辑冲突留你的 TS）；
4. 删掉标记、保存 → `git add <file>` → `git commit`。

---

## 八、给同学的视觉素材清单（她用豆包/即梦/MJ 出图后放 public/assets/）
- 角色立绘：孩子（豆豆）/ 家长（妈妈）/ 治疗师（李老师）/ AI 小精灵 各 3–5 姿势，透明底 PNG/SVG
- 场景横幅 5 张：首页晨光儿童房 / 声音森林 / 录音室 / 温馨客厅 / 康复圈篝火
- 手绘图标 20+：房子/耳机/麦克风/书本/帐篷等（48px 圆形徽章底）
- 纸张纹理 1 张（全局背景叠加，opacity 0.3）
