import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { IconSearch, IconBrain, IconTarget } from "@/components/icons";
import { GlassShapes } from "@/components/glass-shapes";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex flex-col min-h-screen overflow-hidden neural-bg">
      {/* Animated glass shapes */}
      <GlassShapes />

      {/* Top nav */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/20 text-accent">
            <IconBrain size={18} />
          </div>
          <span className="font-bold text-lg tracking-tight">
            Doc<span className="text-accent-glow">MyShi</span>
          </span>
        </div>
        <a
          href="https://github.com/xandejpeg"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted text-xs hover:text-foreground transition-colors"
        >
          by xandejpeg
        </a>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-2xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Technical Understanding Engine
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-[1.15] tracking-tight mb-5">
              Reconstruct the
              <br />
              <span className="text-accent-glow glow-text">understanding</span> of
              <br />
              your own code
            </h1>
            <p className="text-muted text-base sm:text-lg max-w-md mx-auto leading-relaxed">
              Connect your GitHub. DocMyShi reads your repositories, analyzes their
              structure, and generates navigable documentation grounded in evidence.
            </p>
          </div>

          {/* Connect card */}
          <div className="max-w-sm mx-auto">
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/dashboard" });
              }}
            >
              <button
                type="submit"
                className="group w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white text-black font-semibold text-base hover:bg-gray-50 transition-all shadow-lg shadow-white/5 hover:shadow-white/10 hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Connect with GitHub
                <span className="text-black/40 group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            </form>

            <p className="text-muted/60 text-xs text-center mt-4 leading-relaxed">
              Read-only access · You choose which repos to analyze · Nothing runs without your approval
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-lg sm:max-w-none mx-auto">
            <div className="p-5 rounded-2xl bg-surface/50 border border-border/50 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mb-3 text-accent">
                <IconSearch size={16} />
              </div>
              <h3 className="text-sm font-semibold mb-1">Evidence-Based</h3>
              <p className="text-muted text-xs leading-relaxed">
                Every claim traces back to actual code. Confidence levels tell you what's observed vs. inferred.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-surface/50 border border-border/50 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mb-3 text-accent">
                <IconBrain size={16} />
              </div>
              <h3 className="text-sm font-semibold mb-1">Interconnected</h3>
              <p className="text-muted text-xs leading-relaxed">
                Documentation nodes link to each other. Navigate architecture, modules, and flows as a knowledge graph.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-surface/50 border border-border/50 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mb-3 text-accent">
                <IconTarget size={16} />
              </div>
              <h3 className="text-sm font-semibold mb-1">You Control It</h3>
              <p className="text-muted text-xs leading-relaxed">
                Select which repositories to analyze. Nothing is processed without your explicit choice.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6">
        <p className="text-muted/40 text-xs">
          DocMyShi — Technical understanding reconstruction
        </p>
      </footer>
    </div>
  );
}
