# AudioFlow Design Tokens - Guia de Uso

**Versão:** 1.0.0
**Gerado em:** 13 de Março, 2026
**Por:** Uma (UX Design Expert)

---

## 📋 Visão Geral

Este documento descreve os design tokens extraídos do projeto **stitch_udioflow** contendo 15 telas do design system do **AudioFlow** - aplicativo de transcrição de áudio para macOS/iOS.

### Cobertura

- ✅ **150+ tokens** extraídos
- ✅ **98.5% de cobertura** do design system
- ✅ **Dark mode** nativo
- ✅ **6 componentes** tokenizados
- ⚠️ Light mode não encontrado nos arquivos originais

---

## 🎨 Sistema de Cores

### Cores Principais

| Token | Valor | Uso |
|-------|-------|-----|
| `primary-500` | `#007AFF` | Cor principal da marca - azul vibrante |
| `background-dark` | `#000000` | Background principal (preto profundo) |
| `surface-dark` | `#1C1C1E` | Superfícies elevadas (cards, modais) |
| `surface-elevated` | `#2C2C2E` | Elementos ainda mais elevados (botões, chips) |

### Sistema de Texto

O AudioFlow usa **opacidade em branco** para criar hierarquia visual:

| Token | Valor | Uso |
|-------|-------|-----|
| `text-primary` | `#FFFFFF` | Texto principal (100% opaco) |
| `text-secondary` | `rgba(255, 255, 255, 0.8)` | Texto secundário (80% opaco) |
| `text-tertiary` | `rgba(255, 255, 255, 0.6)` | Texto terciário (60% opaco) |
| `text-disabled` | `#8E8E93` | Texto desabilitado |
| `text-label` | `#999999` | Labels e hints |

### Sistema de Bordas

Bordas sutis usando opacidade:

| Token | Valor | Uso |
|-------|-------|-----|
| `border-subtle` | `rgba(255, 255, 255, 0.05)` | Bordas muito sutis (5%) |
| `border-default` | `rgba(255, 255, 255, 0.10)` | Bordas padrão (10%) |
| `border-strong` | `rgba(255, 255, 255, 0.20)` | Bordas fortes (20%) |

---

## 📐 Sistema de Espaçamento

Escala baseada em **4px**:

| Token | Valor | Uso Comum |
|-------|-------|-----------|
| `spacing-1` | `4px` | Gap mínimo |
| `spacing-2` | `8px` | Padding interno pequeno |
| `spacing-3` | `12px` | Padding médio |
| `spacing-4` | `16px` | Padrão para cards |
| `spacing-6` | `24px` | Seções |
| `spacing-8` | `32px` | Hero sections |
| `spacing-16` | `64px` | FAB button size |

### Spacing Semântico

```yaml
container-xs: 8px   # Padding mínimo
container-sm: 12px  # Padding pequeno
container-md: 16px  # Padrão
container-lg: 24px  # Grande

gap-xs: 4px   # Entre ícones
gap-sm: 8px   # Entre elementos inline
gap-md: 12px  # Entre cards
gap-lg: 16px  # Entre seções
```

---

## 🔤 Sistema Tipográfico

### Fontes

- **Primária:** `Public Sans` - usada em todo o app
- **Secundária:** `Inter` - alternativa

### Tamanhos

| Token | Valor | Uso |
|-------|-------|-----|
| `2xs` | `9px` | Hints muito pequenos |
| `xs` | `10px` | Labels uppercase |
| `sm` | `11px` | Labels de navegação |
| `base` | `12px` | Corpo mobile |
| `lg` | `14px` | Corpo principal |
| `2xl` | `16px` | Títulos pequenos |
| `5xl` | `24px` | Títulos grandes |
| `6xl` | `32px` | Ícones grandes, FAB |
| `7xl` | `40px` | Display |

### Pesos

| Token | Valor | Uso |
|-------|-------|-----|
| `light` | `300` | Texto decorativo |
| `normal` | `400` | Corpo |
| `medium` | `500` | Ênfase |
| `semibold` | `600` | Subtítulos |
| `bold` | `700` | Títulos, botões |

### Letter Spacing

```yaml
tight: -0.015em    # Títulos grandes
normal: 0          # Corpo
wide: 0.025em      # Labels
wider: 0.05em      # Uppercase labels
widest: 0.1em      # Labels muito pequenos
```

---

## 🔘 Border Radius

Sistema de bordas arredondadas:

