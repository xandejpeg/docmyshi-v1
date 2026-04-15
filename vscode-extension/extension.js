const vscode = require("vscode");
const http = require("http");

const PORT = 3002;
let server = null;
let outputChannel = null;

function activate(context) {
  outputChannel = vscode.window.createOutputChannel("DocMyShi Bridge");
  log("Extension activated");

  // Auto-start bridge
  startServer();

  context.subscriptions.push(
    vscode.commands.registerCommand("docmyshi.startBridge", startServer),
    vscode.commands.registerCommand("docmyshi.stopBridge", stopServer),
    { dispose: stopServer }
  );
}

function deactivate() {
  stopServer();
}

function log(msg) {
  const ts = new Date().toLocaleTimeString();
  outputChannel?.appendLine(`[${ts}] ${msg}`);
}

// ── HTTP Server ──

function startServer() {
  if (server) {
    vscode.window.showInformationMessage(`DocMyShi Bridge already running on port ${PORT}`);
    return;
  }

  server = http.createServer(handleRequest);

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      vscode.window.showWarningMessage(`Port ${PORT} is in use. Stop the other process or change the port.`);
    } else {
      vscode.window.showErrorMessage(`Bridge error: ${err.message}`);
    }
    server = null;
  });

  server.listen(PORT, "127.0.0.1", () => {
    log(`Bridge server listening on http://127.0.0.1:${PORT}`);
    vscode.window.showInformationMessage(`DocMyShi Bridge running on port ${PORT}`);
  });
}

function stopServer() {
  if (server) {
    server.close();
    server = null;
    log("Bridge server stopped");
  }
}

