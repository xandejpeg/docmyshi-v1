"use client";

import { useState } from "react";

interface BrainNavProps {
  onSelect: (category: string) => void;
  activeCategory?: string | null;
}

const REGIONS = [
  {
    id: "overview",
    label: "Overview",
    desc: "Project overview & architecture",
    // Top-center of brain
    cx: 50,
    cy: 22,
    color: "#0066ff",
  },
  {
    id: "modules",
    label: "Modules",
    desc: "Components & module breakdown",
    // Left lobe
    cx: 25,
    cy: 48,
    color: "#5ac8f5",
  },
  {
    id: "structure",
    label: "Structure",
    desc: "File map & directory layout",
    // Right lobe
    cx: 75,
    cy: 48,
    color: "#5ac8f5",
  },
  {
    id: "runtime",
    label: "Run & Deploy",
    desc: "How to run, build, deploy",
    // Brain stem bottom-left
    cx: 35,
    cy: 75,
    color: "#0066ff",
  },
  {
    id: "health",
    label: "Health",
    desc: "Tech debt, risks & quality",
    // Brain stem bottom-right
    cx: 65,
    cy: 75,
    color: "#0066ff",
  },
];

export function BrainNav({ onSelect, activeCategory }: BrainNavProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square select-none">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Brain outline - stylized neural shape */}
        <defs>
          <radialGradient id="brain-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0066ff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0066ff" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient glow */}
        <circle cx="50" cy="50" r="45" fill="url(#brain-glow)" />

        {/* Brain silhouette */}
        <path
          d="M50 8 C30 8, 12 22, 12 40 C12 52, 18 60, 28 66 C30 72, 32 82, 38 88 L42 90 C44 84, 44 78, 44 72 L50 68 L56 72 C56 78, 56 84, 58 90 L62 88 C68 82, 70 72, 72 66 C82 60, 88 52, 88 40 C88 22, 70 8, 50 8Z"
          fill="none"
          stroke="#5ac8f5"
          strokeWidth="0.6"
          opacity="0.4"
        />

        {/* Center line */}
        <path
          d="M50 12 L50 68"
          stroke="#5ac8f5"
          strokeWidth="0.3"
          opacity="0.2"
          strokeDasharray="2 2"
        />

        {/* Neural connection lines between regions */}
        {REGIONS.map((r) =>
          REGIONS.filter((r2) => r2.id !== r.id).map((r2) => (
            <line
              key={`${r.id}-${r2.id}`}
              x1={r.cx}
              y1={r.cy}
              x2={r2.cx}
              y2={r2.cy}
              stroke="#5ac8f5"
              strokeWidth="0.2"
              opacity={
                hovered === r.id || hovered === r2.id
                  ? 0.5
                  : activeCategory === r.id || activeCategory === r2.id
                    ? 0.3
                    : 0.08
              }
              className="transition-opacity duration-300"
            />
          ))
        )}

        {/* Interactive regions */}
        {REGIONS.map((region) => {
          const isActive = activeCategory === region.id;
          const isHovered = hovered === region.id;
          const scale = isHovered ? 1.2 : isActive ? 1.1 : 1;

          return (
            <g
              key={region.id}
              onClick={() => onSelect(region.id)}
              onMouseEnter={() => setHovered(region.id)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
              style={{ transform: `scale(${scale})`, transformOrigin: `${region.cx}px ${region.cy}px`, transition: "transform 0.2s ease" }}
            >
              {/* Outer glow ring */}
              <circle
                cx={region.cx}
                cy={region.cy}
                r="8"
                fill={region.color}
                opacity={isHovered ? 0.15 : isActive ? 0.1 : 0.03}
                className="transition-opacity duration-300"
              />

              {/* Main node */}
              <circle
                cx={region.cx}
                cy={region.cy}
                r="4"
                fill={isActive || isHovered ? region.color : "#0a1024"}
                stroke={region.color}
                strokeWidth={isActive ? "1" : "0.5"}
                opacity={isHovered ? 1 : isActive ? 0.9 : 0.6}
                filter={isHovered || isActive ? "url(#glow)" : undefined}
                className="transition-all duration-300"
              />

              {/* Inner pulse dot */}
              <circle
                cx={region.cx}
                cy={region.cy}
                r="1.5"
                fill={region.color}
                opacity={isActive ? 0.8 : 0.4}
              >
                {isActive && (
                  <animate
                    attributeName="r"
                    values="1.5;2.5;1.5"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>

              {/* Label */}
              <text
                x={region.cx}
                y={region.cy - 7}
                textAnchor="middle"
                fill={isHovered || isActive ? "#ffffff" : "#5ac8f5"}
                fontSize="3"
                fontWeight={isActive ? "600" : "400"}
                opacity={isHovered ? 1 : isActive ? 0.9 : 0.6}
                className="transition-all duration-300 pointer-events-none"
              >
                {region.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-md text-center animate-fade-in-up">
          <p className="text-sm font-medium text-foreground">
            {REGIONS.find((r) => r.id === hovered)?.label}
          </p>
          <p className="text-xs text-muted">
            {REGIONS.find((r) => r.id === hovered)?.desc}
          </p>
        </div>
      )}
    </div>
  );
}
