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
  console.log(`[DocMyShi] 📂 Buscando árvore do repositório ${input.repoFullName}...`);
  const tree = await fetchRepoTree(input.accessToken, owner, repo, input.defaultBranch);
  const treeSummary = buildTreeSummary(tree);
  console.log(`[DocMyShi] 📂 Árvore: ${tree.tree.length} itens encontrados`);

  // 2. Fetch key files (increased limit for comprehensive docs)
  const keyFilePaths = getKeyFiles(tree);
  console.log(`[DocMyShi] 📄 Lendo ${keyFilePaths.length} arquivos-chave...`);
  const keyFiles: Record<string, string> = {};
  let totalChars = 0;

  for (const path of keyFilePaths) {
    try {
      const content = await fetchFileContent(input.accessToken, owner, repo, path, input.defaultBranch);
      keyFiles[path] = content.length > 12000 ? content.slice(0, 12000) + "\n... (truncado)" : content;
      totalChars += keyFiles[path].length;
      console.log(`[DocMyShi]   ✓ ${path} (${content.length} chars)`);
    } catch {
      console.log(`[DocMyShi]   ✗ ${path} (falha ao ler)`);
    }
  }
  console.log(`[DocMyShi] 📊 Total: ${Object.keys(keyFiles).length} arquivos lidos, ${(totalChars / 1024).toFixed(1)}KB de contexto`);

  // 3. Try VS Code Bridge first (uses Copilot — free)
  console.log(`[DocMyShi] 🔌 Tentando VS Code Bridge (porta 3002)...`);
  const bridgeResult = await tryVSCodeBridge(input, treeSummary, keyFiles);
  if (bridgeResult) {
    console.log(`[DocMyShi] ✅ Bridge gerou ${bridgeResult.docs.length} docs, ${bridgeResult.links.length} links`);
    for (const doc of bridgeResult.docs) {
      console.log(`[DocMyShi]   📝 ${doc.slug} — ${doc.title} (${doc.confidence}, ${doc.content.length} chars)`);
    }
    return bridgeResult;
  }

  // 4. Fallback: generate placeholder docs (no AI available)
  console.log(`[DocMyShi] ⚠️ Bridge indisponível, gerando placeholders...`);
  return generatePlaceholderDocs(input, treeSummary, keyFiles);
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
      title: "Visão Geral do Projeto",
      confidence: "low",
      classification: "uncertain",
      evidence: fileList.slice(0, 3),
      content: `# Visão Geral do Projeto

> **Este é um documento provisório.** A extensão DocMyShi Bridge não está ativa no VS Code.
> Clique em **Regenerar** para gerar a documentação real via Copilot.

## ${input.repoName}

${input.description || "Sem descrição fornecida."}

**Linguagem principal**: ${input.language || "Desconhecida"}
**Repositório**: [${input.repoFullName}](https://github.com/${input.repoFullName})

### Arquivos-chave detectados

${fileList.map((f) => `- \`${f}\``).join("\n")}

Veja [[architecture]] para a estrutura, [[modules]] para componentes e [[how-to-run]] para instruções.`,
    },
    {
      slug: "architecture",
      type: "architecture",
      title: "Arquitetura e Design",
      confidence: "low",
      classification: "uncertain",
      evidence: [],
      content: `# Arquitetura e Design

> Documento provisório — regenere com a Bridge ativa para análise real.

## Estrutura de Diretórios

${treeSummary}

Veja [[overview]] para contexto e [[modules]] para detalhes dos módulos.`,
    },
    {
      slug: "modules",
      type: "modules",
      title: "Módulos e Componentes",
      confidence: "low",
      classification: "uncertain",
      evidence: [],
      content: `# Módulos e Componentes

> Documento provisório — regenere com a Bridge ativa para análise real.

Módulos serão identificados automaticamente pela análise de IA.

Veja [[architecture]] para visão macro e [[file-map]] para mapa de arquivos.`,
    },
    {
      slug: "flows",
      type: "flows",
      title: "Fluxos do Sistema",
      confidence: "low",
      classification: "uncertain",
      evidence: [],
      content: `# Fluxos do Sistema

> Documento provisório — regenere com a Bridge ativa para análise real.

Fluxos de uso serão mapeados pela análise de IA.

