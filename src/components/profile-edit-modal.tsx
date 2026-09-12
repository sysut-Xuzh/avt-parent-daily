"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ParentProfile } from "@/data/community";

const AVATAR_CHOICES = ["🐰", "🐱", "🐶", "🐼", "🐯", "🦁", "🐨", "🐸", "🌟", "🌈", "🍎", "🌻"];

const ROLE_LABEL: Record<ParentProfile["role"], string> = {
  primary: "主要照护人",
  secondary: "次要照护人",
};

interface Props {
  open: boolean;
  onClose: () => void;
  profile: ParentProfile;
  onSave: (p: ParentProfile) => void;
}

export default function ProfileEditModal({ open, onClose, profile, onSave }: Props) {
  const [draft, setDraft] = useState<ParentProfile>(profile);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(profile);
      setError("");
    }
  }, [open, profile]);

  const handleSave = () => {
    const nickname = draft.nickname.trim();
    if (nickname.length < 2 || nickname.length > 12) {
      setError("昵称长度需在 2–12 个字符");
      return;
    }
    onSave({ ...draft, nickname });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 40, scale: 0.96 }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-800">✏️ 编辑资料</span>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 text-lg"
              >
                x
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
              {/* 头像选择 */}
              <div>
                <label className="text-xs text-gray-400 block mb-2">头像</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_CHOICES.map((a) => {
                    const active = draft.avatar === a;
                    return (
                      <button
                        key={a}
                        onClick={() => setDraft({ ...draft, avatar: a })}
                        className={`aspect-square rounded-xl flex items-center justify-center text-2xl border transition-all active:scale-90 ${
                          active ? "bg-indigo-50 border-indigo-400" : "bg-gray-50 border-gray-100"
                        }`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 昵称 */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">昵称</label>
                <input
                  value={draft.nickname}
                  onChange={(e) => {
                    setDraft({ ...draft, nickname: e.target.value });
                    if (error) setError("");
                  }}
                  maxLength={12}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              </div>

              {/* 所在城市 */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">所在城市</label>
                <input
                  value={draft.city}
                  onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              </div>

              {/* 个性签名 */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">个性签名</label>
                <input
                  value={draft.bio}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                  maxLength={30}
                  placeholder="写一句话介绍自己吧"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              </div>

              {/* 照护身份 */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">照护身份</label>
                <div className="flex gap-2">
                  {(["primary", "secondary"] as ParentProfile["role"][]).map((r) => {
                    const active = draft.role === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setDraft({ ...draft, role: r })}
                        className={`flex-1 text-xs py-2 rounded-lg border transition-all active:scale-95 ${
                          active ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-gray-500 border-gray-200"
                        }`}
                      >
                        {ROLE_LABEL[r]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <p className="text-xs text-rose-500">{error}</p>}
            </div>

            {/* 底部保存 */}
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={handleSave}
                className="w-full py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors active:scale-95"
              >
                💾 保存
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
