# DocMyShi-v1 — Handoff Completo

## O que é o projeto
Plataforma que conecta ao GitHub do usuário, analisa repositórios com IA (Claude) e transforma em documentação técnica navegável em Markdown, com interface 3D futurista (esferas flutuantes, grafos de força). O objetivo é recuperar contexto perdido de projetos antigos sem precisar reler todo o código.

---

## Fase 0 — Planejamento & Entendimento
- Análise profunda do prompt original (problema, proposta de valor, riscos)
- Mapeamento de 3 camadas: Core (auth, GitHub API, doc engine), Suporte (DB, state), Experiência (3D, markdown)
- 7 riscos identificados (rate limit GitHub, custo LLM, performance 3D, etc.)
- 10 critérios de gate para começar implementação
- Pesquisa de mercado (Swimm, CodeSee, Sourcegraph)

## Fase 1 — Pesquisa & Exploração
- Resolveu IDs no Context7 para React Three Fiber e Three.js
- Pesquisou GitHub API limits, react-force-graph-3d, NextAuth v5 + GitHub OAuth
- Pesquisou abordagens LLM para análise de código (DocAgent paper, AST + LLM híbrido)
- Identificou user GitHub: `xandejpeg` (22 repos públicos)
- Proposta de stack final + plano de 6 fases de implementação

## Fase 2 — Implementação Completa (Sprint)

### Setup do Projeto
- `create-next-app` com Next.js 16.2.3 (App Router, Turbopack, TypeScript)
- Contornou restrição de naming do npm (letras maiúsculas) criando em pasta temp + xcopy

### Dependências Instaladas
**Produção:**
- `next-auth@beta` + `@auth/prisma-adapter` — Auth GitHub OAuth
- `@prisma/client` + `@prisma/adapter-libsql` + `@libsql/client` — ORM + SQLite
- `@react-three/fiber` + `@react-three/drei` + `three` — 3D rendering
- `react-force-graph-3d` — Grafo de força 3D
- `react-markdown` + `remark-gfm` + `rehype-highlight` + `rehype-slug` — Markdown rendering
- `zustand` — State management
- `lucide-react` + `clsx` + `tailwind-merge` + `class-variance-authority` — UI utils

**Dev:**
- `prisma` + `@types/three`

### Banco de Dados (Prisma 7.7.0 + SQLite)
**Schema completo** com 8 models:
- `User`, `Account`, `Session`, `VerificationToken` (NextAuth)
- `Repository` (githubId unique, name, fullName, description, language, stars, forks, size, defaultBranch, pushedAt, htmlUrl, isSelected)
- `DocNode` (slug, type, title, content, repoId; unique em [repoId, slug])
- `DocLink` (fromNodeId, toNodeId, type, label)
- `DocJob` (status: pending/running/completed/failed, error, repoId, userId)

DB pushed e client gerado em `src/generated/prisma`.

### Arquivos Core (src/lib/)

| Arquivo | O que faz |
|---------|-----------|
| `prisma.ts` | Singleton PrismaClient com adapter LibSQL para SQLite |
| `auth.ts` | NextAuth v5 config — GitHub provider (scope: read:user user:email repo), PrismaAdapter, session callback com id + accessToken |
| `github.ts` | Layer completa GitHub API — `fetchGitHubRepos()` (paginado 100/page), `fetchRepoTree()` (recursive), `fetchFileContent()`, `getKeyFiles()` (prioriza README, package.json, entry points; cap 25 files), `buildTreeSummary()` |
| `doc-engine.ts` | Engine de doc com Claude — `generateDocs()`, `buildPrompt()`, `parseLLMResponse()` (formato DOC_START/DOC_END), `generatePlaceholderDocs()` (fallback). Gera 6 tipos: overview, architecture, modules, file-map, how-to-run, tech-debt. Extrai links `[[slug]]` como DocLinks |
| `store.ts` | Zustand — repos[], selectedRepoId, docNodes[], docLinks[], activeDocSlug, view (repos/docs/doc-detail), isGenerating |
| `utils.ts` | `cn()` = clsx + tailwind-merge |

### Type Augmentation
- `src/types/next-auth.d.ts` — Adiciona `id` a `session.user` e `accessToken` a `Session`

### API Routes

| Rota | Métodos | O que faz |
|------|---------|-----------|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handlers |
| `/api/repos` | GET, POST | GET: carrega repos do DB. POST: sync do GitHub API + upsert no DB |
| `/api/repos/[repoId]/docs` | GET, POST | GET: carrega docs do DB. POST: gera docs via doc-engine, limpa antigos, salva nodes + links, tracked por DocJob |

