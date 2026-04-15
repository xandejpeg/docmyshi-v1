"use client";

import type { RepoData } from "@/lib/store";
import { IconRefresh, IconStar } from "@/components/icons";

interface RepoListProps {
  repos: RepoData[];
  onSelectRepo: (id: string) => void;
  onSync: () => void;
  syncing: boolean;
  isGenerating: boolean;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C#": "#178600",
  C: "#555555",
  "C++": "#f34b7d",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  "Jupyter Notebook": "#DA5B0B",
};

export function RepoList({
  repos,
  onSelectRepo,
  onSync,
  syncing,
  isGenerating,
}: RepoListProps) {
  return (
    <div className="border-t border-border/50 bg-surface/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-sm font-semibold text-muted">
          Repositories ({repos.length})
        </h2>
        <button
          onClick={onSync}
          disabled={syncing}
          className="px-3 py-1 rounded-lg bg-surface-light hover:bg-border/50 text-xs text-muted hover:text-foreground transition-colors disabled:opacity-50"
        >
          {syncing ? "Syncing..." : <><IconRefresh size={12} /> Sync</>}
        </button>
      </div>
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
        {repos.map((repo) => (
          <button
            key={repo.id}
            onClick={() => onSelectRepo(repo.id)}
            disabled={isGenerating}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-surface-light border border-border hover:border-accent/40 hover:glow-box transition-all text-left disabled:opacity-50 group"
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    LANG_COLORS[repo.language || ""] || "#666",
                }}
              />
              <span className="text-sm font-medium group-hover:text-accent-glow transition-colors truncate max-w-[160px]">
                {repo.name}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              {repo.language && <span>{repo.language}</span>}
              {repo.stars > 0 && <span><IconStar size={12} className="inline" /> {repo.stars}</span>}
              <span>{formatSize(repo.size)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
