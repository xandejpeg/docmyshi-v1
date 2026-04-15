export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  size: number;
  default_branch: string;
  pushed_at: string | null;
  html_url: string;
  private: boolean;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTree {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export async function fetchGitHubRepos(accessToken: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=pushed&type=all`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data: GitHubRepo[] = await res.json();
    repos.push(...data);
    if (data.length < perPage) break;
    page++;
  }

  return repos;
}

export async function fetchRepoTree(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string = "main"
): Promise<GitHubTree> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  if (!res.ok) throw new Error(`GitHub Tree API error: ${res.status}`);
  return res.json();
}

export async function fetchFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  branch: string = "main"
): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.raw+json",
      },
    }
  );
  if (!res.ok) throw new Error(`GitHub Content API error: ${res.status} for ${path}`);
  return res.text();
}

// Prioritized files to read for analysis
const PRIORITY_FILES = [
  "README.md",
  "readme.md",
  "package.json",
  "Cargo.toml",
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "Makefile",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  ".env.example",
  "tsconfig.json",
  "next.config.js",
  "next.config.ts",
  "vite.config.ts",
  "vite.config.js",
];

// File extensions to consider as "code" files
const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".java",
  ".cs", ".rb", ".php", ".swift", ".kt", ".c", ".cpp", ".h",
  ".vue", ".svelte", ".astro",
]);

export function getKeyFiles(tree: GitHubTree): string[] {
  const files: string[] = [];
  const treeFiles = tree.tree.filter((t) => t.type === "blob");

  // 1. Priority config files (README, package.json, etc.)
  for (const pf of PRIORITY_FILES) {
    const found = treeFiles.find(
      (f) => f.path.toLowerCase() === pf.toLowerCase() || f.path.toLowerCase().endsWith(`/${pf.toLowerCase()}`)
    );
    if (found && !files.includes(found.path)) files.push(found.path);
  }

  // 2. Entry point files (index/main/app at root or src/)
  const entryPatterns = [/^(src\/)?(index|main|app|server)\.(ts|tsx|js|jsx|py|rs|go)$/i];
  for (const f of treeFiles) {
    if (entryPatterns.some((p) => p.test(f.path)) && !files.includes(f.path)) {
      files.push(f.path);
    }
  }

  // 3. Route/page/layout files (Next.js, etc.)
  const routeFiles = treeFiles
    .filter((f) => {
      const ext = f.path.substring(f.path.lastIndexOf("."));
      return CODE_EXTENSIONS.has(ext) && (
        f.path.includes("/route") ||
        f.path.includes("/page") ||
        f.path.includes("/layout") ||
        f.path.includes("/api/")
      );
    })
    .slice(0, 15);
  for (const f of routeFiles) {
    if (!files.includes(f.path)) files.push(f.path);
  }

  // 4. Lib/utils/services files — the actual business logic
  const libFiles = treeFiles
    .filter((f) => {
      const ext = f.path.substring(f.path.lastIndexOf("."));
      if (!CODE_EXTENSIONS.has(ext)) return false;
      const p = f.path.toLowerCase();
      return (
        p.includes("/lib/") ||
        p.includes("/utils/") ||
        p.includes("/services/") ||
        p.includes("/hooks/") ||
        p.includes("/helpers/") ||
        p.includes("/core/") ||
        p.includes("/middleware") ||
        p.includes("/auth") ||
        p.includes("/store") ||
        p.includes("/config/") ||
        p.includes("/db/") ||
        p.includes("/models/") ||
        p.includes("/schemas/") ||
        p.includes("/types/")
      );
    })
    .slice(0, 20);
  for (const f of libFiles) {
    if (!files.includes(f.path)) files.push(f.path);
  }

  // 5. Component files — sample the most important ones
  const componentFiles = treeFiles
    .filter((f) => {
      const ext = f.path.substring(f.path.lastIndexOf("."));
      if (!CODE_EXTENSIONS.has(ext)) return false;
      const p = f.path.toLowerCase();
      return (
        p.includes("/components/") ||
        p.includes("/views/") ||
        p.includes("/pages/") ||
        p.includes("/screens/")
      );
    })
    .slice(0, 10);
  for (const f of componentFiles) {
    if (!files.includes(f.path)) files.push(f.path);
  }

  // 6. Test files — just a few to understand test patterns
  const testFiles = treeFiles
    .filter((f) => {
      const p = f.path.toLowerCase();
      return p.includes(".test.") || p.includes(".spec.") || p.includes("__tests__");
    })
    .slice(0, 3);
  for (const f of testFiles) {
    if (!files.includes(f.path)) files.push(f.path);
  }

  return files.slice(0, 50); // Increased from 25 to 50 for deeper analysis
}

export function buildTreeSummary(tree: GitHubTree): string {
  const dirs = new Set<string>();
  const filesByDir: Record<string, string[]> = {};

  for (const item of tree.tree) {
    if (item.type === "tree") {
      dirs.add(item.path);
    } else {
      const dir = item.path.includes("/")
        ? item.path.substring(0, item.path.lastIndexOf("/"))
        : ".";
      if (!filesByDir[dir]) filesByDir[dir] = [];
      filesByDir[dir].push(item.path.split("/").pop()!);
    }
  }

  let summary = "```\n";
  const rootFiles = filesByDir["."] || [];
  for (const f of rootFiles.slice(0, 15)) {
    summary += `${f}\n`;
  }
  if (rootFiles.length > 15) summary += `... and ${rootFiles.length - 15} more files\n`;

  const sortedDirs = Array.from(dirs).sort();
  for (const dir of sortedDirs.slice(0, 50)) {
    const files = filesByDir[dir] || [];
    const depth = dir.split("/").length;
    const indent = "  ".repeat(depth);
    summary += `${indent}${dir.split("/").pop()}/`;
    if (files.length > 0) {
      summary += ` (${files.length} files)`;
    }
    summary += "\n";
  }
  if (sortedDirs.length > 50) summary += `... and ${sortedDirs.length - 50} more directories\n`;
  summary += "```";

  return summary;
}
