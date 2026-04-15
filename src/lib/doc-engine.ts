import { fetchRepoTree, fetchFileContent, getKeyFiles, buildTreeSummary } from "./github";

interface DocGenerationInput {
  repoName: string;
  repoFullName: string;
  description: string | null;
  language: string | null;
  accessToken: string;
  defaultBranch: string;
}

interface GeneratedDoc {
  slug: string;
  type: string;
  title: string;
  content: string;
  confidence: "high" | "medium" | "low";
  classification: "observed" | "inferred" | "uncertain";
  evidence: string[]; // file paths used as evidence
}

interface GeneratedLink {
  fromSlug: string;
  toSlug: string;
  type: string;
  label?: string;
}

export interface DocGenerationResult {
  docs: GeneratedDoc[];
  links: GeneratedLink[];
}

export async function generateDocs(input: DocGenerationInput): Promise<DocGenerationResult> {
  const [owner, repo] = input.repoFullName.split("/");

  // 1. Fetch repo tree
  const tree = await fetchRepoTree(input.accessToken, owner, repo, input.defaultBranch);
  const treeSummary = buildTreeSummary(tree);

  // 2. Fetch key files
  const keyFilePaths = getKeyFiles(tree);
  const keyFiles: Record<string, string> = {};

  for (const path of keyFilePaths) {
    try {
      const content = await fetchFileContent(input.accessToken, owner, repo, path, input.defaultBranch);
      // Limit each file to 3000 chars to manage token costs
      keyFiles[path] = content.length > 3000 ? content.slice(0, 3000) + "\n... (truncated)" : content;
    } catch {
      // Skip files that can't be read
    }
  }

  // 3. Build the analysis prompt
  const keyFilesText = Object.entries(keyFiles)
    .map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``)
    .join("\n\n");

  const prompt = buildPrompt(input, treeSummary, keyFilesText);

  // 4. Call LLM
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_anthropic_api_key") {
    // Fallback: generate placeholder docs so the app works without an API key
    return generatePlaceholderDocs(input, treeSummary, keyFiles);
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";

  // 5. Parse the LLM response
  return parseLLMResponse(text);
}

function buildPrompt(
  input: DocGenerationInput,
  treeSummary: string,
  keyFilesText: string
): string {
  return `You are a senior software architect performing evidence-based code analysis. Analyze this repository and generate documentation grounded in what you can actually observe.

## Repository Info
- **Name**: ${input.repoName}
- **Full name**: ${input.repoFullName}
- **Description**: ${input.description || "No description"}
- **Primary language**: ${input.language || "Unknown"}

## File Structure
${treeSummary}

## Key Files Content
${keyFilesText}

## Task
Generate exactly 6 documentation nodes. Each node is a Markdown document with metadata.

Output them in this EXACT format:

---DOC_START---
SLUG: overview
TYPE: overview
TITLE: Project Overview
CONFIDENCE: high|medium|low
CLASSIFICATION: observed|inferred|uncertain
EVIDENCE: file1.ts, file2.json, path/to/file.ts
---CONTENT---
(markdown content here)
---DOC_END---

Generate these 6 documents:
1. SLUG: overview — Project Overview
2. SLUG: architecture — Architecture & Design
3. SLUG: modules — Modules & Components
4. SLUG: file-map — File & Directory Map
5. SLUG: how-to-run — How to Run
6. SLUG: tech-debt — Tech Debt & Risks

## Metadata Rules

**CONFIDENCE** — how confident you are in the document's claims:
- **high**: multiple files directly support the claims
- **medium**: some files support it, some is logical deduction
- **low**: mostly inferred from limited evidence

**CLASSIFICATION** — the dominant truth basis:
- **observed**: content is directly from code/config (e.g., file-map, how-to-run from package.json)
- **inferred**: content is logically deduced from patterns (e.g., architecture from directory structure)
- **uncertain**: content is based on weak signals or guesswork

**EVIDENCE** — comma-separated list of the specific files from the Key Files that support this document's claims. Only list files you actually used.

## Content Guidelines
- Ground every claim in evidence. When describing something, reference the file(s) that prove it.
- Use phrases like "Based on \`package.json\`..." or "As seen in \`src/lib/auth.ts\`..." naturally in the text.
- Distinguish what you OBSERVE (e.g., "The project uses Next.js 16" from package.json) vs. what you INFER (e.g., "The architecture appears to follow a modular pattern").
- When uncertain, say so: "It's unclear whether..." or "No evidence was found for..."
- Each document should be 100-300 lines of Markdown.
- Use headers, lists, code blocks, and tables where appropriate.
- Reference other docs using [[slug]] syntax (e.g., "See [[architecture]] for more details").
- For tech-debt, only flag issues you can actually point to in the code.
- Be honest — if something looks improvised or unclear, say so. If you lack evidence, say "insufficient evidence" rather than guessing.`;
}

