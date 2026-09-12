// Supabase 客户端（浏览器端，支持 Auth）
// 环境变量：NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// 浏览器端单例（避免 Next.js 水合时重复创建）
let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (typeof window === "undefined") {
    // SSR 环境下不创建浏览器客户端
    throw new Error("getSupabaseBrowser 只能在客户端使用");
  }
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

// 服务端客户端（API 路由用）
export function getSupabaseServer(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}

export function dbTaskToDailyTask(row: {
  id: string;
  time: string;
  scene: string;
  scene_icon: string;
  strategy: string;
  target_word: string;
  instruction: string;
  status: string;
}) {
  return {
    id: row.id,
    time: row.time,
    scene: row.scene,
    sceneIcon: row.scene_icon,
    strategy: row.strategy,
    targetWord: row.target_word,
    instruction: row.instruction,
    completed: row.status === "completed",
  };
}
