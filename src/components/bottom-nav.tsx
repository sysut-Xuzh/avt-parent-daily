"use client";

import { TabItem, TabId } from "@/types";

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  tabs: TabItem[];
}

// Focus Traveller 风：悬浮圆角胶囊导航栏（选中 = 松绿药丸）
export default function BottomNav({ activeTab, onTabChange, tabs }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pointer-events-none">
      <nav className="pointer-events-auto mx-auto max-w-lg rounded-full bg-ft-paper/95 backdrop-blur border border-ft-sand shadow-[0_6px_24px_rgba(90,74,58,0.15)]">
        <div className="flex items-center justify-around px-2 h-16">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 px-4 rounded-full h-12 transition-all active:scale-95 ${
                  isActive
                    ? "bg-ft-pine text-white shadow-sm"
                    : "text-ft-inkSoft/70 hover:text-ft-trail"
                }`}
                style={{ minHeight: 44, minWidth: 44 }}
              >
                <span className="text-xl">{tab.icon}</span>
                <span
                  className={`text-xs ${
                    isActive ? "font-bold" : "font-normal"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
