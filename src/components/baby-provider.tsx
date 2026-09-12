"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";
import { getStoredBabyId, setStoredBabyId } from "@/lib/baby-store";

export interface BabyOption {
  id: string;
  name: string;
}

interface BabyContextValue {
  babies: BabyOption[];
  currentBabyId: string | null;
  currentBabyName: string | null;
  setCurrentBabyId: (id: string | null) => void;
  loading: boolean;
}

const BabyContext = createContext<BabyContextValue | null>(null);

export function BabyProvider({ children }: { children: ReactNode }) {
  const [babies, setBabies] = useState<BabyOption[]>([]);
  const [currentBabyId, setCurrentBabyIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const sb = getSupabaseBrowser();
        const { data: authData } = await sb.auth.getUser();
        const uid = authData.user?.id;
        if (!uid) {
          setLoading(false);
          return;
        }
        const { data, error } = await sb
          .from("babies")
          .select("id, name")
          .eq("parent_id", uid)
          .order("created_at", { ascending: true });
        if (!active) return;
        if (error) {
          setLoading(false);
          return;
        }
        const list = (data as BabyOption[]) || [];
        setBabies(list);
        const stored = getStoredBabyId();
        const valid = list.find((b) => b.id === stored);
        setCurrentBabyIdState(valid ? stored! : list[0]?.id ?? null);
      } catch {
        /* 忽略：未登录或网络异常时保持空状态 */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setCurrentBabyId = useCallback((id: string | null) => {
    setCurrentBabyIdState(id);
    setStoredBabyId(id);
  }, []);

  const currentBabyName = babies.find((b) => b.id === currentBabyId)?.name ?? null;

  return (
    <BabyContext.Provider value={{ babies, currentBabyId, currentBabyName, setCurrentBabyId, loading }}>
      {children}
    </BabyContext.Provider>
  );
}

export function useBaby(): BabyContextValue {
  const ctx = useContext(BabyContext);
  if (!ctx) {
    // 未挂载 Provider 时返回安全的降级实现（不抛错），currentBabyId 仍可从 localStorage 读取
    return {
      babies: [],
      currentBabyId: getStoredBabyId(),
      currentBabyName: null,
      setCurrentBabyId: () => {},
      loading: false,
    };
  }
  return ctx;
}