Veja [[modules]] para componentes e [[architecture]] para contexto.`,
    },
    {
      slug: "file-map",
      type: "file-map",
      title: "Mapa de Arquivos e Pastas",
      confidence: "medium",
      classification: "observed",
      evidence: fileList,
      content: `# Mapa de Arquivos e Pastas

## Árvore Completa

${treeSummary}

## Arquivos-Chave

${fileList.map((f) => `- \`${f}\``).join("\n")}

Veja [[modules]] para detalhes funcionais.`,
    },
    {
      slug: "risks",
      type: "tech-debt",
      title: "Riscos e Dívida Técnica",
      confidence: "low",
      classification: "uncertain",
      evidence: [],
      content: `# Riscos e Dívida Técnica

> Documento provisório — regenere com a Bridge ativa para análise real.

Riscos e dívida técnica serão identificados pela análise de IA.

Veja [[architecture]] para contexto estrutural.`,
    },
    {
      slug: "how-to-run",
      type: "how-to-run",
      title: "Como Rodar e Evoluir",
      confidence: keyFiles["package.json"] ? "medium" : "low",
      classification: keyFiles["package.json"] ? "observed" : "uncertain",
      evidence: fileList.filter((f) => f.includes("package.json") || f.includes("README")),
      content: `# Como Rodar e Evoluir

\`\`\`bash
git clone https://github.com/${input.repoFullName}.git
cd ${input.repoName}
${keyFiles["package.json"] ? "npm install\nnpm run dev" : "# Verifique o README para comandos"}
\`\`\`

> Regenere com a Bridge ativa para instruções completas.

Veja [[overview]] para contexto do projeto.`,
    },
  ];

  const links: GeneratedLink[] = [
    { fromSlug: "overview", toSlug: "architecture", type: "relates-to" },
    { fromSlug: "overview", toSlug: "modules", type: "relates-to" },
    { fromSlug: "overview", toSlug: "how-to-run", type: "relates-to" },
    { fromSlug: "architecture", toSlug: "modules", type: "relates-to" },
    { fromSlug: "architecture", toSlug: "file-map", type: "relates-to" },
    { fromSlug: "modules", toSlug: "flows", type: "relates-to" },
    { fromSlug: "modules", toSlug: "file-map", type: "relates-to" },
    { fromSlug: "flows", toSlug: "risks", type: "relates-to" },
    { fromSlug: "risks", toSlug: "architecture", type: "relates-to" },
    { fromSlug: "how-to-run", toSlug: "overview", type: "relates-to" },
  ];

  return { docs, links };
}

// ── VS Code Bridge (uses Copilot via local extension) ──

const BRIDGE_URL = "http://127.0.0.1:3002";

async function tryVSCodeBridge(
  input: DocGenerationInput,
  treeSummary: string,
  keyFiles: Record<string, string>
): Promise<DocGenerationResult | null> {
  try {
    const health = await fetch(`${BRIDGE_URL}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!health.ok) {
      console.error("[DocMyShi] Bridge health check falhou:", health.status);
      return null;
    }
    const healthData = await health.json();
    console.log(`[DocMyShi] Bridge v${healthData.version} — modelo: ${healthData.selectedModel?.id || "nenhum"}`);
  } catch (err) {
    console.error("[DocMyShi] Bridge não acessível:", err instanceof Error ? err.message : err);
    return null;
  }

  try {
    console.log(`[DocMyShi] Enviando para bridge... (timeout 10min, Claude Opus gera 7 docs detalhados)`);
    const startTime = Date.now();

    const res = await fetch(`${BRIDGE_URL}/api/generate-docs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repoName: input.repoName,
        repoFullName: input.repoFullName,
        description: input.description,
        language: input.language,
        treeSummary,
        keyFiles,
      }),
      signal: AbortSignal.timeout(600000), // 10 min — Claude Opus gera 7 docs detalhados
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!res.ok) {
      const err = await res.text();
      console.error(`[DocMyShi] Bridge retornou ${res.status} após ${elapsed}s:`, err);
      return null;
    }

    const result = await res.json();
    if (result.docs && result.docs.length > 0) {
      console.log(`[DocMyShi] Bridge OK em ${elapsed}s — ${result.docs.length} docs gerados`);
      return result as DocGenerationResult;
    }
    console.error(`[DocMyShi] Bridge retornou 0 docs após ${elapsed}s`);
    return null;
  } catch (err) {
    console.error("[DocMyShi] Bridge falhou:", err instanceof Error ? err.message : err);
    return null;
  }
}
