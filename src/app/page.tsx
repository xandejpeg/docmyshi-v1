import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { IconBrain, IconLink, IconSparkles, IconGlobe } from "@/components/icons";
import { GlassShapes } from "@/components/glass-shapes";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex flex-col min-h-screen neural-bg">
      <GlassShapes />
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
            <IconBrain size={16} />
          </div>
          <span className="font-bold text-lg tracking-tight">
            Doc<span className="text-accent-glow">MyShi</span>
          </span>
        </div>
        <Link
          href="/login"
          className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-glow text-white text-sm font-medium transition-colors"
        >
          Sign in with GitHub
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl space-y-8">
          {/* Hero icon */}
          <div className="relative mx-auto w-48 h-48 mb-4">
            <div className="absolute inset-0 rounded-full bg-accent/10 animate-pulse-glow" />
            <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-accent/20 animate-float" />
            <div
              className="absolute top-16 right-6 w-6 h-6 rounded-full bg-[var(--brain-blue)]/30 animate-float"
              style={{ animationDelay: "1s" }}
            />
            <div
              className="absolute bottom-8 left-12 w-8 h-8 rounded-full bg-accent/25 animate-float"
              style={{ animationDelay: "2s" }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-accent-glow">
              <IconBrain size={56} />
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
            Rebuild{" "}
            <span className="text-accent-glow glow-text">understanding</span>
            <br />
            of your own code
          </h1>

          <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
            DocMyShi connects to your GitHub, analyzes your repositories, and
            transforms them into{" "}
            <span className="text-foreground font-medium">
              navigable technical documentation
            </span>
            . Revisit old projects, recover lost context, and understand what
            you built — without rereading everything.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-3 rounded-xl bg-accent hover:bg-accent-glow text-white font-semibold text-lg transition-all glow-box hover:scale-105"
            >
              Get Started — Free
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-3 rounded-xl border border-border hover:border-accent/50 text-muted hover:text-foreground font-medium text-lg transition-colors"
            >
              How it works
            </a>
          </div>
        </div>

        {/* Features */}
        <section id="how-it-works" className="mt-32 max-w-5xl w-full">
          <h2 className="text-2xl font-bold text-center mb-12">
            From <span className="text-accent-glow">code chaos</span> to{" "}
            <span className="text-accent-glow">clarity</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-surface border border-border hover:border-accent/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3 text-accent">
                <IconLink size={22} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Connect GitHub</h3>
              <p className="text-muted text-sm leading-relaxed">Sign in with GitHub and select which repositories you want to document.</p>
            </div>
            <div className="p-6 rounded-xl bg-surface border border-border hover:border-accent/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3 text-accent">
                <IconSparkles size={22} />
              </div>
              <h3 className="font-semibold text-lg mb-2">AI Analysis</h3>
              <p className="text-muted text-sm leading-relaxed">Our engine reads your code structure and generates multi-layered Markdown documentation.</p>
            </div>
            <div className="p-6 rounded-xl bg-surface border border-border hover:border-accent/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3 text-accent">
                <IconGlobe size={22} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Navigate in 3D</h3>
              <p className="text-muted text-sm leading-relaxed">Explore your repos as floating spheres in a futuristic 3D environment. Dive into interconnected docs.</p>
            </div>
          </div>
        </section>

        {/* Doc types */}
        <section className="mt-24 max-w-4xl w-full mb-32">
          <h2 className="text-2xl font-bold text-center mb-8">
            Documentation that{" "}
            <span className="text-accent-glow">actually helps</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              "Project Overview",
              "Architecture & Design",
              "Modules & Components",
              "File & Directory Map",
              "How to Run",
              "Tech Debt & Risks",
            ].map((t) => (
              <div
                key={t}
                className="px-4 py-3 rounded-lg bg-surface-light border border-border text-sm font-medium text-center"
              >
                {t}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-4 text-center text-muted text-sm">
        DocMyShi — built by{" "}
        <a
          href="https://github.com/xandejpeg"
          className="text-accent-glow hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          xandejpeg
        </a>
      </footer>
    </div>
  );
}
