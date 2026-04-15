"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { DocNodeData, DocLinkData } from "@/lib/store";

const DOC_TYPE_COLORS: Record<string, string> = {
  overview: "#0066ff",
  architecture: "#5ac8f5",
  modules: "#06b6d4",
  flows: "#8b5cf6",
  "file-map": "#10b981",
  "how-to-run": "#f59e0b",
  "tech-debt": "#ef4444",
  risks: "#ef4444",
  "module-detail": "#5ac8f5",
};

interface SimNode {
  id: string;
  slug: string;
  title: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface SimLink {
  source: string;
  target: string;
}

interface DocGraphViewProps {
  nodes: DocNodeData[];
  links: DocLinkData[];
  activeSlug?: string;
  onSelectNode: (slug: string) => void;
}

export function DocGraphView({
  nodes,
  links,
  activeSlug,
  onSelectNode,
}: DocGraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<SimLink[]>([]);
  const animRef = useRef<number>(0);
  const [, forceRender] = useState(0);

  // Resize observer
  useEffect(() => {
    function update() {
      if (containerRef.current) {
        setDims({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    }
    update();
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initialize simulation nodes
  useEffect(() => {
    const cx = dims.width / 2;
    const cy = dims.height / 2;

    simNodesRef.current = nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      const spread = Math.min(dims.width, dims.height) * 0.25;
      return {
        id: n.id,
        slug: n.slug,
        title: n.title,
        type: n.type,
        x: cx + Math.cos(angle) * spread + (Math.random() - 0.5) * 20,
        y: cy + Math.sin(angle) * spread + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        radius: n.type === "overview" ? 32 : 24,
        color: DOC_TYPE_COLORS[n.type] || "#0066ff",
      };
    });

    simLinksRef.current = links
      .filter(
        (l) =>
          nodes.some((n) => n.id === l.fromNodeId) &&
          nodes.some((n) => n.id === l.toNodeId)
      )
      .map((l) => ({ source: l.fromNodeId, target: l.toNodeId }));
  }, [nodes, links, dims]);

  // Force simulation loop
  useEffect(() => {
    let running = true;
    let tick = 0;

    function simulate() {
      if (!running) return;
      const sn = simNodesRef.current;
      const sl = simLinksRef.current;
      const cx = dims.width / 2;
      const cy = dims.height / 2;

      // Center gravity
      for (const n of sn) {
        n.vx += (cx - n.x) * 0.005;
        n.vy += (cy - n.y) * 0.005;
      }

      // Repulsion between nodes
      for (let i = 0; i < sn.length; i++) {
        for (let j = i + 1; j < sn.length; j++) {
          const dx = sn[j].x - sn[i].x;
          const dy = sn[j].y - sn[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = 120;
          if (dist < minDist) {
            const force = ((minDist - dist) / dist) * 0.8;
            const fx = dx * force;
            const fy = dy * force;
            sn[i].vx -= fx;
            sn[i].vy -= fy;
            sn[j].vx += fx;
            sn[j].vy += fy;
          }
        }
      }

      // Link attraction
      for (const link of sl) {
        const src = sn.find((n) => n.id === link.source);
        const tgt = sn.find((n) => n.id === link.target);
        if (!src || !tgt) continue;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealDist = 160;
        const force = (dist - idealDist) * 0.003;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        src.vx += fx;
        src.vy += fy;
        tgt.vx -= fx;
        tgt.vy -= fy;
      }

      // Apply velocities with damping
      for (const n of sn) {
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
        // Keep in bounds
        n.x = Math.max(n.radius + 40, Math.min(dims.width - n.radius - 40, n.x));
        n.y = Math.max(n.radius + 20, Math.min(dims.height - n.radius - 20, n.y));
      }

      tick++;
      if (tick % 2 === 0) forceRender((v) => v + 1);
      if (tick < 300) {
        animRef.current = requestAnimationFrame(simulate);
      }
    }

    animRef.current = requestAnimationFrame(simulate);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [dims, nodes, links]);

  const getNode = useCallback(
    (id: string) => simNodesRef.current.find((n) => n.id === id),
    []
  );

  const sn = simNodesRef.current;
  const sl = simLinksRef.current;

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        ref={svgRef}
        width={dims.width}
        height={dims.height}
        className="w-full h-full"
        style={{ background: "transparent" }}
      >
        <defs>
          {sn.map((n) => (
            <radialGradient key={`grad-${n.id}`} id={`grad-${n.slug}`}>
              <stop offset="0%" stopColor={n.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={n.color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* Links */}
        {sl.map((link, i) => {
          const src = getNode(link.source);
          const tgt = getNode(link.target);
          if (!src || !tgt) return null;
          return (
            <line
              key={i}
              x1={src.x}
              y1={src.y}
              x2={tgt.x}
              y2={tgt.y}
              stroke="#2a3a6a"
              strokeWidth={1.5}
              strokeOpacity={0.5}
            />
          );
        })}

        {/* Glow circles behind nodes */}
        {sn.map((n) => (
          <circle
            key={`glow-${n.id}`}
            cx={n.x}
            cy={n.y}
            r={n.radius * 2}
            fill={`url(#grad-${n.slug})`}
          />
        ))}

        {/* Nodes */}
        {sn.map((n) => {
          const isActive = n.slug === activeSlug;
          const isHovered = n.slug === hoveredNode;
          return (
            <g
              key={n.id}
              style={{ cursor: "pointer" }}
              onClick={() => onSelectNode(n.slug)}
              onMouseEnter={() => setHoveredNode(n.slug)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Node circle */}
              <circle
                cx={n.x}
                cy={n.y}
                r={n.radius}
                fill={isActive ? n.color : `${n.color}30`}
                stroke={n.color}
                strokeWidth={isActive ? 3 : isHovered ? 2.5 : 1.5}
                strokeOpacity={isActive ? 1 : isHovered ? 0.9 : 0.6}
              />
              {/* Label */}
              <text
                x={n.x}
                y={n.y + n.radius + 16}
                textAnchor="middle"
                fill={isActive || isHovered ? "#e0e6f0" : "#8890a8"}
                fontSize={12}
                fontWeight={isActive ? 600 : 400}
              >
                {n.title.length > 22 ? n.title.slice(0, 20) + "…" : n.title}
              </text>
              {/* Type badge inside node */}
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                fill={isActive ? "#fff" : n.color}
                fontSize={9}
                fontWeight={600}
              >
                {n.type.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
