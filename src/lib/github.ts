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

  // Add priority config files
  for (const pf of PRIORITY_FILES) {
    const found = treeFiles.find(
      (f) => f.path.toLowerCase() === pf.toLowerCase() || f.path.toLowerCase().endsWith(`/${pf.toLowerCase()}`)
    );
    if (found) files.push(found.path);
  }

  // Add entry point files (index/main/app at root or src/)
  const entryPatterns = [/^(src\/)?(index|main|app|server)\.(ts|tsx|js|jsx|py|rs|go)$/i];
  for (const f of treeFiles) {
    if (entryPatterns.some((p) => p.test(f.path)) && !files.includes(f.path)) {
      files.push(f.path);
    }
  }

  // Add route/page files (first 10)
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
    .slice(0, 10);
  for (const f of routeFiles) {
    if (!files.includes(f.path)) files.push(f.path);
  }

  return files.slice(0, 25); // Cap at 25 files to manage token cost
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