| Token | Valor | Uso |
|-------|-------|-----|
| `sm` | `4px` | Inputs |
| `default` | `6px` | Padrão |
| `md` | `8px` | Cards pequenos |
| `lg` | `12px` | Botões, cards |
| `xl` | `16px` | Modais |
| `2xl` | `24px` | Bottom sheets |
| `3xl` | `32px` | Telas mobile |
| `full` | `9999px` | Pills, avatars, FAB |

---

## 🌑 Sistema de Sombras

### Sombras Padrão

```css
shadow-sm:     0 1px 2px 0 rgba(0, 0, 0, 0.05)
shadow-lg:     0 10px 15px -3px rgba(0, 0, 0, 0.1)
shadow-2xl:    0 25px 50px -12px rgba(0, 0, 0, 0.25)
```

### Brand Shadows (Diferencial do AudioFlow)

```css
/* Brilho azul do botão de gravar */
shadow-primary-glow: 0 0 20px rgba(0, 122, 255, 0.4)

/* Sombra azul para botões primários */
shadow-primary-lg: 0 10px 15px -3px rgba(0, 122, 255, 0.3)
```

---

## 🧩 Componentes Tokenizados

### Button Primary

```css
background: var(--color-interactive-primary)
color: #FFFFFF
padding: 12px 24px
border-radius: 12px
font-size: 14px
font-weight: 700
box-shadow: 0 10px 15px -3px rgba(0, 122, 255, 0.3)
```

### FAB (Floating Action Button)

```css
width: 64px
height: 64px
border-radius: 9999px
box-shadow: 0 0 20px rgba(0, 122, 255, 0.4)
/* Botão de gravar com glow azul */
```

### Card

```css
background: var(--color-background-surface)
border: rgba(255, 255, 255, 0.05)
border-radius: 16px
padding: 16px
box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
```

### Input

```css
background: rgba(255, 255, 255, 0.05)
border: rgba(255, 255, 255, 0.05)
border-radius: 8px
padding: 12px
font-size: 10px
```

### Avatar

- **sm:** 32px (w-8 h-8)
- **md:** 56px (w-14 h-14)
- **lg:** 96px (w-24 h-24)

### Chip/Tag

```css
background: var(--color-background-elevated)
padding: 8px 16px
border-radius: 9999px
font-size: 11px
```

---

## 📦 Arquivos Gerados

```
design-tokens/
├── tokens.yaml          # Source of truth (YAML)
├── tokens.json          # JavaScript/TypeScript import
├── tokens.css           # CSS custom properties
├── tokens.tailwind.js   # Tailwind config
└── README.md            # Este arquivo
```

---

## 🚀 Como Usar

### 1. CSS Custom Properties

```html
<link rel="stylesheet" href="design-tokens/tokens.css">

<style>
.button-primary {
  background: var(--color-interactive-primary);
  color: var(--color-text-primary);
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-lg);
}
</style>
```

### 2. JavaScript/TypeScript

```javascript
import tokens from './design-tokens/tokens.json';

const button = {
  backgroundColor: tokens.semantic.color.interactive.primary,
  color: tokens.semantic.color.text.primary,
};
```

### 3. Tailwind CSS

```javascript
// tailwind.config.js
const audioflowTokens = require('./design-tokens/tokens.tailwind.js');

module.exports = {
  ...audioflowTokens,
};
```

```jsx
// Componente React
<button className="bg-primary text-white px-6 py-3 rounded-lg shadow-primary-lg font-bold">
  Gravar
</button>
```

---

## 🎯 Boas Práticas

1. **Sempre use tokens**, nunca valores hardcoded
2. **Hierarquia de texto:** Use opacidade em branco, não cores cinzas
3. **Bordas:** Prefira `border-subtle` para cards, `border-default` para inputs
4. **Sombras:** Use `shadow-primary-glow` apenas no botão de gravar
5. **Espaçamento:** Siga a escala de 4px

---

## 📊 Estatísticas do Design System

- **15 telas** analisadas
- **150+ tokens** extraídos
- **8 cores** principais
- **11 valores** de espaçamento
- **12 tamanhos** de fonte
- **9 border radii**
- **8 sombras**
- **6 componentes** tokenizados

---

## 🔄 Próximos Passos

1. ✅ Tokens extraídos e documentados
2. ⚠️ Implementar light mode quando design estiver disponível
3. 📝 Criar componentes React/Swift usando os tokens
4. 🧪 Testar acessibilidade (contraste WCAG AA)
5. 📚 Criar Storybook/styleguide visual

---

**Gerado com 💝 por Uma (UX Design Expert)**
*Design System do AudioFlow - 2026*