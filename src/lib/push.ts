// Web Push 推送工具封装（服务端）

import webpush from "web-push";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:contact@avt-assist.com",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** 发送推送通知 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<{ success: boolean; statusCode?: number }> {
  try {
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icons/icon-192.svg",
        badge: "/icons/icon-192.svg",
        vibrate: [200, 100, 200],
        data: payload.data || {},
      })
    );
    return { success: true };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const statusCode = (err as { statusCode: number }).statusCode;
      if (statusCode === 410) {
        console.warn("[Push] 订阅已过期:", subscription.endpoint.slice(0, 50));
      }
      return { success: false, statusCode };
    }
    console.error("[Push] 发送失败:", err);
    return { success: false };
  }
}

/** 生成任务推送内容 */
export function buildTaskPushPayload(task: {
  time: string;
  scene: string;
  sceneIcon: string;
  strategy: string;
  targetWord: string;
  instruction: string;
}): PushPayload {
  return {
    title: `⏰ ${task.scene}时间到了`,
    body: `${task.sceneIcon} ${task.strategy} · 目标词「${task.targetWord}」`,
    data: { taskTime: task.time, targetWord: task.targetWord },
  };
}
