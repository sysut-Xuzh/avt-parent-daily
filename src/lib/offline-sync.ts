// 离线同步工具
// 断网时保存操作到 localStorage，联网后自动同步

const OFFLINE_QUEUE_KEY = "avt_offline_queue";

interface OfflineAction {
  type: "complete" | "note";
  taskId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToOfflineQueue(action: OfflineAction) {
  const queue = getOfflineQueue();
  queue.push(action);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0, failed = 0;

  for (const action of queue) {
    try {
      if (action.type === "complete") {
        const res = await fetch("/api/tasks/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: action.taskId }),
        });
        if (res.ok) synced++;
        else failed++;
      }
    } catch {
      failed++;
    }
  }

  if (failed === 0) clearOfflineQueue();
  else {
    // 只清掉已同步的
    const remaining = queue.slice(queue.length - failed);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  }

  return { synced, failed };
}
