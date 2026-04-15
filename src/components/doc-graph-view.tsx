"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import type { DocNodeData, DocLinkData } from "@/lib/store";
import dynamic from "next/dynamic";
import { IconRefresh } from "@/components/icons";

// react-force-graph-3d doesn't support SSR
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

const DOC_TYPE_COLORS: Record<string, string> = {
  overview: "#0066ff",
  architecture: "#5ac8f5",
  modules: "#06b6d4",
  "file-map": "#10b981",
  "how-to-run": "#f59e0b",
  "tech-debt": "#ef4444",
  "module-detail": "#5ac8f5",
};

interface DocGraphViewProps {
  nodes: DocNodeData[];
  links: DocLinkData[];
  repoName: string;
  onSelectNode: (slug: string) => void;
  onRegenerate: () => void;
  isGenerating: boolean;
}

export function DocGraphView({
  nodes,
  links,
  repoName,
  onSelectNode,
  onRegenerate,
  isGenerating,
}: DocGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useDimensions(containerRef);

  const graphData = useMemo(() => {
    const graphNodes = nodes.map((n) => ({
      id: n.id,
      slug: n.slug,
      name: n.title,
      type: n.type,
      color: DOC_TYPE_COLORS[n.type] || "#0066ff",
      val: n.type === "overview" ? 15 : 8,
    }));

    const graphLinks = links
      .filter(
        (l) =>
          graphNodes.some((n) => n.id === l.fromNodeId) &&
          graphNodes.some((n) => n.id === l.toNodeId)
      )
      .map((l) => ({
        source: l.fromNodeId,
        target: l.toNodeId,
      }));

    return { nodes: graphNodes, links: graphLinks };
  }, [nodes, links]);



  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-surface/80 backdrop-blur-sm border-b border-border/50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">
            Documentation Graph — {repoName}
          </h2>
          <p className="text-muted text-xs mt-0.5">
            Click a node to read the document. {nodes.length} docs generated.
          </p>
        </div>
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className="px-3 py-1.5 rounded-lg bg-surface-light border border-border hover:border-accent/40 text-xs text-muted hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : <><IconRefresh size={12} /> Regenerate</>}
        </button>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 flex gap-3 flex-wrap bg-surface/40">
        {Object.entries(DOC_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            {type}
          </div>
        ))}
      </div>

      {/* Graph */}
      <div ref={containerRef} className="flex-1 relative">
        {dimensions.width > 0 && graphData.nodes.length > 0 && (
          <ForceGraph3D
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            backgroundColor="#050510"
            nodeColor={(node: any) => node.color || "#0066ff"}
            nodeLabel={(node: any) =>
              `${node.name || ""} (${node.type || ""})`
            }
            nodeOpacity={0.9}
            linkColor={() => "#2a2a5a"}
            linkOpacity={0.4}
            linkWidth={1}
            onNodeClick={(node: any) => { if (node.slug) onSelectNode(node.slug); }}
            enableNodeDrag={true}
            enableNavigationControls={true}
          />
        )}
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-accent-glow font-medium">
                Regenerating documentation...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function useDimensions(ref: React.RefObject<HTMLDivElement | null>) {
  const [dims, setDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function update() {
      if (ref.current) {
        setDims({
          width: ref.current.clientWidth,
          height: ref.current.clientHeight,
        });
      }
    }
    update();
    const observer = new ResizeObserver(update);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return [dims, setDims] as const;
}
