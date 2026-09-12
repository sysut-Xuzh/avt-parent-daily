"use client";

import { motion, AnimatePresence } from "framer-motion";

/**
 * 隐私单独同意弹窗（方案 §4.2）
 * - 不可隐藏在注册协议中，首次使用录音功能前显式弹出
 * - 明确：收集目的 / 处理方式（本地分析，原始音频不上传）/ 保留期限
 * - 家长代同意声明
 */
export default function RecordingConsentModal({
  open,
  onAgree,
  onDecline,
}: {
  open: boolean;
  onAgree: () => void;
  onDecline: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDecline}
        >
          <motion.div
            className="w-full max-w-md bg-white rounded-t-3xl p-5 pb-7"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-3" />
            <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
              🎙️ 录音功能授权
            </h3>
            <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
              为评估宝宝的<strong className="text-gray-700">训练参与度</strong>，我们会请家长录制孩子发声的短音频。
            </p>

            <div className="mt-3 space-y-2 text-[11px] text-gray-600 leading-relaxed">
              <div className="flex gap-2">
                <span className="text-indigo-500">📌</span>
                <span><strong>收集目的：</strong>识别儿童声线、评估参与度（待提高 / 有效参与 / 完美参与）。</span>
              </div>
              <div className="flex gap-2">
                <span className="text-indigo-500">🔒</span>
                <span><strong>处理方式：</strong>所有分析在<strong>您的手机/电脑本地</strong>完成，<strong>原始录音不会上传</strong>给任何人（含治疗师）。</span>
              </div>
              <div className="flex gap-2">
                <span className="text-indigo-500">⏳</span>
                <span><strong>保留期限：</strong>本地录音仅保留 30 天，您可随时一键删除。</span>
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded-xl bg-amber-50 text-[11px] text-amber-700 leading-relaxed">
              👪 您作为监护人，<strong>代孩子同意</strong>上述录音收集与本地处理方式。
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={onDecline}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium active:scale-95 transition-all"
              >
                暂不开启
              </button>
              <button
                onClick={onAgree}
                className="flex-[2] py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold active:scale-95 transition-all"
              >
                同意并继续
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
