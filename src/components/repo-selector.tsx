"use client";

import { useState, useMemo } from "react";
import type { RepoData } from "@/lib/store";
import { IconRefresh, IconStar, IconTrash } from "@/components/icons";

interface RepoSelectorProps {
  repos: RepoData[];
  user: { name?: string | null; image?: string | null };
  onConfirm: (repoId: string) => void;
  onGenerate: (repoId: string) => void;
  onDelete: (repoId: string) => void;
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
  onGenerate,
  onDelete,
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
    if (days < 1) return "hoje";
    if (days === 1) return "ontem";
    if (days < 30) return `${days}d atrás`;
    if (days < 365) return `${Math.floor(days / 30)}m atrás`;
    return `${Math.floor(days / 365)}a atrás`;
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
                  Escolha um repositório para analisar
                </h1>
                <p className="text-muted text-sm mt-0.5">
                  {user.name ? `${user.name} · ` : ""}
                  {repos.length} repositórios disponíveis
                </p>
              </div>
            </div>
            <button
              onClick={onSync}
              disabled={syncing}
              className="px-4 py-2 rounded-xl bg-surface-light border border-border hover:border-accent/30 text-sm text-muted hover:text-foreground transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <span className={syncing ? "animate-spin inline-block" : "inline-block"}><IconRefresh size={14} /></span>
              {syncing ? "Sincronizando..." : "Atualizar"}
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
                placeholder="Buscar repositórios..."
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
              <option value="">Todas as linguagens</option>
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
              <option value="pushed">Mais recentes</option>
              <option value="stars">Mais estrelas</option>
              <option value="name">Nome A-Z</option>
              <option value="size">Maiores primeiro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Repository grid */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted">
              <p className="text-lg mb-2">Nenhum repositório encontrado</p>
              <p className="text-sm">Tente outra busca ou limpe os filtros</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((repo, i) => {
                const isSelected = selectedId === repo.id;
                const hasDocs = (repo.docCount || 0) > 0;
                return (
                  <div
                    key={repo.id}
                    onClick={() =>
                      setSelectedId(isSelected ? null : repo.id)
                    }
                    className={`group relative text-left p-5 rounded-2xl border transition-all duration-200 animate-fade-in-up cursor-pointer ${
                      isSelected
                        ? "bg-accent/[0.08] border-accent/40 shadow-lg shadow-accent/5 glow-border"
                        : "bg-surface/60 border-border/50 hover:border-accent/20 hover:bg-surface/80"
                    } ${isGenerating ? "opacity-50 pointer-events-none" : ""}`}
                    style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                  >
                    {/* Doc status badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5">
                      {hasDocs && (
                        <span className="px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-medium">
                          {repo.docCount} docs
                        </span>
                      )}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
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
                    </div>

                    {/* Repo name */}
                    <div className="flex items-center gap-2 mb-2 pr-20">
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
                      {repo.description || "Sem descrição"}
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
                  </div>
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
                {(selectedRepo.docCount || 0) > 0
                  ? `· ${selectedRepo.docCount} docs gerados`
                  : "· sem docs ainda"}
              </span>
            ) : (
              <span className="text-muted">
                Selecione um repositório para analisar
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedId && (
              <button
                onClick={() => setSelectedId(null)}
                className="px-3 py-2 text-xs text-muted hover:text-foreground transition-colors"
              >
                Limpar
              </button>
            )}

            {/* Delete button — only if docs exist */}
            {selectedId && selectedRepo && (selectedRepo.docCount || 0) > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Excluir todos os docs de ${selectedRepo.name}?`)) {
                    onDelete(selectedId);
                  }
                }}
                disabled={isGenerating}
                className="px-3 py-2.5 rounded-xl text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <IconTrash size={14} />
                Excluir Docs
              </button>
            )}

            {/* View docs — only if docs exist */}
            {selectedId && selectedRepo && (selectedRepo.docCount || 0) > 0 && (
              <button
                onClick={() => onConfirm(selectedId)}
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-accent/30 text-accent-glow hover:bg-accent/10 transition-all disabled:opacity-50"
              >
                Ver Docs
              </button>
            )}

            {/* Generate / Regenerate */}
            <button
              onClick={() => selectedId && onGenerate(selectedId)}
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
                  Gerando...
                </span>
              ) : selectedRepo && (selectedRepo.docCount || 0) > 0 ? (
                <span className="flex items-center gap-1.5">
                  <IconRefresh size={14} />
                  Regenerar →
                </span>
              ) : (
                "Gerar Docs →"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
