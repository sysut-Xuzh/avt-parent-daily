"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface CelebrationToastProps {
  show: boolean;
  onClose: () => void;
}

export default function CelebrationToast({ show, onClose }: CelebrationToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto"
        >
          <div className="bg-indigo-600 text-white rounded-2xl px-5 py-4 shadow-xl flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-base">太棒了！</p>
              <p className="text-sm text-indigo-100">继续加油，宝宝在进步！</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
