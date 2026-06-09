"use client";

import { memo } from "react";
import type { SiteStatus } from "@/lib/types";

interface StatusIndicatorProps {
  status: SiteStatus;
  /** Larger variant for hero/header use */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3.5 h-3.5",
} as const;

function StatusIndicatorBase({
  status,
  size = "md",
  className = "",
}: StatusIndicatorProps) {
  const dotClass =
    status === "Online"
      ? "status-dot--online"
      : status === "Offline"
        ? "status-dot--offline"
        : "status-dot--checking";

  return (
    <span
      role="status"
      aria-label={status}
      className={`status-dot ${dotClass} ${sizeMap[size]} ${className}`}
    />
  );
}

export default memo(StatusIndicatorBase);
