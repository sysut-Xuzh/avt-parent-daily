// 当前选中孩子（全局状态）的本地持久化助手
// 服务层（非 React 组件）可直接调用，无需依赖 React Context。
// 与 supabase/migrations/016_*.sql 新增的 baby_id 归属列配套使用。
const STORAGE_KEY = "avt_current_baby";

export function getStoredBabyId(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredBabyId(id: string | null): void {
  try {
    if (typeof window === "undefined") return;
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 忽略：隐私/安全上下文下 localStorage 可能不可用 */
  }
}
