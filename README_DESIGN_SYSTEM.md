# AudioFlow Design System

Catálogo visual e guia local do design system compartilhado do AudioFlow. Este workspace usa `design-tokens/tokens.yaml` como source of truth e publica os artefatos derivados para CSS, Tailwind, JSON/DTCG e Swift.

## O que existe hoje

- Tokens compartilhados em `design-tokens/`
- Componentes React em `frontend/components/`
- Tokens Swift consumidos pelo app em `AudioFlow/Sources/DesignTokens/`
- Catálogo visual local em `.storybook/`
- Demo local em `frontend/design-system-demo.html`

## Setup local real

O repositório não usa workspaces npm. Para rodar o fluxo completo do design system, instale as dependências do root e do frontend:

```bash
npm install
npm --prefix frontend install
```

## Fluxos principais

### Rebuild de tokens e CSS compartilhado

```bash
npm run build
```

Esse comando:

1. gera os artefatos de `design-tokens/` a partir de `tokens.yaml`
2. sincroniza `AudioFlow/Sources/DesignTokens/AudioFlowColors.swift`
3. rebuilda `frontend/dist/styles.css`

### Storybook local

```bash
npm run storybook
```

O script já executa `npm run build` antes de subir o catálogo em `http://localhost:6006`.

### Build estático do catálogo

```bash
npm run storybook:build
```

O output vai para `storybook-static/`.

### Demo local do design system

```bash
npm --prefix frontend run start
```

Depois abra `http://localhost:3000/design-system-demo.html`.

## Catálogo visual atual

O Storybook documenta hoje:

- `Design System/Tokens`
- `UI/Button`
- `UI/Card`
- `UI/Primitives`

Esse catálogo serve como documentação local para adoção incremental no companion web. Nesta fase ele não depende de deploy remoto.

## Source of truth e artefatos

Edite apenas:

```text
design-tokens/tokens.yaml
```

Artefatos derivados relevantes:

- `design-tokens/tokens.css`
- `design-tokens/tokens.tailwind.js`
- `design-tokens/tokens.json`
- `design-tokens/tokens.dtcg.json`
- `design-tokens/AudioFlowColors.generated.swift`
- `AudioFlow/Sources/DesignTokens/AudioFlowColors.swift`

Arquivos `*.generated.*` continuam regeneráveis. Os artefatos canônicos versionados existem para consumo local e revisão de produto.

## Validação local

```bash
npm run lint
npm run typecheck
npm test
npm run build
swift test --package-path AudioFlow
```

## Governança

O workflow em `.github/workflows/design-system.yml` deve refletir os mesmos comandos usados localmente:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run storybook:build`

Se um comando não existir no workspace, ele não deve aparecer na documentação.

## Quando atualizar o demo HTML

Atualize `frontend/design-system-demo.html` quando:

- um token novo mudar o vocabulário visual compartilhado
- um componente principal ganhar um novo estado relevante
- o quick start do catálogo local mudar

Use o demo como smoke manual leve; use o Storybook como catálogo principal.
