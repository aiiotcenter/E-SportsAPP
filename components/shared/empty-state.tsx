"use client";

import { Inbox } from "lucide-react";
import { motion } from "framer-motion";

export function EmptyState({
  title = "Nothing here",
  description = "Try adjusting your filters.",
  icon,
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="h-14 w-14 rounded-2xl img-container flex items-center justify-center mb-4">
        {icon || <Inbox size={22} className="text-text-2" />}
      </div>
      <p className="text-sm font-semibold text-text-1">{title}</p>
      <p className="text-xs text-text-2 mt-1">{description}</p>
    </motion.div>
  );
}
