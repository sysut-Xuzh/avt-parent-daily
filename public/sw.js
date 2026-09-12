// AVT 家长端 — Service Worker
// 处理推送通知、离线缓存
// v2：修复 API 被缓存导致数据不更新的问题

const CACHE_NAME = "avt-cache-v2";

// 需要离线缓存的页面（不含 API）
const PRECACHE_URLS = [
  "/",
  "/parent",
  "/parent/settings",
  "/manifest.json",
];

// 安装：预缓存基础页面
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// 激活：清理旧版本缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// 拦截请求：只缓存页面/静态资源，API 请求永远走网络（保证数据实时）
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. API 请求（/api/...）→ 不缓存，直接走网络
  if (url.pathname.startsWith("/api/")) {
    return; // 不调用 respondWith，让浏览器正常请求
  }

  // 2. 其他 GET 请求 → 缓存优先，断网时兜底
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // 只缓存成功的静态资源
        if (response.ok && url.origin === location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// 接收推送通知
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      title: data.title || "AVT训练提醒",
      body: data.body || "",
      icon: data.icon || "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: [
        { action: "view", title: "查看任务" },
        { action: "complete", title: "标记完成" },
      ],
    };

    event.waitUntil(self.registration.showNotification(options.title, options));
  } catch {
    // 纯文本通知
    event.waitUntil(
      self.registration.showNotification("AVT训练提醒", { body: event.data.text() })
    );
  }
});

// 点击通知
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.taskId
    ? `/parent?task=${event.notification.data.taskId}`
    : "/parent";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url.includes("/parent"));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: "NOTIFICATION_CLICK", taskId: event.notification.data?.taskId });
      } else {
        clients.openWindow(urlToOpen);
      }
    })
  );
});
