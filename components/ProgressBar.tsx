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
    <div className="progress-wrapper">
      <div className="progress-bar-row">
        <div className="lightsaber" style={{ flex: 1 }}>
          <div
            className="lightsaber__beam"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
          <div className="lightsaber__glow" />
        </div>
        <div className="progress-pct">
          {pct}%
        </div>
      </div>
      {runtimeText && (
        <div className="progress-runtime">
          {runtimeText}
        </div>
      )}
    </div>
  );
}
