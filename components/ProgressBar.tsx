"use client";
import React from "react";
import { getProgressRuntimeText } from "@/lib/runtime";

interface ProgressBarProps {
  percent: number;
  watchedMinutes?: number;
  totalMinutes?: number;
}

export default function ProgressBar({ percent, watchedMinutes, totalMinutes }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  const runtimeText = getProgressRuntimeText(watchedMinutes || 0, totalMinutes || 0);
  
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div className="lightsaber" style={{ flex: 1 }}>
          <div
            className="lightsaber__beam"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
          <div className="lightsaber__glow" />
        </div>
        <div style={{ minWidth: 72, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          {pct}% 
        </div>
      </div>
      {runtimeText && (
        <div style={{ 
          fontSize: "13px", 
          color: "var(--muted)", 
          textAlign: "center",
          fontVariantNumeric: "tabular-nums"
        }}>
          {runtimeText}
        </div>
      )}
    </div>
  );
}
