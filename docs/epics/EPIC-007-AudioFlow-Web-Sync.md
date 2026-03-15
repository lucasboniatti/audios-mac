# EPIC-007: AudioFlow Web Sync - Conta Cloud, Perfil e Sincronizacao Hibrida

**Status:** Draft  
**Created:** 2026-03-14  
**Owner:** @pm (Morgan)  
**Priority:** HIGH  
**Type:** Brownfield Enhancement  
**Readiness:** Blocked by QA concerns in architecture review  

---

## Overview

### Problem Statement
O companion web atual do AudioFlow ja cobre historico local, dashboard, favoritos, tags e preferencias, mas permanece restrito a autenticacao local simples e a dados armazenados apenas no dispositivo. O repo ja contem uma arquitetura draft para evoluir esse companion com conta cloud, perfil de usuario, filtros funcionais e sincronizacao hibrida, mas esse escopo ainda nao aparece oficialmente no PRD nem no implementation plan.

### Solution
Formalizar a trilha de produto para um companion web com conta cloud, perfil por usuario, sincronizacao hibrida entre base local e nuvem, e dashboard filtrado por periodo, preservando a operacao offline do app macOS e do companion local como primeira prioridade.

### Existing System Context
- O app macOS continua como origem operacional local de captura e transcricao
- O companion web local do EPIC-002 ja existe e permanece funcional sem cloud
- Existe arquitetura draft em `docs/architecture/audioflow-web-supabase-architecture.md`
- Existe revisao QA em `docs/qa/QA_FIX_REQUEST.md` apontando blockers de seguranca e integridade de sync
- O bloco de framework/tooling em `.aiox-core`, `.gemini`, `.codex` e afins nao entra neste epic; isso permanece fora do escopo de produto

### Renumbering Note
O documento de arquitetura draft referencia stories `7.1` a `7.5`, mas esses IDs ja foram consumidos pelo companion web local. Para manter rastreabilidade sem colisao, este epic formaliza a trilha cloud como stories `9.1` a `9.5`.

---

## Business Value

| Metric | Target |
|--------|--------|
| Account-based access | Companion web com identidade por usuario em vez de senha fixa local |
| Data continuity | Historico e organizacao pessoal recuperaveis alem do dispositivo local |
| Analytical utility | Dashboard com filtros por periodo e contexto cloud-aware |
| Product clarity | Escopo cloud formalizado no backlog, separado do web local ja entregue |

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Cloud Auth | Supabase Auth (email/senha) |
| Cloud Data | Supabase PostgreSQL + RLS |
| Profile Assets | Supabase Storage |
| Local Bridge | Node.js + Express + WebSocket |
| Local Source | CoreData/SQLite do app macOS + design DB do frontend |
| Sync Model | Hibrido local/cloud com reconciliacao explicita de conflito |

---

## Scope

### In Scope
- Autenticacao cloud por conta para o companion web
- Perfil de usuario com avatar e preferencias remotas
- Sincronizacao hibrida de transcricoes e metadados entre local e cloud
- Dashboard com filtros por periodo no modo cloud
- Tags e favoritos isolados por usuario no modo cloud
- Fallback local/offline quando a nuvem estiver indisponivel

### Out of Scope
- Substituir o modo local ja entregue pelo EPIC-002
- Reescrever o app macOS para depender da nuvem
- Service role em runtime de requisicoes de usuario
- Last-write-wins silencioso como estrategia final de conflito
- OAuth/Apple ID nesta fase
- Misturar melhorias do framework AIOX com backlog de produto do AudioFlow

---

## QA Preconditions

Este epic nao deve seguir para implementacao sem tratar os blockers ja registrados em `docs/qa/QA_FIX_REQUEST.md`:

1. Remover qualquer dependencia de `SUPABASE_SERVICE_ROLE_KEY` em fluxo de usuario e operar com `anon key + JWT + RLS`.
2. Garantir que busca e queries usem filtros seguros/prepared semantics, sem risco de SQL injection.
3. Definir reconciliacao de conflito sem perda silenciosa de dados; `last write wins` puro nao atende ao nivel de confiabilidade esperado.

---

## Stories Summary

| Story ID | Title | Executor | Quality Gate | Priority | Effort | Status |
|----------|-------|----------|--------------|----------|--------|--------|
| 9.1 | Integrar autenticacao cloud por conta no companion web | @dev | @qa | COULD | M | ⬜ Todo |
| 9.2 | Adicionar perfil cloud com avatar e preferencias remotas | @dev | @qa | COULD | M | ⬜ Todo |
| 9.3 | Sincronizar transcricoes com reconciliacao segura de conflito | @dev | @architect | COULD | L | ⬜ Todo |
| 9.4 | Implementar dashboard cloud com filtros por periodo | @dev | @qa | COULD | M | ⬜ Todo |
| 9.5 | Sincronizar tags e favoritos no modo cloud | @dev | @qa | COULD | M | ⬜ Todo |

