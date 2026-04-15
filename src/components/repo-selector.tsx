"use client";

import { useState, useMemo } from "react";
import type { RepoData } from "@/lib/store";
import { IconRefresh, IconStar } from "@/components/icons";

interface RepoSelectorProps {
  repos: RepoData[];
  user: { name?: string | null; image?: string | null };
  onConfirm: (repoId: string) => void;
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
  Shell: "#89e051",
  Vue: "#41b883",
  Svelte: "#ff3e00",
};

type SortKey = "pushed" | "stars" | "name" | "size";

export function RepoSelector({
  repos,
  user,
  onConfirm,
  onSync,
  syncing,
  isGenerating,
}: RepoSelectorProps) {
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("pushed");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Available languages
  const languages = useMemo(() => {
    const langs = new Set<string>();
    for (const r of repos) {
      if (r.language) langs.add(r.language);
    }
    return Array.from(langs).sort();
  }, [repos]);

  // Filtered & sorted
  const filtered = useMemo(() => {
    let list = repos;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }

    if (langFilter) {
      list = list.filter((r) => r.language === langFilter);
    }

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "pushed":
          return (
            new Date(b.pushedAt || 0).getTime() -
            new Date(a.pushedAt || 0).getTime()
          );
        case "stars":
          return b.stars - a.stars;
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return b.size - a.size;
      }
    });

    return list;
  }, [repos, search, langFilter, sortBy]);

  const selectedRepo = repos.find((r) => r.id === selectedId);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }

  function formatSize(kb: number): string {
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-accent/[0.02] blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 border-b border-border/50 bg-surface/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {user.image && (
                <img
                  src={user.image}
                  alt=""
                  className="w-11 h-11 rounded-full border-2 border-accent/30 shadow-lg shadow-accent/10"
                />
              )}
              <div>
                <h1 className="text-xl font-bold">
                  Choose a repository to analyze
                </h1>
                <p className="text-muted text-sm mt-0.5">
                  {user.name ? `${user.name} · ` : ""}
                  {repos.length} repositories available
                </p>
              </div>
            </div>
            <button
              onClick={onSync}
              disabled={syncing}
              className="px-4 py-2 rounded-xl bg-surface-light border border-border hover:border-accent/30 text-sm text-muted hover:text-foreground transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <span className={syncing ? "animate-spin inline-block" : "inline-block"}><IconRefresh size={14} /></span>
              {syncing ? "Syncing..." : "Refresh"}
            </button>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-light border border-border focus:border-accent/50 focus:outline-none text-sm placeholder:text-muted/50 transition-colors"
              />
            </div>

            {/* Language filter */}
            <select
              value={langFilter || ""}
              onChange={(e) => setLangFilter(e.target.value || null)}
              className="px-3 py-2.5 rounded-xl bg-surface-light border border-border text-sm text-muted focus:outline-none focus:border-accent/50 transition-colors appearance-none cursor-pointer"
            >
              <option value="">All languages</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="px-3 py-2.5 rounded-xl bg-surface-light border border-border text-sm text-muted focus:outline-none focus:border-accent/50 transition-colors appearance-none cursor-pointer"
            >
              <option value="pushed">Recently updated</option>
              <option value="stars">Most stars</option>
              <option value="name">Name A-Z</option>
              <option value="size">Largest first</option>
            </select>
          </div>
        </div>
      </div>

      {/* Repository grid */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted">
              <p className="text-lg mb-2">No repositories match your search</p>
              <p className="text-sm">Try a different query or clear filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((repo, i) => {
                const isSelected = selectedId === repo.id;
                return (
                  <button
                    key={repo.id}
                    onClick={() =>
                      setSelectedId(isSelected ? null : repo.id)
                    }
                    disabled={isGenerating}
                    className={`group relative text-left p-5 rounded-2xl border transition-all duration-200 animate-fade-in-up disabled:opacity-50 ${
                      isSelected
                        ? "bg-accent/[0.08] border-accent/40 shadow-lg shadow-accent/5 glow-border"
                        : "bg-surface/60 border-border/50 hover:border-accent/20 hover:bg-surface/80"
                    }`}
                    style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                  >
                    {/* Selection indicator */}
                    <div
                      className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? "border-accent bg-accent"
                          : "border-border group-hover:border-muted"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Repo name */}
                    <div className="flex items-center gap-2 mb-2 pr-8">
                      {repo.language && (
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              LANG_COLORS[repo.language] || "#666",
                          }}
                        />
                      )}
                      <h3
                        className={`font-semibold text-sm truncate transition-colors ${
                          isSelected
                            ? "text-accent-glow"
                            : "group-hover:text-accent-glow"
                        }`}
                      >
                        {repo.name}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="text-muted text-xs leading-relaxed line-clamp-2 mb-3 min-h-[2.5rem]">
                      {repo.description || "No description"}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-[11px] text-muted/70">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          {repo.language}
                        </span>
                      )}
                      {repo.stars > 0 && (
                        <span className="flex items-center gap-1">
                          <IconStar size={12} /> {repo.stars}
                        </span>
                      )}
                      <span>{formatSize(repo.size)}</span>
                      <span className="ml-auto">
                        {formatDate(repo.pushedAt)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom confirmation bar */}
      <div
        className={`relative z-10 border-t border-border/50 bg-surface/80 backdrop-blur-md transition-all duration-300 ${
          selectedId ? "py-4" : "py-3"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="text-sm">
            {selectedId && selectedRepo ? (
              <span className="text-foreground">
                <span className="text-accent-glow font-semibold">
                  {selectedRepo.name}
                </span>{" "}
                selected for analysis
              </span>
            ) : (
              <span className="text-muted">
                Select a repository to begin analysis
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {selectedId && (
              <button
                onClick={() => setSelectedId(null)}
                className="px-3 py-2 text-xs text-muted hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => selectedId && onConfirm(selectedId)}
              disabled={!selectedId || isGenerating}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                selectedId
                  ? "bg-accent hover:bg-accent-glow text-white shadow-lg shadow-accent/20 hover:shadow-accent/30 hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-surface-light text-muted cursor-not-allowed"
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </span>
              ) : (
                "Analyze Repository →"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
