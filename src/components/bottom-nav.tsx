"use client";

import { TabItem, TabId } from "@/types";

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  tabs: TabItem[];
}

export default function BottomNav({ activeTab, onTabChange, tabs }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg md:max-w-5xl mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 transition-all active:scale-95 ${
                isActive ? "text-indigo-600" : "text-gray-400"
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
  );
}
