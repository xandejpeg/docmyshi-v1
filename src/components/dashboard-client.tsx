"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppStore, type RepoData } from "@/lib/store";
import { Navbar } from "./navbar";
import { RepoSelector } from "./repo-selector";
import { DocDetailView } from "./doc-detail-view";
import { GlassShapes } from "./glass-shapes";
import { IconX, IconRefresh } from "./icons";

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
  const [genStatus, setGenStatus] = useState<string | null>(null);

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
        setError("Falha ao carregar repositórios");
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
        setError(data.error || "Falha na sincronização");
      }
    } catch {
      setError("Falha ao sincronizar repositórios");
    } finally {
      setSyncing(false);
    }
  }, [setRepos, setView]);

  // Delete docs for a repo
  const deleteDocs = useCallback(
    async (repoId: string) => {
      setError(null);
      try {
        const res = await fetch(`/api/repos/${repoId}/docs`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
        // Update repo docCount in store
        setRepos(
          repos.map((r: RepoData) =>
            r.id === repoId ? { ...r, docCount: 0 } : r
          )
        );
      } catch {
        setError("Falha ao excluir documentação");
      }
    },
    [repos, setRepos]
  );

  // Generate docs for a repo
  const generateDocs = useCallback(
    async (repoId: string) => {
      setIsGenerating(true);
      setSelectedRepoId(repoId);
      setError(null);
      const repoName =
        repos.find((r: RepoData) => r.id === repoId)?.name || "repo";
      setGenStatus(
        `Gerando documentação para ${repoName}... Pode levar 1-2 minutos.`
      );
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
        setActiveDocSlug("overview");
        setView("doc-detail");
        // Update docCount in store
        setRepos(
          repos.map((r: RepoData) =>
            r.id === repoId ? { ...r, docCount: data.nodes?.length || 0 } : r
          )
        );
      } catch {
        setError("Falha ao gerar documentação");
      } finally {
        setIsGenerating(false);
        setGenStatus(null);
      }
    },
    [setIsGenerating, setSelectedRepoId, setDocs, setView, setError, repos, setRepos]
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
          setActiveDocSlug(data.nodes[0]?.slug || "overview");
          setView("doc-detail");
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
    if (view === "doc-detail" || view === "docs") {
      setView("select");
      setSelectedRepoId(null);
      setActiveDocSlug(null);
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

      {genStatus && (
        <div className="mx-4 mt-2 px-4 py-3 rounded-lg bg-accent/10 border border-accent/30 text-accent-glow text-sm flex items-center gap-3">
          <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin flex-shrink-0" />
          {genStatus}
        </div>
      )}

      <main className="flex-1 overflow-hidden relative">
        {(view === "repos" || view === "select") && (
          <RepoSelector
            repos={repos}
            user={user}
            onConfirm={loadDocs}
            onGenerate={generateDocs}
            onDelete={deleteDocs}
            onSync={syncRepos}
            syncing={syncing}
            isGenerating={isGenerating}
          />
        )}

        {(view === "docs" || view === "doc-detail") && activeDocSlug && (
          <DocDetailView
            nodes={docNodes}
            links={docLinks}
            activeSlug={activeDocSlug}
            onNavigate={(slug) => setActiveDocSlug(slug)}
            onBack={() => {
              setView("select");
              setSelectedRepoId(null);
              setActiveDocSlug(null);
              setDocs([], []);
            }}
            onRegenerate={
              selectedRepoId
                ? () => generateDocs(selectedRepoId)
                : undefined
            }
            isGenerating={isGenerating}
          />
        )}
      </main>
    </div>
  );
}
