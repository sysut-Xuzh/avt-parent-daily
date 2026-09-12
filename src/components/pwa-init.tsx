"use client";

import { useEffect } from "react";

export default function PWAInit() {
  useEffect(() => {
    // 注册 Service Worker（PWA 核心）
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 静默失败，不影响页面功能
      });
    }
  }, []);

  return null; // 不渲染任何 UI
}
