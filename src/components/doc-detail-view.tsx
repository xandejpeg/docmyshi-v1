"use client";

import { useMemo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DocNodeData, DocLinkData } from "@/lib/store";
import {
  IconClipboard,
  IconLayers,
  IconBox,
  IconFolder,
  IconPlay,
  IconAlertTriangle,
  IconWrench,
  IconFile,
  IconArrowLeft,
} from "@/components/icons";

const DOC_TYPE_COLORS: Record<string, string> = {
  overview: "#0066ff",
  architecture: "#5ac8f5",
  modules: "#06b6d4",
  "file-map": "#10b981",
  "how-to-run": "#f59e0b",
  "tech-debt": "#ef4444",
  "module-detail": "#5ac8f5",
};

const DOC_TYPE_ICONS: Record<string, ReactNode> = {
  overview: <IconClipboard size={14} />,
  architecture: <IconLayers size={14} />,
  modules: <IconBox size={14} />,
  "file-map": <IconFolder size={14} />,
  "how-to-run": <IconPlay size={14} />,
  "tech-debt": <IconAlertTriangle size={14} />,
  "module-detail": <IconWrench size={14} />,
};

const DOC_TYPE_FALLBACK = <IconFile size={14} />;

interface DocDetailViewProps {
  nodes: DocNodeData[];
  links: DocLinkData[];
  activeSlug: string;
  onNavigate: (slug: string) => void;
  onBack: () => void;
}

export function DocDetailView({
  nodes,
  links,
  activeSlug,
  onNavigate,
  onBack,
}: DocDetailViewProps) {
  const activeNode = nodes.find((n) => n.slug === activeSlug);

  // Find connected docs
  const relatedDocs = useMemo(() => {
    if (!activeNode) return [];
    const relatedIds = new Set<string>();

    for (const link of links) {
      if (link.fromNodeId === activeNode.id) relatedIds.add(link.toNodeId);
      if (link.toNodeId === activeNode.id) relatedIds.add(link.fromNodeId);
    }

    return nodes.filter((n) => relatedIds.has(n.id));
  }, [activeNode, links, nodes]);

  // Process content: replace [[slug]] with clickable links
  const processedContent = useMemo(() => {
    if (!activeNode) return "";
    return activeNode.content.replace(
      /\[\[([a-z0-9-]+)\]\]/g,
      (_, slug) => {
        const target = nodes.find((n) => n.slug === slug);
        if (target) {
          return `[${target.title}](#nav:${slug})`;
        }
        return `\`${slug}\``;
      }
    );
  }, [activeNode, nodes]);

  if (!activeNode) {
    return (
      <div className="h-full flex items-center justify-center text-muted">
        Document not found
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Sidebar - doc navigation */}
      <aside className="w-56 border-r border-border/50 bg-surface/60 flex flex-col overflow-y-auto flex-shrink-0">
        <div className="px-3 py-3 border-b border-border/50">
          <button
            onClick={onBack}
            className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1"
          >
            <IconArrowLeft size={12} /> Back to graph
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => onNavigate(node.slug)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                node.slug === activeSlug
                  ? "bg-accent/15 text-accent-glow border border-accent/30"
                  : "text-muted hover:text-foreground hover:bg-surface-light"
              }`}
            >
              <span className="mr-1.5 inline-flex">
                {DOC_TYPE_ICONS[node.type] || DOC_TYPE_FALLBACK}
              </span>
              {node.title}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2 py-0.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: `${DOC_TYPE_COLORS[activeNode.type] || "#0066ff"}20`,
                  color: DOC_TYPE_COLORS[activeNode.type] || "#0066ff",
                }}
              >
                {DOC_TYPE_ICONS[activeNode.type]} {activeNode.type}
              </span>
            </div>
            <h1 className="text-3xl font-bold">{activeNode.title}</h1>
          </div>

          {/* Markdown content */}
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => {
                  // Handle internal [[slug]] navigation links
                  if (href?.startsWith("#nav:")) {
                    const slug = href.replace("#nav:", "");
                    return (
                      <button
                        onClick={() => onNavigate(slug)}
                        className="text-accent-glow hover:underline cursor-pointer"
                      >
                        {children}
                      </button>
                    );
                  }
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-glow hover:underline"
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {processedContent}
            </ReactMarkdown>
          </div>

          {/* Related docs */}
          {relatedDocs.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border/50">
              <h3 className="text-sm font-semibold text-muted mb-3">
                Related Documents
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {relatedDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => onNavigate(doc.slug)}
                    className="p-3 rounded-xl bg-surface-light border border-border hover:border-accent/30 text-left transition-colors"
                  >
                    <span className="mr-1.5 inline-flex">
                      {DOC_TYPE_ICONS[doc.type] || DOC_TYPE_FALLBACK}
                    </span>
                    <span className="text-sm font-medium">{doc.title}</span>
                    <span
                      className="ml-2 text-xs"
                      style={{ color: DOC_TYPE_COLORS[doc.type] }}
                    >
                      {doc.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