**Total Stories:** 5  
**Estimated Effort:** 16-24 horas

---

## Story Breakdown

### 9.1 Integrar autenticacao cloud por conta no companion web
**Goal:** Evoluir de senha fixa local para sessao por usuario autenticado, mantendo o fallback local do companion.

**Acceptance Criteria:**
- Signup/login por email e senha funcionam no modo cloud
- API valida sessao por usuario com JWT
- Requisicoes de usuario nao usam service role em runtime

**Quality Gates:**
- Pre-Commit (@dev): `npm run lint`, `npm run typecheck`, `npm test`
- Pre-PR (@qa): revisar seguranca de auth, RLS e separacao entre modo local e cloud

### 9.2 Adicionar perfil cloud com avatar e preferencias remotas
**Goal:** Permitir que cada usuario mantenha perfil, avatar e preferencias remotas sem quebrar a configuracao local existente.

**Acceptance Criteria:**
- Perfil pode ser lido e atualizado por usuario
- Avatar usa storage seguro por usuario
- Preferencias remotas coexistem com fallback local

**Quality Gates:**
- Pre-Commit (@dev): regressao do companion local e validacao de contrato de perfil
- Pre-PR (@qa): revisar upload, isolamento por usuario e compatibilidade com preferencias locais

### 9.3 Sincronizar transcricoes com reconciliacao segura de conflito
**Goal:** Levar historico e metadados para a nuvem sem perda silenciosa de dados e sem comprometer o modo offline do app.

**Acceptance Criteria:**
- Sync nao modifica o CoreData do app fora das regras existentes
- Conflitos sao detectados e reconciliados explicitamente
- Falhas de sync nao impedem uso local do produto

**Quality Gates:**
- Pre-Commit (@dev): testes de fallback offline e regressao do bridge local
- Pre-PR (@architect): validar estrategia de conflito, integridade de dados e compatibilidade brownfield

### 9.4 Implementar dashboard cloud com filtros por periodo
**Goal:** Tornar o dashboard filtravel e util no modo cloud, sem abandonar a experiencia local.

**Acceptance Criteria:**
- Filtros por periodo funcionam no dashboard cloud
- Listagem e estatisticas respeitam escopo do usuario autenticado
- Quando a nuvem nao responde, o dashboard degrada para leitura local controlada

**Quality Gates:**
- Pre-Commit (@dev): regressao de filtros, listagens e metricas
- Pre-PR (@qa): revisar consistencia entre modo cloud e fallback local

### 9.5 Sincronizar tags e favoritos no modo cloud
**Goal:** Levar organizacao pessoal para o modo cloud sem perder o modelo local existente.

**Acceptance Criteria:**
- Tags e favoritos ficam isolados por usuario autenticado
- Dados locais podem ser reconciliados com a nuvem
- Modo local continua funcional na ausencia de cloud

**Quality Gates:**
- Pre-Commit (@dev): regressao das telas de favoritos e tags
- Pre-PR (@qa): revisar isolamento por usuario e integridade de reconciliacao

---

## Compatibility Requirements

- O app macOS continua operacional offline e nao passa a depender da nuvem
- O companion local ja entregue continua funcional sem autenticacao cloud
- CoreData continua protegido contra escrita indevida pelo frontend
- Cloud mode precisa coexistir com a base local, nao substitui-la abruptamente

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Introduzir vulnerabilidade com service role ou RLS mal aplicada | Alta | Alto | Tratar QA must-fix como precondicao do epic |
| Perda silenciosa de dados por conflito mal resolvido | Alta | Alto | Exigir reconciliacao explicita e bloquear `last write wins` puro |
| Sync cloud regredir o modo local ja entregue | Media | Alto | Manter fallback local como requisito de compatibilidade |
| Misturar framework/tooling AIOX com backlog de produto | Media | Medio | Restringir o epic ao companion cloud do AudioFlow |

---

## Definition of Done

- [ ] EPIC-007 aprovado e alinhado ao PRD e implementation plan
- [ ] Must-fix de QA tratados na arquitetura antes do inicio de desenvolvimento
- [ ] Stories 9.1-9.5 criadas e priorizadas
- [ ] Fallback local e integridade do app macOS preservados

---

## References

- `docs/prd/requirements.json`
- `docs/prd/implementation.yaml`
- `docs/architecture/audioflow-web-supabase-architecture.md`
- `docs/qa/QA_FIX_REQUEST.md`
- `docs/epics/EPIC-002-AudioFlow-Web-Companion.md`

---

*Created by @pm (Morgan) for future-scope alignment based on existing architecture and QA artifacts*
