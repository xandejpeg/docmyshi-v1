"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppStore, type RepoData } from "@/lib/store";
import { Navbar } from "./navbar";
import { RepoScene } from "./repo-scene";
import { RepoSelector } from "./repo-selector";
import { DocGraphView } from "./doc-graph-view";
import { DocDetailView } from "./doc-detail-view";
import { RepoList } from "./repo-list";
import { GlassShapes } from "./glass-shapes";
import { IconX } from "./icons";

interface DashboardClientProps {
  user: {
    id: string;
    name?: string | null;
    image?: string | null;
  };
}

export function DashboardClient({ user }: DashboardClientProps) {
  const {
    repos,
    setRepos,
    view,
    setView,
    selectedRepoId,
    setSelectedRepoId,
    docNodes,
    docLinks,
    setDocs,
    activeDocSlug,
    setActiveDocSlug,
    isGenerating,
    setIsGenerating,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load repos on mount
  useEffect(() => {
    async function loadRepos() {
      try {
        const res = await fetch("/api/repos");
        const data = await res.json();
        if (Array.isArray(data)) {
          setRepos(data);
          if (data.length > 0 && view === "repos") {
            setView("select");
          }
        }
      } catch {
        setError("Failed to load repositories");
      } finally {
        setLoading(false);
      }
    }
    loadRepos();
  }, [setRepos]);

  // Sync repos from GitHub
  const syncRepos = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/repos", { method: "POST" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRepos(data);
        if (data.length > 0) setView("select");
      } else {
        setError(data.error || "Sync failed");
      }
    } catch {
      setError("Failed to sync repositories");
    } finally {
      setSyncing(false);
    }
  }, [setRepos, setView]);

  // Generate docs for a repo
  const generateDocs = useCallback(
    async (repoId: string) => {
      setIsGenerating(true);
      setSelectedRepoId(repoId);
      setError(null);
      try {
        const res = await fetch(`/api/repos/${repoId}/docs`, {
          method: "POST",
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
        setDocs(data.nodes || [], data.links || []);
        setView("docs");
      } catch {
        setError("Failed to generate documentation");
      } finally {
        setIsGenerating(false);
      }
    },
    [setIsGenerating, setSelectedRepoId, setDocs, setView, setError]
  );

  // Load existing docs for a repo
  const loadDocs = useCallback(
    async (repoId: string) => {
      setSelectedRepoId(repoId);
      try {
        const res = await fetch(`/api/repos/${repoId}/docs`);
        const data = await res.json();
        if (data.nodes && data.nodes.length > 0) {
          setDocs(data.nodes, data.links || []);
          setView("docs");
        } else {
          // No docs yet, generate them
          generateDocs(repoId);
        }
      } catch {
        generateDocs(repoId);
      }
    },
    [setSelectedRepoId, setDocs, setView, generateDocs]
  );

  const selectedRepo = repos.find((r: RepoData) => r.id === selectedRepoId);

  const handleBack = () => {
    if (view === "doc-detail") {
      setView("docs");
      setActiveDocSlug(null);
    } else if (view === "docs") {
      setView("select");
      setSelectedRepoId(null);
      setDocs([], []);
    } else if (view === "select") {
      setView("repos");
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden neural-bg">
      <GlassShapes />
      <Navbar
        user={user}
        view={view}
        selectedRepo={selectedRepo || null}
        onBack={handleBack}
      />

      {error && (
        <div className="mx-4 mt-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-white"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      <main className="flex-1 overflow-hidden relative">
        {view === "repos" && (
          <div className="h-full flex flex-col">
            {/* 3D Scene */}
            <div className="flex-1 relative">
              {repos.length > 0 ? (
                <RepoScene
                  repos={repos}
                  onSelectRepo={loadDocs}
                  isGenerating={isGenerating}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    {loading ? (
                      <div className="text-muted">Loading repositories...</div>
                    ) : (
                      <>
                        <p className="text-muted text-lg">
                          No repositories loaded yet
                        </p>
                        <button
                          onClick={async () => {
                            await syncRepos();
                            setView("select");
                          }}
                          disabled={syncing}
                          className="px-6 py-3 rounded-xl bg-accent hover:bg-accent-glow text-white font-semibold transition-all disabled:opacity-50"
                        >
                          {syncing ? "Syncing..." : "Connect & Sync from GitHub"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Repo list panel */}
            {repos.length > 0 && (
              <RepoList
                repos={repos}
                onSelectRepo={loadDocs}
                onSync={syncRepos}
                syncing={syncing}
                isGenerating={isGenerating}
              />
            )}
          </div>
        )}

        {view === "select" && (
          <RepoSelector
            repos={repos}
            user={user}
            onConfirm={loadDocs}
            onSync={syncRepos}
            syncing={syncing}
            isGenerating={isGenerating}
          />
        )}

        {view === "docs" && (
          <DocGraphView
            nodes={docNodes}
            links={docLinks}
            repoName={selectedRepo?.name || ""}
            onSelectNode={(slug) => {
              setActiveDocSlug(slug);
              setView("doc-detail");
            }}
            onRegenerate={() =>
              selectedRepoId && generateDocs(selectedRepoId)
            }
            isGenerating={isGenerating}
          />
        )}

        {view === "doc-detail" && activeDocSlug && (
          <DocDetailView
            nodes={docNodes}
            links={docLinks}
            activeSlug={activeDocSlug}
            onNavigate={(slug) => setActiveDocSlug(slug)}
            onBack={() => {
              setView("docs");
              setActiveDocSlug(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
