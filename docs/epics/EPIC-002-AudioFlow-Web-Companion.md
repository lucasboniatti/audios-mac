# EPIC-002: AudioFlow Web Companion - Dashboard Local e Organizacao Pessoal

**Status:** Draft  
**Created:** 2026-03-14  
**Owner:** @pm (Morgan)  
**Priority:** HIGH  
**Type:** Brownfield Enhancement  

---

## Overview

### Problem Statement
O AudioFlow ja resolve a captura e transcricao rapida no macOS, mas o menu bar nao oferece contexto suficiente para revisar volume de uso, buscar em escala e organizar o historico com metadados pessoais.

### Solution
Adicionar um companion web local, autenticado e conectado ao SQLite do app, para disponibilizar historico, dashboard, favoritos, tags, preferencias e exportacoes estruturadas sem alterar o schema do CoreData.

### Existing System Context
- App principal em Swift/AppKit com CoreData armazenando transcricoes em `AudioFlow.sqlite`
- Frontend local em Node.js/Express com `better-sqlite3`, WebSocket e paginas HTML estaticas
- Metadados mutaveis do frontend armazenados em `audioflow_design.db`, separado do banco do app

---

## Business Value

| Metric | Target |
|--------|--------|
| Discoverability of past transcriptions | Busca e navegacao mais eficientes que o menu bar |
| Personal organization | Favoritos, tags e preferencias persistidas localmente |
| Product coherence | Escopo web formalizado e alinhado com codigo existente |

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Web Server | Node.js + Express 5 |
| Local Data Access | better-sqlite3 |
| Realtime | ws (WebSocket) |
| UI | HTML + JS + CSS tokenizado |
| Mutable Metadata | SQLite local (`audioflow_design.db`) |
| Source Data | CoreData SQLite (`AudioFlow.sqlite`) em read-only |

---

## Scope

### In Scope
- Frontend web local acessivel via navegador
- Autenticacao local por sessao para rotas protegidas
- Paginas de gravacoes, dashboard e favoritos
- Busca, metricas e exportacoes CSV/JSON no frontend
- Favoritos, tags e preferencias persistidos em banco separado
- Sincronizacao em tempo real via WebSocket

### Out of Scope
- Escrita direta no CoreData pelo frontend
- Cloud sync ou multiusuario
- OAuth, Apple ID ou autenticacao remota
- Edicao do texto transcrito no frontend
- Compartilhamento externo automatizado

---

## Stories Summary

| Story ID | Title | Executor | Quality Gate | Priority | Effort | Status |
|----------|-------|----------|--------------|----------|--------|--------|
| 7.1 | Companion web local autenticado | @dev | @architect | SHOULD | M | ⬜ Todo |
| 7.2 | Historico e dashboard web | @ux-design-expert | @dev | SHOULD | M | ⬜ Todo |
| 7.3 | Organizacao pessoal no frontend web | @dev | @architect | COULD | M | ⬜ Todo |

**Total Stories:** 3  
**Estimated Effort:** 8-12 horas

---

## Story Breakdown

### 7.1 Companion web local autenticado
**Goal:** Garantir acesso local protegido e sincronizacao em tempo real sem interferir no app macOS.

**Acceptance Criteria:**
- Login local emite sessao valida para paginas protegidas
- API retorna `401` sem token valido
- Novas transcricoes aparecem no frontend sem reload manual

**Quality Gates:**
- Pre-Commit (@dev): seguranca basica, tratamento de sessao, regressao de rotas
- Pre-PR (@github-devops): compatibilidade local e configuracao de ambiente

### 7.2 Historico e dashboard web
**Goal:** Expor historico navegavel, busca e metricas no navegador a partir do banco local do app.

**Acceptance Criteria:**
- Lista de transcricoes e busca textual funcionam em tempo real
- Dashboard exibe metricas derivadas do historico local
- Exportacoes CSV e JSON geram arquivos validos

**Quality Gates:**
- Pre-Commit (@dev): validacao de contratos da API e regressao de busca/exportacao
- Pre-PR (@github-devops): compatibilidade de build CSS e assets do frontend

### 7.3 Organizacao pessoal no frontend web
**Goal:** Permitir curadoria do historico sem violar a regra de CoreData read-only.

**Acceptance Criteria:**
- Favoritos sao persistidos em banco local separado
- Tags podem ser criadas, listadas e associadas a transcricoes
- Preferencias de tema e interface persistem entre sessoes

**Quality Gates:**
- Pre-Commit (@dev): validacao de integridade entre CoreData e design DB
- Pre-PR (@github-devops): regressao das paginas `favorites` e `dashboard`

---

## Compatibility Requirements

- `AudioFlow.sqlite` permanece read-only para o frontend
- Metadados web gravaveis ficam apenas em `audioflow_design.db`
- Fluxo principal hotkey -> transcricao -> clipboard nao pode regredir
- UI do menu bar continua funcional independentemente do frontend

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Divergencia entre PRD original e escopo web atual | Alta | Alto | Formalizar o epic e stories antes de continuar implementacao |
| Regressao ao acessar CoreData fora do app Swift | Media | Alto | Manter acesso read-only e sem alteracao de schema |
| Dados inconsistentes entre historico e metadados web | Media | Medio | Separar bancos e validar existencia de `transcription_id` |
| Seguranca fraca por senha local fixa | Alta | Medio | Tratar como autenticacao inicial local e manter fora do escopo atual qualquer auth remota |

---

## Definition of Done

- [ ] Stories 7.1-7.3 criadas e aprovadas
- [ ] Escopo web rastreado no PRD e no plano de implementacao
- [ ] CoreData permanece protegido contra escrita direta
- [ ] Frontend web validado sem regressao no app macOS

---

## References

- `docs/prd/requirements.json`
- `docs/prd/implementation.yaml`
- `docs/architecture/ARCHITECTURE.md`
- `frontend/server.js`
- `frontend/index.html`
- `frontend/dashboard.html`
- `frontend/favorites.html`

---

*Created by @pm (Morgan) for brownfield scope alignment*
