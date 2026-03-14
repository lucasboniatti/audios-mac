# EPIC-003: AudioFlow Design System - Tokens Compartilhados e UI Foundations

**Status:** Draft  
**Created:** 2026-03-14  
**Owner:** @pm (Morgan)  
**Priority:** MEDIUM  
**Type:** Brownfield Enhancement  

---

## Overview

### Problem Statement
O AudioFlow ja possui app macOS funcional e companion web local, mas a base visual compartilhada ainda nao esta formalizada no backlog oficial. Isso deixa design tokens, componentes reutilizaveis, Storybook e guias de contribuicao como trabalho solto no repo, sem rastreabilidade de escopo.

### Solution
Formalizar um design system compartilhado para o AudioFlow, com `design-tokens/tokens.yaml` como source of truth, exports gerados para web e Swift, catalogo visual local via Storybook e componentes reutilizaveis para adocao incremental no frontend e no app macOS.

### Existing System Context
- App principal em Swift/AppKit continua como superficie primaria de captura e transcricao
- Companion web local permanece funcional e ja consome CSS tokenizado
- Arquitetura do design system ja esta descrita em `docs/architecture/ARCHITECTURE.md`
- O repo ja contem scripts de build, arquivos de tokens, componentes compartilhados e documentacao de Storybook ainda nao promovidos a epic oficial

---

## Business Value

| Metric | Target |
|--------|--------|
| Consistencia visual | Mesma base de tokens e branding entre web e Swift |
| Velocidade de evolucao | Novas telas e componentes com menor retrabalho visual |
| Governanca | Tokens, componentes e documentacao passam a ter backlog e criterio de aceite claros |

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Source of Truth | `design-tokens/tokens.yaml` |
| Token Build | Node.js + `scripts/build-tokens.js` |
| Web Consumption | CSS Custom Properties + Tailwind config + React components |
| Swift Consumption | Arquivos Swift em `AudioFlow/Sources/DesignTokens/` |
| Visual Catalog | Storybook 8 |
| Governance | lint, typecheck, tests e workflow `design-system.yml` |

---

## Scope

### In Scope
- Design tokens compartilhados para cores, espacamentos, tipografia, raios e sombras
- Exports gerados para CSS, JSON, Tailwind e Swift
- Componentes reutilizaveis para web e Swift
- Catalogo visual local com Storybook e demo do frontend
- Guias de uso e contribuicao do design system

### Out of Scope
- Reescrita completa do menu bar app para design system nesta fase
- Migracao total do frontend local para React
- Publicacao obrigatoria do Storybook em ambiente remoto
- Alteracao do schema CoreData por causa do design system

---

## Stories Summary

| Story ID | Title | Executor | Quality Gate | Priority | Effort | Status |
|----------|-------|----------|--------------|----------|--------|--------|
| 8.1 | Formalizar design tokens compartilhados | @dev | @qa | COULD | M | ⬜ Todo |
| 8.2 | Documentar catalogo visual e guidelines | @ux-design-expert | @pm | COULD | M | ⬜ Todo |
| 8.3 | Disponibilizar componentes compartilhados para web e Swift | @dev | @architect | COULD | M | ⬜ Todo |

**Total Stories:** 3  
**Estimated Effort:** 8-12 horas

---

## Story Breakdown

### 8.1 Formalizar design tokens compartilhados
**Goal:** Garantir que o design system tenha uma fonte unica de verdade e exports reproduziveis para as superficies atuais.

**Acceptance Criteria:**
- `tokens.yaml` permanece a fonte unica de verdade
- Build gera artefatos validos para CSS, JSON, Tailwind e Swift
- Frontend e testes continuam consumindo os artefatos sem regressao

**Quality Gates:**
- Pre-Commit (@dev): `npm run lint`, `npm run typecheck`, `npm test`
- Pre-PR (@qa): revisar consistencia entre source of truth e artefatos gerados

### 8.2 Documentar catalogo visual e guidelines
**Goal:** Disponibilizar um catalogo local e instrucoes claras para contribuicao e uso do design system.

**Acceptance Criteria:**
- Storybook local documenta tokens e componentes principais
- README do design system descreve setup, build e fluxo de contribuicao
- Demo local referencia a base visual compartilhada

**Quality Gates:**
- Pre-Commit (@ux-design-expert): coerencia visual e clareza de documentacao
- Pre-PR (@pm): escopo documental alinhado ao epic e a arquitetura existente

### 8.3 Disponibilizar componentes compartilhados para web e Swift
**Goal:** Tornar os componentes e assets compartilhados reutilizaveis sem forcar migracao total das superficies atuais.

**Acceptance Criteria:**
- Componentes React ficam prontos para uso incremental no frontend local
- Componentes Swift e tokens ficam disponiveis para novas telas ou refinamentos do app
- Assets de marca permanecem consistentes entre web e macOS

**Quality Gates:**
- Pre-Commit (@dev): `npm run lint`, `npm run typecheck`, `npm test`
- Pre-PR (@architect): verificar compatibilidade incremental sem breaking changes

---

## Compatibility Requirements

- Companion web atual nao pode regredir ao consumir tokens e assets compartilhados
- Menu bar app continua funcional mesmo se nenhuma tela Swift adotar os componentes novos imediatamente
- `tokens.yaml` e os guias associados devem permitir regeneracao dos artefatos derivados
- O design system nao pode introduzir dependencia de escrita no CoreData

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Trabalho de design system permanecer sem story formal | Alta | Medio | Formalizar epic e fase 8 antes de novos commits desse bloco |
| Artefatos gerados ficarem inconsistentes com `tokens.yaml` | Media | Medio | Tratar `tokens.yaml` como source of truth e validar build nos gates |
| Migracao visual virar rewrite acidental | Media | Alto | Limitar o epic a adocao incremental, sem reescrita total |
| Misturar tooling interno AIOX com escopo de produto | Media | Medio | Manter este epic restrito ao design system e tratar framework/tooling em trilha separada |

---

## Definition of Done

- [ ] Epic 003 aprovado e alinhado ao PRD e implementation plan
- [ ] Stories 8.1-8.3 criadas e priorizadas
- [ ] Tokens, componentes e documentacao possuem criterio de aceite explicito
- [ ] Nenhuma regressao funcional no companion web ou no menu bar app

---

## References

- `docs/prd/requirements.json`
- `docs/prd/implementation.yaml`
- `docs/architecture/ARCHITECTURE.md`
- `README_DESIGN_SYSTEM.md`
- `design-tokens/tokens.yaml`
- `scripts/build-tokens.js`
- `frontend/design-system-demo.html`

---

*Created by @pm (Morgan) for brownfield scope alignment*
