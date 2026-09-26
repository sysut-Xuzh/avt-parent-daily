# 阿里云 ECS 全功能部署指南（Route A）

> 目标：把 `http://8.163.76.236` 从「nginx 静态托管 `out/`」升级为「完整 Next.js 服务端」，
> 让 `/api/*` 路由真正运行（治疗师布置任务、家长端任务/进度/录音上传等都依赖它）。
> Route B（Vercel）与之共用同一份代码，互不冲突，本指南只管 ECS 这一侧。

---

## 架构变化

| | 旧（静态站） | 新（服务端） |
|---|---|---|
| 页面来源 | nginx 直托 `out/` 静态文件 | Node(`next start` :3000) 动态渲染 |
| `/api/*` | ❌ 404（移走 api 目录） | ✅ 由 Node 处理 |
| nginx 角色 | 直接返回文件 | 反向代理 80 → 127.0.0.1:3000 |

前提：`next.config.js` 中 `output: 'export'` 必须已移除（已在 Route B 步骤完成）。

---

## 步骤 1：登录服务器，确认 Node 版本

```bash
ssh ecs-user@8.163.76.236
node -v        # 期望 >= 18；若没有或版本过低，走下面安装
```

若需安装 Node（用 nvm，推荐）：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v        # 应显示 v20.x
```

---

## 步骤 2：拉取代码（用已连好的 GitHub 仓库）

```bash
cd ~
git clone https://github.com/sysut-Xuzh/avt-parent-daily.git
cd avt-parent-daily
npm install
```

> 日后更新只需在 `~/avt-parent-daily` 里 `git pull && npm install && npm run build && pm2 restart avt`。

---

## 步骤 3：配置服务端环境变量（关键！）

`/api/*` 路由靠 `SUPABASE_SERVICE_ROLE_KEY` 等环境变量，ECS 上必须单独配一份。
在服务器上创建 `.env.local`（内容与本地 `.env.local` 一致，**务必含 service_role key**）：

```bash
vim .env.local
```

填入（值替换成你的真实值）：

```
NEXT_PUBLIC_SUPABASE_URL=https://tekrqwudpvzrklnjotmf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<你的 anon key>
SUPABASE_SERVICE_ROLE_KEY=<你的 service_role key>
ADMIN_MAINTENANCE_ENABLED=false
ADMIN_ALLOWED_EMAILS=admin@example.com
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` 拥有绕过 RLS 的超级权限，只在服务器文件里，**不要进 GitHub、不要加 NEXT_PUBLIC_ 前缀**。

---

## 步骤 4：构建并以后台进程启动

```bash
npm run build
npm install -g pm2
pm2 start npm --name avt -- run start
pm2 save
pm2 startup      # 按屏幕提示执行它给出的命令，设开机自启
```

验证进程在跑：

```bash
pm2 status       # 应看到 avt 状态 online
pm2 logs avt     # 看有没有启动报错
curl http://127.0.0.1:3000/   # 服务器本地应能返回 HTML
```

---

## 步骤 5：修改 nginx 为反向代理

编辑 nginx 站点配置（二选一，看服务器用哪个）：

```bash
# 常见路径其一：
sudo vim /etc/nginx/sites-available/default
# 或：
sudo vim /etc/nginx/conf.d/default.conf
```

**整段替换为**（删掉原来 `root /var/www/html; index ...; location / { try_files ... }` 那套）：

```nginx
server {
    listen 80;
    server_name 8.163.76.236;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

测试并重载：

```bash
sudo nginx -t          # 应显示 syntax is ok / test is successful
sudo systemctl reload nginx
```

---

## 步骤 6：浏览器验证

打开 `http://8.163.76.236`：

- 治疗师端 → 试着「布置任务」并保存 → 应成功（`/api/weekly-plans/save` 返回 200）。
- 家长端 → 任务列表、进度、录音上传应正常。

若页面打不开：`pm2 logs avt` 看 Node 报错；`sudo systemctl status nginx` 看代理是否生效。

---

## 步骤 7：日后更新流程

```bash
cd ~/avt-parent-daily
git pull
npm install
npm run build
pm2 restart avt
```

---

## 备注

- 旧静态文件 `/var/www/html/*` 不再被引用，可保留作备份或删除，不影响新站。
- 想要 HTTPS：在步骤 5 之后跑 `sudo certbot --nginx -d 你的域名`（需先绑定域名并解析到 8.163.76.236）。
- ECS 与 Vercel 是同一份代码的两个托管点；代码改动 push 到 GitHub 后，ECS 侧 `git pull` 同步、Vercel 侧自动重新部署。