function parseConfidence(raw: string | undefined): "high" | "medium" | "low" {
  const val = raw?.trim().toLowerCase();
  if (val === "high" || val === "medium" || val === "low") return val;
  return "medium"; // safe default
}

function parseClassification(raw: string | undefined): "observed" | "inferred" | "uncertain" {
  const val = raw?.trim().toLowerCase();
  if (val === "observed" || val === "inferred" || val === "uncertain") return val;
  return "inferred"; // safe default
}

function parseEvidence(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseLLMResponse(text: string): DocGenerationResult {
  const docs: GeneratedDoc[] = [];
  const links: GeneratedLink[] = [];

  const docBlocks = text.split("---DOC_START---").filter((b) => b.includes("---DOC_END---"));

  for (const block of docBlocks) {
    const slugMatch = block.match(/SLUG:\s*(.+)/);
    const typeMatch = block.match(/TYPE:\s*(.+)/);
    const titleMatch = block.match(/TITLE:\s*(.+)/);
    const confidenceMatch = block.match(/CONFIDENCE:\s*(.+)/);
    const classificationMatch = block.match(/CLASSIFICATION:\s*(.+)/);
    const evidenceMatch = block.match(/EVIDENCE:\s*(.+)/);
    const contentMatch = block.match(/---CONTENT---\s*([\s\S]*?)---DOC_END---/);

    if (slugMatch && typeMatch && titleMatch && contentMatch) {
      const slug = slugMatch[1].trim();
      const content = contentMatch[1].trim();

      docs.push({
        slug,
        type: typeMatch[1].trim(),
        title: titleMatch[1].trim(),
        content,
        confidence: parseConfidence(confidenceMatch?.[1]),
        classification: parseClassification(classificationMatch?.[1]),
        evidence: parseEvidence(evidenceMatch?.[1]),
      });

      // Extract [[slug]] references as links
      const refMatches = content.matchAll(/\[\[([a-z0-9-]+)\]\]/g);
      for (const refMatch of refMatches) {
        links.push({
          fromSlug: slug,
          toSlug: refMatch[1],
          type: "relates-to",
        });
      }
    }
  }

  // If parsing failed, return at least an overview
  if (docs.length === 0) {
    docs.push({
      slug: "overview",
      type: "overview",
      title: "Project Overview",
      content: text || "Documentation generation failed. Please try again.",
      confidence: "low",
      classification: "uncertain",
      evidence: [],
    });
  }

  return { docs, links };
}

function generatePlaceholderDocs(
  input: DocGenerationInput,
  treeSummary: string,
  keyFiles: Record<string, string>
): DocGenerationResult {
  const fileList = Object.keys(keyFiles);

  const docs: GeneratedDoc[] = [
    {
      slug: "overview",
      type: "overview",
      title: "Project Overview",
      confidence: "medium",
      classification: "observed",
      evidence: fileList.slice(0, 5),
      content: `# ${input.repoName}

${input.description || "No description provided."}

**Primary Language**: ${input.language || "Unknown"}
**Repository**: [${input.repoFullName}](https://github.com/${input.repoFullName})

## Summary

This documentation was generated without an LLM API key. Configure \`ANTHROPIC_API_KEY\` in your \`.env\` file to get AI-powered documentation.

## Key Files Detected

${fileList.map((f) => `- \`${f}\``).join("\n")}

See [[architecture]] for structure details and [[modules]] for component breakdown.`,
    },
    {
      slug: "architecture",
      type: "architecture",
      title: "Architecture & Design",
      confidence: "medium",
      classification: "observed",
      evidence: fileList.filter((f) => f.includes("package.json") || f.includes("tsconfig")),
      content: `# Architecture & Design

## File Structure

${treeSummary}

## Technology Stack

- **Language**: ${input.language || "Unknown"}
${keyFiles["package.json"] ? "- **Runtime**: Node.js\n- **Package Manager**: npm" : ""}

See [[overview]] for project context and [[modules]] for component details.`,
    },
    {
      slug: "modules",
      type: "modules",
      title: "Modules & Components",
      confidence: "low",
      classification: "inferred",
      evidence: fileList.slice(0, 3),
      content: `# Modules & Components

## Detected Structure

${treeSummary}

> Configure \`ANTHROPIC_API_KEY\` for detailed module analysis.

See [[architecture]] for high-level design and [[file-map]] for the complete file tree.`,
    },
    {
      slug: "file-map",
      type: "file-map",
      title: "File & Directory Map",
      confidence: "high",
      classification: "observed",
      evidence: fileList,
      content: `# File & Directory Map

${treeSummary}

## Key Files

${fileList.map((f) => `### \`${f}\`\nDetected as a key file for understanding this project.`).join("\n\n")}

See [[overview]] for project context.`,
    },
    {
      slug: "how-to-run",
      type: "how-to-run",
      title: "How to Run",
      confidence: keyFiles["package.json"] ? "medium" : "low",
      classification: keyFiles["package.json"] ? "observed" : "uncertain",
      evidence: fileList.filter((f) => f.includes("package.json") || f.includes("README")),
      content: `# How to Run

## Prerequisites

${keyFiles["package.json"] ? "- Node.js installed\n- npm or yarn" : "- Check the project's README for requirements"}

## Setup

\`\`\`bash
git clone https://github.com/${input.repoFullName}.git
cd ${input.repoName}
${keyFiles["package.json"] ? "npm install\nnpm run dev" : "# Check README for specific commands"}
\`\`\`

> Configure \`ANTHROPIC_API_KEY\` for detailed setup instructions.

See [[overview]] for project context.`,
    },
    {
      slug: "tech-debt",
      type: "tech-debt",
      title: "Tech Debt & Risks",
      confidence: "low",
      classification: "uncertain",
      evidence: [],
      content: `# Tech Debt & Risks

> **Note**: This is a placeholder. Configure \`ANTHROPIC_API_KEY\` for real tech debt analysis.

## General Observations

- Documentation quality should be assessed
- Test coverage is unknown
- Dependency freshness needs checking

See [[architecture]] for structural considerations and [[modules]] for component-level analysis.`,
    },
  ];

  const links: GeneratedLink[] = [
    { fromSlug: "overview", toSlug: "architecture", type: "details" },
    { fromSlug: "overview", toSlug: "modules", type: "details" },
    { fromSlug: "architecture", toSlug: "modules", type: "details" },
    { fromSlug: "architecture", toSlug: "file-map", type: "details" },
    { fromSlug: "modules", toSlug: "file-map", type: "relates-to" },
    { fromSlug: "how-to-run", toSlug: "overview", type: "relates-to" },
    { fromSlug: "tech-debt", toSlug: "architecture", type: "relates-to" },
    { fromSlug: "tech-debt", toSlug: "modules", type: "relates-to" },
  ];

  return { docs, links };
}