async function handleRequest(req, res) {
  // CORS — allow Next.js on :3000
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/api/health") {
    const models = await getAvailableModels();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      engine: "vscode-copilot",
      version: "0.3.0-ptbr-7docs",
      models: models.map((m) => m.id),
    }));
    return;
  }

  if (req.method === "POST" && req.url === "/api/generate-docs") {
    try {
      const body = await readBody(req);
      const input = JSON.parse(body);
      log(`Generating docs for: ${input.repoName}`);

      const result = await generateWithCopilot(input);
      log(`Generated ${result.docs.length} docs, ${result.links.length} links`);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      log(`ERROR: ${err.message}`);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

// ── Copilot LM Integration ──

async function getAvailableModels() {
  try {
    // Try GPT-4o family first (best for code analysis)
    let models = await vscode.lm.selectChatModels({ family: "gpt-4o" });
    if (models.length) return models;

    // Try Claude family
    models = await vscode.lm.selectChatModels({ family: "claude-3.5-sonnet" });
    if (models.length) return models;

    // Any available model
    return await vscode.lm.selectChatModels();
  } catch {
    return [];
  }
}

async function generateWithCopilot(input) {
  const models = await getAvailableModels();
  if (!models.length) {
    throw new Error("Nenhum modelo Copilot disponível. Verifique se o GitHub Copilot está instalado e logado.");
  }

  const model = models[0];
  log(`Usando modelo: ${model.id} (max input: ${model.maxInputTokens})`);

  const docTypes = [
    {
      slug: "overview",
      type: "overview",
      title: "Visão Geral do Projeto",
      focus: `Escreva um documento "Visão Geral" completo. Inclua:
- Propósito e objetivo do software
- Contexto de negócio: que problema resolve, para quem serve
- Stack tecnológica completa (linguagens, frameworks, libs) com evidências dos arquivos
- Descrição funcional: o que o sistema FAZ na prática
- Como as partes se conectam em alto nível
- Referências cruzadas: mencione [[architecture]] para detalhes de arquitetura, [[modules]] para módulos, [[how-to-run]] para rodar o projeto`,
    },
    {
      slug: "architecture",
      type: "architecture",
      title: "Arquitetura e Design",
      focus: `Escreva um documento "Arquitetura e Design". Inclua:
- Padrão arquitetural (MVC, App Router, microserviços, monolito, etc.)
- Camadas do sistema e responsabilidades de cada uma
- Fluxo de dados principal: de onde entra, como transforma, onde sai
- Decisões de design observadas no código (ex: uso de adapters, middlewares)
- Dependências externas importantes (APIs, bancos, serviços)
- Diagrama textual do fluxo se possível (usando blocos de código)
- Referências: [[overview]] para contexto, [[modules]] para detalhes dos módulos, [[flows]] para fluxos`,
    },
    {
      slug: "modules",
      type: "modules",
      title: "Módulos e Componentes",
      focus: `Escreva um documento "Módulos e Componentes". Inclua:
- Cada módulo/componente principal do sistema
- Para cada um: responsabilidade, o que exporta, do que depende
- Agrupe por camada/pasta (ex: componentes UI, libs, rotas API, etc.)
- Cite os arquivos que compõem cada módulo
- Explique funções/serviços IMPORTANTES (não triviais)
- Pontos de entrada do sistema
- Referências: [[architecture]] para visão macro, [[file-map]] para mapa completo, [[flows]] para fluxos`,
    },
    {
      slug: "flows",
      type: "flows",
      title: "Fluxos do Sistema",
      focus: `Escreva um documento "Fluxos do Sistema". Inclua:
- Fluxos principais de uso (ex: login, cadastro, geração de dados, etc.)
- Para cada fluxo: passo a passo de quais arquivos/funções são chamados
- Fluxo de autenticação se existir
- Fluxo de dados principal (input → processamento → output)
- Integrações externas e como são acionadas
- Use notação de sequência textual se útil
- Referências: [[modules]] para detalhes, [[architecture]] para contexto, [[risks]] para problemas`,
    },
    {
      slug: "file-map",
      type: "file-map",
      title: "Mapa de Arquivos e Pastas",
      focus: `Escreva um documento "Mapa de Arquivos e Pastas". Inclua:
- Árvore completa de diretórios em bloco de código
- Papel de cada pasta principal
- Para os arquivos-chave: tipo (config/componente/lib/rota), responsabilidade, o que exporta
- Organize por pasta/módulo, não como lista sequencial
- Identifique arquivos que parecem improvisados ou fora de lugar
- Referências: [[modules]] para detalhes funcionais, [[architecture]] para estrutura geral`,
    },
    {
      slug: "risks",
      type: "tech-debt",
      title: "Riscos e Dívida Técnica",
      focus: `Escreva um documento "Riscos e Dívida Técnica". Inclua:
- Problemas de segurança REAIS que você vê (tokens expostos, falta de validação)
- Código que parece improvisado ou gambiarra
- Dependências problemáticas ou desatualizadas
- Falta de testes e cobertura
- Hardcoded values, TODOs no código
- O que poderia ser melhorado com prioridade
- O que pode ser reaproveitado de bom
- SÓ cite problemas que você REALMENTE vê no código. Não invente.
- Referências: [[architecture]] para contexto, [[modules]] para onde estão os problemas`,
    },
    {
      slug: "how-to-run",
      type: "how-to-run",
      title: "Como Rodar e Evoluir",
      focus: `Escreva um documento "Como Rodar e Evoluir". Inclua:
- Pré-requisitos (Node.js, Python, etc.)
- Passo a passo de instalação
- Variáveis de ambiente necessárias
- Comandos disponíveis (dev, build, test)
- Como acessar a aplicação
- Sugestões de próximos passos para evolução
- O que seria necessário para colocar em produção
- Referências: [[overview]] para contexto, [[architecture]] para entender a estrutura`,
    },
  ];

  const context = buildContext(input);
  const docs = [];
  const links = [];

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `DocMyShi: Gerando docs para ${input.repoName}`,
      cancellable: true,
    },
    async (progress, cancelToken) => {
      for (let i = 0; i < docTypes.length; i++) {
        if (cancelToken.isCancellationRequested) break;

        const dt = docTypes[i];
        progress.report({
          message: `(${i + 1}/${docTypes.length}) ${dt.title}...`,
          increment: 100 / docTypes.length,
        });

        log(`Gerando: ${dt.title}`);

        try {
          const content = await generateOneDoc(model, context, dt, cancelToken);

          // Extrair links [[slug]]
          const refs = [...content.matchAll(/\[\[([a-z0-9-]+)\]\]/g)];
          for (const ref of refs) {
            links.push({ fromSlug: dt.slug, toSlug: ref[1], type: "relates-to" });
          }

          // Confiança baseada em referências a arquivos
          const fileRefs = [...content.matchAll(/`([^`\s]+\.[a-z]{1,5})`/g)].map(m => m[1]);
          const confidence = fileRefs.length > 5 ? "high" : fileRefs.length > 0 ? "medium" : "low";

          docs.push({
            slug: dt.slug,
            type: dt.type,
            title: dt.title,
            content,
            confidence,
            classification: confidence === "high" ? "observed" : "inferred",
            evidence: [...new Set(fileRefs)].slice(0, 15),
          });
        } catch (err) {
          log(`Falha ao gerar ${dt.title}: ${err.message}`);
          docs.push({
            slug: dt.slug,
            type: dt.type,
            title: dt.title,
            content: `# ${dt.title}\n\nFalha ao gerar este documento: ${err.message}\n\nTente regenerar.`,
            confidence: "low",
            classification: "uncertain",
            evidence: [],
          });
        }
      }
    }
  );

  return { docs, links };
}

