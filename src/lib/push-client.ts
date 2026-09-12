// 浏览器端推送订阅工具
// 注册 Service Worker + 订阅推送

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export async function registerServiceWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    console.warn("[Push] 浏览器不支持 Service Worker");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("[Push] Service Worker 注册成功");
    return !!registration;
  } catch (err) {
    console.error("[Push] Service Worker 注册失败:", err);
    return false;
  }
}

export async function subscribeToPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("[Push] 浏览器不支持推送");
    return false;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn("[Push] 缺少 VAPID 公钥");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    });

    // 发送到后端保存
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(Array.from(new Uint8Array(subscription.getKey("p256dh")!)).map(b => String.fromCharCode(b)).join('')),
          auth: btoa(Array.from(new Uint8Array(subscription.getKey("auth")!)).map(b => String.fromCharCode(b)).join('')),
        },
        browserInfo: navigator.userAgent,
      }),
    });

    if (!res.ok) throw new Error("订阅请求失败");
    console.log("[Push] 推送订阅成功");
    return true;
  } catch (err) {
    console.error("[Push] 订阅失败:", err);
    // 权限被拒绝是正常的，静默处理
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      console.log("[Push] 用户拒绝了推送权限");
      return false;
    }
    return false;
  }
}

// 本地演示通知：当后端没有真实订阅时，直接在客户端弹出系统通知，
// 用于原型演示「收到推送」的视觉效果（不会经过真实推送服务）。
export async function showLocalDemoNotification(title: string, body: string): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;

  let permission: NotificationPermission = Notification.permission;
  if (permission === "default") {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return false;
    }
  }
  if (permission !== "granted") return false;

  try {
    new Notification(title, { body, icon: "/icons/icon-192.svg" });
    return true;
  } catch {
    return false;
  }
}
