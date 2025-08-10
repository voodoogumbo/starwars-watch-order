"use client";
import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width = "100%", height = "1rem", borderRadius = "4px", className = "", style = {} }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: "linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.05) 100%)",
        backgroundSize: "200px 100%",
        animation: "skeleton-loading 2s ease-in-out infinite",
        ...style
      }}
    />
  );
}

export function EpisodeListSkeleton({ seasonCount = 3 }: { seasonCount?: number }) {
  return (
    <div className="episodes" style={{ gridColumn: "1 / -1", marginTop: 10, padding: "8px 12px 12px 46px" }}>
      {Array.from({ length: seasonCount }, (_, seasonIndex) => (
        <div key={seasonIndex} style={{ display: "grid", gap: 6, marginBottom: 16 }}>
          <Skeleton width="120px" height="16px" />
          {Array.from({ length: Math.floor(Math.random() * 12) + 6 }, (_, episodeIndex) => (
            <div key={episodeIndex} className="episode-item" style={{ padding: "6px 8px", opacity: 0.7 }}>
              <Skeleton width="12px" height="12px" borderRadius="2px" />
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <Skeleton width="200px" height="16px" style={{ marginBottom: 4 }} />
                <Skeleton width="80px" height="12px" />
              </div>
              <Skeleton width="24px" height="12px" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}