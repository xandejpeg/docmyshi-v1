import { create } from "zustand";

export interface RepoData {
  id: string;
  githubId: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  size: number;
  pushedAt: string | null;
  htmlUrl: string;
  isSelected: boolean;
}

export interface DocNodeData {
  id: string;
  slug: string;
  type: string;
  title: string;
  content: string;
  confidence?: string | null;     // high, medium, low
  classification?: string | null; // observed, inferred, uncertain
  evidence?: string | null;       // JSON array of file paths
}

export interface DocLinkData {
  fromNodeId: string;
  toNodeId: string;
  type: string;
  label?: string;
}

interface AppState {
  // Repos
  repos: RepoData[];
  setRepos: (repos: RepoData[]) => void;
  selectedRepoId: string | null;
  setSelectedRepoId: (id: string | null) => void;

  // Docs
  docNodes: DocNodeData[];
  docLinks: DocLinkData[];
  setDocs: (nodes: DocNodeData[], links: DocLinkData[]) => void;
  activeDocSlug: string | null;
  setActiveDocSlug: (slug: string | null) => void;

  // UI
  view: "repos" | "select" | "docs" | "doc-detail";
  setView: (view: "repos" | "select" | "docs" | "doc-detail") => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  repos: [],
  setRepos: (repos) => set({ repos }),
  selectedRepoId: null,
  setSelectedRepoId: (id) => set({ selectedRepoId: id }),

  docNodes: [],
  docLinks: [],
  setDocs: (nodes, links) => set({ docNodes: nodes, docLinks: links }),
  activeDocSlug: null,
  setActiveDocSlug: (slug) => set({ activeDocSlug: slug }),

  view: "repos",
  setView: (view) => set({ view }),
  isGenerating: false,
  setIsGenerating: (v) => set({ isGenerating: v }),
}));
