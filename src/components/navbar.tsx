"use client";

import { signOut } from "next-auth/react";
import type { RepoData } from "@/lib/store";
import { IconBrain, IconArrowLeft, IconLogOut } from "@/components/icons";

interface NavbarProps {
  user: {
    name?: string | null;
    image?: string | null;
  };
  view: "repos" | "select" | "docs" | "doc-detail";
  selectedRepo: RepoData | null;
  onBack: () => void;
}

export function Navbar({ user, view, selectedRepo, onBack }: NavbarProps) {
  return (
    <nav className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-surface/80 backdrop-blur-sm z-50">
      <div className="flex items-center gap-3">
        {view !== "repos" && (
          <button
            onClick={onBack}
            className="px-2 py-1 rounded-lg hover:bg-surface-light text-muted hover:text-foreground transition-colors text-sm flex items-center gap-1"
          >
            <IconArrowLeft size={14} /> Back
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-accent/20 flex items-center justify-center text-accent">
            <IconBrain size={16} />
          </div>
          <span className="font-bold text-sm tracking-tight">
            Doc<span className="text-accent-glow">MyShi</span>
          </span>
        </div>
        {selectedRepo && (
          <span className="text-muted text-sm">
            / <span className="text-foreground">{selectedRepo.name}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-muted text-sm hidden sm:block">
          {user.name}
        </span>
        {user.image && (
          <img
            src={user.image}
            alt=""
            className="w-7 h-7 rounded-full border border-border"
          />
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-light transition-colors text-xs flex items-center gap-1"
        >
          <IconLogOut size={12} /> Sign out
        </button>
      </div>
    </nav>
  );
}