function buildContext(input) {
  const fileEntries = Object.entries(input.keyFiles || {});

  const keyFilesText = fileEntries
    .map(([path, content]) => {
      const truncated =
        content.length > 5000
          ? content.slice(0, 5000) + "\n... (truncado)"
          : content;
      return `### ${path}\n\`\`\`\n${truncated}\n\`\`\``;
    })
    .join("\n\n");

  return `## Repositório: ${input.repoName}
**Nome completo**: ${input.repoFullName}
**Descrição**: ${input.description || "Sem descrição"}
**Linguagem**: ${input.language || "Desconhecida"}

## Árvore de Arquivos
${input.treeSummary}

## Conteúdo dos Arquivos-Chave
${keyFilesText}`;
}

async function generateOneDoc(model, context, docType, cancelToken) {
  const prompt = `Você é um arquiteto de software sênior criando documentação técnica com base em análise real de código.
Escreva SEMPRE em português do Brasil (pt-BR).

${context}

## Sua Tarefa
Escreva o documento **"${docType.title}"**.

${docType.focus}

## Regras Obrigatórias
- Escreva em Markdown com cabeçalhos (##, ###), listas, blocos de código e tabelas
- Seja ESPECÍFICO — cite nomes de arquivos, funções, variáveis e configs que você VÊ no código
- Use frases como "Conforme visto em \`package.json\`..." ou "No arquivo \`src/lib/auth.ts\`..."
- Diferencie o que você OBSERVA (direto no código) do que INFERE (dedução lógica)
- Quando incerto, diga "evidência insuficiente" — não invente
- Referência cruzada: use [[slug]] para linkar outros docs (ex: "Veja [[architecture]] para mais detalhes")
- Slugs disponíveis: [[overview]], [[architecture]], [[modules]], [[flows]], [[file-map]], [[risks]], [[how-to-run]]
- Escreva entre 80-250 linhas de Markdown
- Seja honesto, prático e útil. O objetivo é reconstruir entendimento do sistema.

Comece direto com o primeiro heading # do documento.`;

  const messages = [vscode.LanguageModelChatMessage.User(prompt)];

  const cts = new vscode.CancellationTokenSource();
  if (cancelToken.isCancellationRequested) {
    throw new Error("Cancelado pelo usuário");
  }

  const response = await model.sendRequest(messages, {}, cts.token);

  let content = "";
  for await (const chunk of response.text) {
    content += chunk;
    if (cancelToken.isCancellationRequested) {
      cts.cancel();
      break;
    }
  }

  return content.trim();
}

module.exports = { activate, deactivate };
