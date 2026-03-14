# Contributing to AudioFlow Design System

## Setup

Este repo não usa workspaces npm. Instale dependências do root e do frontend antes de mexer no catálogo visual:

```bash
npm install
npm --prefix frontend install
```

## Regras de origem

1. Edite tokens apenas em `design-tokens/tokens.yaml`
2. Rebuild os artefatos com `npm run build`
3. Não trate arquivos `*.generated.*` como fonte manual
4. Quando o app macOS consumir um artefato Swift compartilhado, mantenha o arquivo compilado sincronizado com o output gerado

## Fluxo esperado para mudanças no design system

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Se a mudança afetar o catálogo visual, rode também:

```bash
npm run storybook:build
```

## Catálogo e demo

- Storybook local: `npm run storybook`
- Build estático do catálogo: `npm run storybook:build`
- Demo local HTML: `npm --prefix frontend run start` e abra `http://localhost:3000/design-system-demo.html`

Atualize `.storybook/stories/` quando um componente compartilhado ganhar um estado ou variação relevante.

Atualize `frontend/design-system-demo.html` quando a mudança precisar de um smoke visual simples fora do Storybook.

## Checklist para PR

- [ ] `tokens.yaml` continua como source of truth quando houver mudança de tokens
- [ ] README e docs não citam comandos inexistentes
- [ ] Storybook continua buildando localmente
- [ ] Demo HTML continua coerente com o vocabulário visual atual
- [ ] `npm run lint` passou
- [ ] `npm run typecheck` passou
- [ ] `npm test` passou
- [ ] `npm run build` passou

## Governança

Quando ajustar tooling, alinhe também:

- `README_DESIGN_SYSTEM.md`
- `.github/workflows/design-system.yml`
- `docs/stories/8.2.story.md` se a story estiver em progresso
