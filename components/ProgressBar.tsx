"use client";
import React from "react";

export default function ProgressBar({ percent }: { percent: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
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
  );
}