### Páginas

| Rota | Tipo | O que faz |
|------|------|-----------|
| `/` | Server Component | Landing page — auto-redirect se autenticado. Hero com orbs, features (Connect GitHub, AI Analysis, Navigate 3D), grid doc types, footer xandejpeg |
| `/login` | Server Component | Sign-in GitHub OAuth via server action |
| `/dashboard` | Server Component | Verifica auth, redireciona /login se não autenticado, renderiza DashboardClient |

### Componentes

| Componente | O que faz |
|------------|-----------|
| `dashboard-client.tsx` | Orquestrador principal — 3 views (repos→docs→doc-detail), gerencia sync GitHub, geração docs, loading/error states |
| `navbar.tsx` | Navegação top — botão back context-aware, logo DocMyShi, breadcrumb repo, avatar/nome, sign out |
| `repo-list.tsx` | Cards horizontais scrolláveis — language dot colorido, nome, language, stars, size. LANG_COLORS para 16 linguagens |
| `repo-scene.tsx` | **Cena 3D completa** com React Three Fiber — Canvas, dual point lights (indigo), Stars (2500 partículas), GridFloor, OrbitControls (auto-rotate 0.3), RepoSphere em espiral golden-angle. Cada esfera: tamanho por log(size), cor por language, Float animation, glow ring, hover scale 1.3x, label text on hover |
| `doc-graph-view.tsx` | Visualização com react-force-graph-3d (dynamic import, SSR disabled). Nodes coloridos por doc type (6 cores), links entre docs, click navega. Legend bar, botão regenerate, loading overlay |
| `doc-detail-view.tsx` | Leitor Markdown — sidebar com lista docs, renderiza conteúdo com ReactMarkdown + remark-gfm, links `[[slug]]` viram navegação interna, seção "Related Documents" no footer, badges de tipo com ícones |

### Estilização (globals.css)
Tema dark futurista completo:
- CSS vars: --background: #050510, --accent: #6366f1, etc.
- Efeitos glow (.glow-text, .glow-box, .glow-border)
- Grid background animado
- Estilos .markdown-body completos
- Animações float e pulse-glow

### Middleware
- `src/middleware.ts` — Protege `/dashboard/*` e `/api/repos/*` (nota: Next.js 16 deprecou middleware em favor de "proxy", funciona com warning)

### .gitignore
Atualizado com: `.env*`, `/src/generated/prisma`, `prisma/dev.db`, `prisma/dev.db-journal`

### .env (placeholders)
```
DATABASE_URL="file:./dev.db"
AUTH_SECRET=<gerar>
AUTH_GITHUB_ID=<GitHub OAuth App>
AUTH_GITHUB_SECRET=<GitHub OAuth App>
ANTHROPIC_API_KEY=<Claude API key>
```

---

## Bugs Encontrados e Corrigidos
1. **npm naming** — `create-next-app` rejeitou "DocMyShi-v1". Fix: pasta temp → xcopy
2. **useState duplicado** — doc-graph-view.tsx tinha função useState custom que sombreava React. Fix: removido, adicionado ao import
3. **Prisma v7 import path** — `@/generated/prisma` → `@/generated/prisma/client`
4. **Prisma v7 constructor** — v7 exige adapter, não aceita `new PrismaClient()` vazio. Fix: instalou @prisma/adapter-libsql, passou adapter
5. **PrismaLibSql casing** — É `PrismaLibSql` (não PrismaLibSQL)
6. **auth.ts type cast** — Session cast precisa de double cast: `session as unknown as Record<string, unknown>`
7. **ForceGraph3D types** — Callbacks de node precisam tipo `any` (strict TS não aceita tipos parciais)

---

## Estado Final
- ✅ Build passa limpo (`npm run build`)
- ✅ TypeScript sem erros
- ✅ Dev server funciona (`npm run dev` → localhost:3000)
- ✅ Landing page renderiza corretamente
- ✅ 7 rotas: `/`, `/_not-found`, `/api/auth/[...nextauth]`, `/api/repos`, `/api/repos/[repoId]/docs`, `/dashboard`, `/login`

## Para funcionar de verdade falta:
1. Criar GitHub OAuth App e preencher AUTH_GITHUB_ID + AUTH_GITHUB_SECRET no .env
2. Gerar AUTH_SECRET (`npx auth secret`)
3. Colocar ANTHROPIC_API_KEY no .env (ou usar placeholder docs sem Claude)
4. Testar fluxo completo: login → sync repos → selecionar repo → gerar docs → navegar 3D → ler docs
