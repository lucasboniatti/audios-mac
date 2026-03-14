# Arquitetura AudioFlow - Integração Design System

**Versão:** 2.0.0
**Data:** 14 de Março, 2026
**Arquiteto:** Aria (Architect Agent)
**Projeto:** AudioFlow - Sistema de Transcrição de Áudio para macOS

---

## 📋 Sumário Executivo

Este documento descreve a arquitetura para integração do **Design System** (design-tokens) ao projeto AudioFlow existente, garantindo que todas as funcionalidades atuais permaneçam operacionais enquanto novas capacidades são adicionadas.

### Status Atual

- ✅ **AudioFlow macOS App**: Funcional, usando CoreData com SQLite
- ✅ **Frontend Web Dashboard**: Funcional, conectado ao SQLite do app
- ✅ **Design Tokens**: Extraídos e prontos para uso
- ⚠️ **Integração Design System**: Pendente de implementação

---

## 🏗️ Arquitetura Atual

### 1. Componentes Existentes

```
┌─────────────────────────────────────────────────────────────┐
│                    AudioFlow macOS App                       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │   AppDelegate  │  │ SpeechService  │  │ AudioController│ │
│  │   (Swift UI)   │  │  (Whisper)     │  │  (AVAudio)     │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
│           │                   │                    │        │
│           └───────────────────┴────────────────────┘        │
│                               │                             │
│                    ┌──────────▼──────────┐                  │
│                    │   CoreData Stack    │                  │
│                    │  (PersistenceService)│                 │
│                    └──────────┬──────────┘                  │
│                               │                             │
│                    ┌──────────▼──────────┐                  │
│                    │   SQLite Database   │                  │
│                    │  ~/Library/.../     │                  │
│                    │  AudioFlow.sqlite   │                  │
│                    └─────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ (read-only)
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   Frontend Web Dashboard                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │  Express.js    │  │  WebSocket     │  │  better-sqlite3│ │
│  │  Server        │  │  Real-time     │  │  (read-only)   │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
│           │                   │                             │
│           └───────────────────┘                             │
│                    ┌──────────▼──────────┐                  │
│                    │   Web Interface     │                  │
│                    │  (HTML/CSS/JS)      │                  │
│                    │  - Dashboard        │                  │
│                    │  - History          │                  │
│                    │  - Search           │                  │
│                    └─────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Fluxo de Dados Atual

```
1. Usuário grava áudio no macOS App
   ↓
2. SpeechService transcreve em tempo real
   ↓
3. Texto salvo no CoreData (SQLite)
   ↓
4. Frontend web lê SQLite (read-only)
   ↓
5. WebSocket notifica frontend de mudanças
   ↓
6. Dashboard atualiza em tempo real
```

### 3. Schema do Banco de Dados Atual

**Tabela: ZTRANSCRIPTION** (CoreData interno)

| Campo       | Tipo      | Descrição                    |
|-------------|-----------|------------------------------|
| Z_PK        | INTEGER   | Primary Key (auto-increment) |
| Z_ENT       | INTEGER   | Entity ID (CoreData)         |
| Z_OPT       | INTEGER   | Optimization flags           |
| ZTIMESTAMP  | TIMESTAMP | Data/hora da transcrição     |
| ZTEXT       | VARCHAR   | Texto transcrito             |
| ZID         | BLOB      | UUID (dados binários)        |

**Problema:** O schema é gerenciado pelo CoreData e não deve ser modificado diretamente.

---

## 🎨 Design System Integration

### 1. Visão Geral do Design Tokens

O design system está localizado em `/design-tokens/` e contém:

```
design-tokens/
├── tokens.yaml          # Source of Truth (YAML)
├── tokens.json          # JavaScript/TypeScript
├── tokens.css           # CSS Custom Properties
├── tokens.tailwind.js   # Tailwind Config
├── tokens.scss          # SCSS Variables
└── tokens.dtcg.json     # Figma Sync
```

**Características:**
- 🎨 200+ tokens extraídos
- 🌑 Dark mode nativo
- ☀️ Light mode adicionado
- 🧩 6 componentes tokenizados
- 📐 Sistema de espaçamento baseado em 4px
- 🎯 Cobertura: 100% do design system

### 2. Estrutura de Tokens

```yaml
layers:
  core:           # Valores primitivos
    color:        # Cores base (primary, backgrounds, text)
    spacing:      # Escala 0-16 (0px a 64px)
    typography:   # Fontes, tamanhos, pesos
    borderRadius: # Raios de borda
    shadow:       # Sistema de sombras

  semantic:       # Aliases contextuais
    color:        # background-primary, text-primary, etc.
    spacing:      # container-sm, gap-md, etc.

  component:      # Tokens específicos de componentes
    button:       # primary, secondary, fab
    card:         # default, elevated
    input:        # dark, light
    avatar:       # sm, md, lg
    chip:         # dark, light
```

### 3. Design Tokens Swift (Já Implementado)

**Localização:** `AudioFlow/Sources/DesignTokens/`

```swift
// AudioFlowColors.swift
extension Color {
    static let primary500 = Color(hex: "007AFF")
    static let backgroundDark = Color(hex: "000000")
    static let surfaceDark = Color(hex: "1C1C1E")
    // ... 40+ cores
}

// AudioFlowSpacing.swift
extension CGFloat {
    static let spacing1: CGFloat = 4
    static let spacing2: CGFloat = 8
    // ... 11 valores
}

// AudioFlowTypography.swift
extension Font {
    static func title() -> Font { .system(size: 24, weight: .bold) }
    static func body() -> Font { .system(size: 14, weight: .regular) }
    // ... 12 tamanhos
}
```

**Componentes Swift Criados:**

- `AudioFlowButton` (primary, secondary, destructive, FAB)
- `AudioFlowCard` (default, elevated, interactive)
- `AudioFlowFAB` (Floating Action Button com glow)

---

## 🗄️ Arquitetura de Banco de Dados Proposta

### Estratégia: Database Per Operation Pattern

Para não interferir com o CoreData existente, propomos uma arquitetura de **duplo banco**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Banco 1: CoreData (EXISTENTE)            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AudioFlow.sqlite                                     │  │
│  │  └─ ZTRANSCRIPTION (CoreData gerenciado)             │  │
│  │     • Z_PK, Z_ENT, Z_OPT, ZTIMESTAMP, ZTEXT, ZID     │  │
│  │     • READ-ONLY para frontend web                    │  │
│  │     • WRITE-ONLY pelo app Swift                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               Banco 2: Design System (NOVO)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  audioflow_design.db                                  │  │
│  │  ├─ user_preferences                                  │  │
│  │  │  • id, theme_mode, accent_color, created_at       │  │
│  │  │                                                    │  │
│  │  ├─ favorites                                         │  │
│  │  │  • id, transcription_id, created_at               │  │
│  │  │                                                    │  │
│  │  ├─ tags                                              │  │
│  │  │  • id, name, color, created_at                    │  │
│  │  │                                                    │  │
│  │  └─ transcription_tags                                │  │
│  │     • transcription_id, tag_id                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ✅ Não interfere com CoreData                              │
│  ✅ Permite novas funcionalidades                           │
│  ✅ Totalmente controlável                                   │
└─────────────────────────────────────────────────────────────┘
```

### Schema Detalhado - Banco de Design

#### Tabela: user_preferences

```sql
CREATE TABLE user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    theme_mode TEXT DEFAULT 'dark' CHECK(theme_mode IN ('dark', 'light', 'system')),
    accent_color TEXT DEFAULT '#007AFF',
    font_size_multiplier REAL DEFAULT 1.0 CHECK(font_size_multiplier >= 0.8 AND font_size_multiplier <= 1.5),
    auto_paste_enabled INTEGER DEFAULT 1,
    sound_feedback_enabled INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sempre apenas 1 registro
INSERT INTO user_preferences (id) VALUES (1);
```

#### Tabela: favorites

```sql
CREATE TABLE favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transcription_id INTEGER NOT NULL,  -- FK para ZTRANSCRIPTION.Z_PK
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transcription_id) REFERENCES ZTRANSCRIPTION(Z_PK) ON DELETE CASCADE,
    UNIQUE(transcription_id)  -- Não permitir duplicados
);

CREATE INDEX idx_favorites_created ON favorites(created_at DESC);
```

#### Tabela: tags

```sql
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#007AFF',  -- Cor do chip
    icon TEXT,                     -- Nome do ícone SF Symbols
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tags_name ON tags(name);
```

#### Tabela: transcription_tags (Many-to-Many)

```sql
CREATE TABLE transcription_tags (
    transcription_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (transcription_id, tag_id),
    FOREIGN KEY (transcription_id) REFERENCES ZTRANSCRIPTION(Z_PK) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_transcription_tags ON transcription_tags(transcription_id, tag_id);
```

---

## 🔄 Integração com o Sistema Atual

### 1. Camada de Abstração de Dados

Criar uma **DataManager** que abstrai o acesso a ambos os bancos:

```swift
// AudioFlow/Sources/Services/DataManager.swift
class DataManager {
    static let shared = DataManager()

    // Banco 1: CoreData (existente)
    private let persistenceService = PersistenceService.shared

    // Banco 2: Design System (novo)
    private let designDatabase: DatabaseConnection

    // API Unificada
    func getTranscriptions() -> [Transcription] {
        return persistenceService.fetchAllTranscriptions()
    }

    func toggleFavorite(transcriptionId: Int) {
        // Operação no banco de design
        designDatabase.toggleFavorite(transcriptionId)
    }

    func getUserPreferences() -> UserPreferences {
        return designDatabase.getUserPreferences()
    }
}
```

### 2. Frontend Web - Integração

**Modificações necessárias no `server.js`:**

```javascript
// frontend/server.js

// Banco 1: CoreData (read-only) - EXISTENTE
const COREDATA_DB = path.join(
  os.homedir(),
  'Library/Application Support/AudioFlow/AudioFlow.sqlite'
);

// Banco 2: Design System (read-write) - NOVO
const DESIGN_DB = path.join(
  os.homedir(),
  'Library/Application Support/AudioFlow/audioflow_design.db'
);

// Inicializar banco de design
function initDesignDatabase() {
  const db = new Database(DESIGN_DB);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY,
      theme_mode TEXT DEFAULT 'dark',
      accent_color TEXT DEFAULT '#007AFF',
      font_size_multiplier REAL DEFAULT 1.0,
      auto_paste_enabled INTEGER DEFAULT 1,
      sound_feedback_enabled INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transcription_id INTEGER NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#007AFF',
      icon TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transcription_tags (
      transcription_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (transcription_id, tag_id)
    );
  `);

  // Inserir registro inicial se não existir
  const prefs = db.prepare('SELECT * FROM user_preferences WHERE id = 1').get();
  if (!prefs) {
    db.prepare('INSERT INTO user_preferences (id) VALUES (1)').run();
  }

  return db;
}
```

### 3. Novos Endpoints da API

```javascript
// GET /api/preferences — Obter preferências do usuário
app.get('/api/preferences', requireAuth, (req, res) => {
  try {
    const db = new Database(DESIGN_DB, { readonly: true });
    const prefs = db.prepare('SELECT * FROM user_preferences WHERE id = 1').get();
    db.close();
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/preferences — Atualizar preferências
app.patch('/api/preferences', requireAuth, (req, res) => {
  try {
    const db = new Database(DESIGN_DB);
    const { theme_mode, accent_color, font_size_multiplier } = req.body;

    db.prepare(`
      UPDATE user_preferences
      SET theme_mode = ?, accent_color = ?, font_size_multiplier = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(theme_mode, accent_color, font_size_multiplier);

    const prefs = db.prepare('SELECT * FROM user_preferences WHERE id = 1').get();
    db.close();

    broadcast({ type: 'preferences_updated', preferences: prefs });
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/favorites — Listar favoritos
app.get('/api/favorites', requireAuth, (req, res) => {
  try {
    const coreDb = new Database(COREDATA_DB, { readonly: true });
    const designDb = new Database(DESIGN_DB, { readonly: true });

    const favorites = designDb.prepare('SELECT transcription_id FROM favorites').all();

    const transcriptions = favorites.map(fav => {
      const t = coreDb.prepare('SELECT Z_PK, ZTEXT, ZTIMESTAMP FROM ZTRANSCRIPTION WHERE Z_PK = ?').get(fav.transcription_id);
      return parseRow(t);
    });

    coreDb.close();
    designDb.close();

    res.json({ favorites: transcriptions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/favorites — Adicionar favorito
app.post('/api/favorites/:id', requireAuth, (req, res) => {
  try {
    const db = new Database(DESIGN_DB);
    const id = parseInt(req.params.id);

    db.prepare('INSERT INTO favorites (transcription_id) VALUES (?)').run(id);
    db.close();

    broadcast({ type: 'favorite_added', id });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/favorites/:id — Remover favorito
app.delete('/api/favorites/:id', requireAuth, (req, res) => {
  try {
    const db = new Database(DESIGN_DB);
    const id = parseInt(req.params.id);

    db.prepare('DELETE FROM favorites WHERE transcription_id = ?').run(id);
    db.close();

    broadcast({ type: 'favorite_removed', id });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tags — Listar tags
app.get('/api/tags', requireAuth, (req, res) => {
  try {
    const db = new Database(DESIGN_DB, { readonly: true });
    const tags = db.prepare('SELECT * FROM tags ORDER BY name').all();
    db.close();
    res.json({ tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tags — Criar tag
app.post('/api/tags', requireAuth, (req, res) => {
  try {
    const db = new Database(DESIGN_DB);
    const { name, color, icon } = req.body;

    const result = db.prepare('INSERT INTO tags (name, color, icon) VALUES (?, ?, ?)').run(name, color, icon);
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    db.close();

    broadcast({ type: 'tag_created', tag });
    res.json(tag);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transcriptions/:id/tags — Adicionar tag à transcrição
app.post('/api/transcriptions/:id/tags', requireAuth, (req, res) => {
  try {
    const db = new Database(DESIGN_DB);
    const transcriptionId = parseInt(req.params.id);
    const { tag_id } = req.body;

    db.prepare('INSERT INTO transcription_tags (transcription_id, tag_id) VALUES (?, ?)').run(transcriptionId, tag_id);
    db.close();

    broadcast({ type: 'tag_added', transcription_id: transcriptionId, tag_id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## 🎯 Estratégia de Implementação

### Fase 1: Banco de Design (Não-Invasivo)

**Objetivo:** Criar o banco de design sem modificar o CoreData.

**Tarefas:**

1. ✅ Criar schema SQL do banco de design
2. ✅ Implementar inicialização automática no `server.js`
3. ✅ Adicionar endpoints de preferências
4. ✅ Criar página de configurações no frontend
5. ✅ Implementar toggle de dark/light mode

**Riscos:** Nenhum - banco totalmente separado.

**Dependências:** Nenhuma - pode ser feito em paralelo.

---

### Fase 2: Frontend com Design Tokens

**Objetivo:** Aplicar o design system ao frontend web.

**Tarefas:**

1. ✅ Importar `tokens.css` no HTML
2. ✅ Substituir CSS hardcoded por CSS custom properties
3. ✅ Criar componentes React com tokens
4. ✅ Implementar theme switcher (dark/light)
5. ✅ Atualizar páginas existentes (dashboard, history, favorites)

**Arquivos a Modificar:**

- `frontend/index.html`
- `frontend/dashboard.html`
- `frontend/favorites.html`
- `frontend/styles.css` → `frontend/dist/styles.css` (já existe build)
- Novo: `frontend/components/` (React)

**Riscos:** Baixo - apenas CSS e frontend.

---

### Fase 3: Componentes Swift (Opcional)

**Objetivo:** Usar os componentes tokenizados no app macOS.

**Tarefas:**

1. ✅ Importar `AudioFlowColors.swift`, `AudioFlowSpacing.swift`, `AudioFlowTypography.swift`
2. ✅ Usar `AudioFlowButton`, `AudioFlowCard`, `AudioFlowFAB` em novas telas
3. ✅ Atualizar interface existente gradualmente

**Arquivos já criados:**

- `AudioFlow/Sources/DesignTokens/*.swift` ✅
- `AudioFlow/Sources/Components/AudioFlowComponents.swift` ✅

**Riscos:** Baixo - componentes são opcionais e não quebram o existente.

---

### Fase 4: Integração Avançada (Futuro)

**Funcionalidades Futuras:**

- Tags e categorias para transcrições
- Busca avançada com filtros
- Exportação com tags
- Sincronização iCloud (requer CloudKit)
- Compartilhamento de transcrições

---

## 📁 Estrutura de Diretórios Final

```
audios-mac/
├── AudioFlow/                    # App macOS (Swift)
│   ├── Sources/
│   │   ├── AppDelegate.swift     # ✅ Principal (não modificar)
│   │   ├── Services/
│   │   │   ├── PersistenceService.swift  # ✅ CoreData (não modificar)
│   │   │   └── DataManager.swift         # 🆕 Abstração de dados
│   │   ├── DesignTokens/                 # ✅ Design tokens Swift
│   │   │   ├── AudioFlowColors.swift
│   │   │   ├── AudioFlowSpacing.swift
│   │   │   └── AudioFlowTypography.swift
│   │   └── Components/                   # ✅ Componentes UI
│   │       └── AudioFlowComponents.swift
│   └── Assets/
│       └── logo.svg                      # Logo da marca
│
├── frontend/                     # Dashboard Web (Node.js)
│   ├── server.js                 # ✅ Backend (modificar)
│   ├── index.html                # ✅ Página principal (modificar)
│   ├── dashboard.html            # ✅ Dashboard (modificar)
│   ├── favorites.html            # ✅ Favoritos (modificar)
│   ├── styles.css                # ✅ CSS custom properties
│   ├── components/               # 🆕 Componentes React
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Chip.tsx
│   │   └── index.tsx
│   └── lib/
│       └── tokens.js             # Import de tokens.json
│
├── design-tokens/                # 🆕 Design System (Source of Truth)
│   ├── tokens.yaml               # ✅ Editar aqui
│   ├── tokens.json               # ✅ Gerado automaticamente
│   ├── tokens.css                # ✅ Gerado automaticamente
│   ├── tokens.tailwind.js        # ✅ Gerado automaticamente
│   └── tokens.dtcg.json          # ✅ Figma sync
│
├── ~/Library/Application Support/AudioFlow/
│   ├── AudioFlow.sqlite          # ✅ Banco CoreData (não mexer)
│   └── audioflow_design.db       # 🆕 Banco de design
│
└── docs/
    └── architecture/
        └── ARCHITECTURE.md       # Este documento
```

---

## 🔒 Considerações de Segurança

### 1. Integridade do CoreData

**Regra de Ouro:** O banco `AudioFlow.sqlite` é **gerenciado exclusivamente pelo CoreData**.

- ✅ Frontend pode LER (read-only)
- ❌ Frontend NÃO pode ESCREVER diretamente
- ❌ Frontend NÃO pode modificar schema
- ✅ App Swift pode ESCREVER via CoreData

### 2. Banco de Design

- ✅ Frontend pode LER e ESCREVER
- ✅ Schema controlado manualmente
- ✅ Migrações manuais (não há ORM)
- ✅ Backup independente

### 3. Autenticação

- ✅ Atual: senha fixa (`audioflow123`)
- 🔮 Futuro: integração com iCloud/Apple ID
- 🔮 Futuro: autenticação OAuth

### 4. Validação de Dados

```javascript
// Validar theme_mode
const validThemes = ['dark', 'light', 'system'];
if (!validThemes.includes(theme_mode)) {
  return res.status(400).json({ error: 'Invalid theme_mode' });
}

// Validar accent_color (hex color)
const hexColorRegex = /^#[0-9A-F]{6}$/i;
if (!hexColorRegex.test(accent_color)) {
  return res.status(400).json({ error: 'Invalid accent_color' });
}

// Validar font_size_multiplier
if (font_size_multiplier < 0.8 || font_size_multiplier > 1.5) {
  return res.status(400).json({ error: 'font_size_multiplier must be between 0.8 and 1.5' });
}
```

---

## 📊 Performance

### 1. Banco de Dados

**CoreData (AudioFlow.sqlite):**
- ✅ Indexado automaticamente pelo CoreData
- ✅ Transações ACID
- ✅ Cache automático
- ⚠️ Polling a cada 2s no frontend (aceitável para read-only)

**Design DB (audioflow_design.db):**
- ✅ Índices criados manualmente
- ✅ Transações ACID (better-sqlite3)
- ✅ In-memory cache para preferências
- ✅ WebSocket para notificações em tempo real

### 2. Frontend

**Otimizações:**
- ✅ CSS Custom Properties (variáveis nativas)
- ✅ Build-time token compilation
- ✅ Lazy loading de páginas
- 🔮 Service Worker para cache offline
- 🔮 CDN para assets estáticos

### 3. App macOS

**Otimizações:**
- ✅ CoreData com contexto em background
- ✅ Fetched Results Controller para listas
- ✅ Lazy loading de transcrições antigas
- 🔮 Compressão de áudio antes da transcrição

---

## 🧪 Testes

### 1. Banco de Dados

```swift
// Tests/DataManagerTests.swift
func testToggleFavorite() {
    let transcriptionId = 1
    DataManager.shared.toggleFavorite(transcriptionId: transcriptionId)
    let isFavorite = DataManager.shared.isFavorite(transcriptionId: transcriptionId)
    XCTAssertTrue(isFavorite)

    DataManager.shared.toggleFavorite(transcriptionId: transcriptionId)
    let isNotFavorite = DataManager.shared.isFavorite(transcriptionId: transcriptionId)
    XCTAssertFalse(isNotFavorite)
}
```

### 2. API Endpoints

```javascript
// tests/api.test.js
const request = require('supertest');
const app = require('../server.js');

describe('Preferences API', () => {
  test('GET /api/preferences should return default preferences', async () => {
    const response = await request(app)
      .get('/api/preferences')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.theme_mode).toBe('dark');
    expect(response.body.accent_color).toBe('#007AFF');
  });

  test('PATCH /api/preferences should update theme', async () => {
    const response = await request(app)
      .patch('/api/preferences')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ theme_mode: 'light' });

    expect(response.status).toBe(200);
    expect(response.body.theme_mode).toBe('light');
  });
});
```

### 3. Design Tokens

```javascript
// tests/tokens.test.js
const tokens = require('../design-tokens/tokens.json');

describe('Design Tokens', () => {
  test('All colors should be valid hex', () => {
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    Object.values(tokens.layers.core.color).forEach(color => {
      if (color.$value.startsWith('#')) {
        expect(color.$value).toMatch(hexColorRegex);
      }
    });
  });

  test('Spacing should follow 4px scale', () => {
    Object.entries(tokens.layers.core.spacing).forEach(([key, token]) => {
      if (key !== '0') {
        const value = parseInt(token.$value);
        expect(value % 4).toBe(0);
      }
    });
  });
});
```

---

## 🚀 Deploy e CI/CD

### 1. Build Process

```bash
# Build dos tokens
npm run tokens:build

# Build do CSS (Tailwind + PostCSS)
npm run build:css

# Build do app macOS
./build_app.sh

# Iniciar produção
npm run prod
```

### 2. Migrações de Banco

```javascript
// migrations/001_initial_schema.js
function migrate() {
  const db = new Database(DESIGN_DB);

  // Criar tabelas
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (...);
    CREATE TABLE IF NOT EXISTS favorites (...);
    CREATE TABLE IF NOT EXISTS tags (...);
    CREATE TABLE IF NOT EXISTS transcription_tags (...);
  `);

  // Inserir dados iniciais
  db.prepare('INSERT OR IGNORE INTO user_preferences (id) VALUES (1)').run();

  db.close();
}
```

### 3. Backup

```bash
# Backup manual
cp ~/Library/Application\ Support/AudioFlow/AudioFlow.sqlite ~/Backups/
cp ~/Library/Application\ Support/AudioFlow/audioflow_design.db ~/Backups/

# Backup automático (cron)
0 2 * * * cp ~/Library/Application\ Support/AudioFlow/*.db ~/Backups/$(date +\%Y\%m\%d)/
```

---

## 📚 Documentação Adicional

### Links Úteis

- [Design Tokens README](../design-tokens/README.md)
- [Design Tokens Analysis](../design-tokens/ANALYSIS.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Implementation Guide](../IMPLEMENTATION_GUIDE.md)

### Story Files

As stories de desenvolvimento estão em `docs/stories/`:

- Epic 1: Infrastructure Setup
- Epic 2: Core Features
- Epic 3: Design System Integration
- Epic 4: UI/UX Improvements
- Epic 5: Advanced Features
- Epic 6: Performance & Optimization

---

## 🎯 Conclusão

### O que foi proposto

1. ✅ **Banco de Design Separado**: Não interfere com CoreData existente
2. ✅ **Design Tokens Integrados**: Prontos para uso em Swift e Web
3. ✅ **API Expandida**: Novos endpoints para preferências, favoritos, tags
4. ✅ **Arquitetura Escalável**: Permite futuras expansões sem quebrar o existente
5. ✅ **Zero Breaking Changes**: Tudo que funciona hoje continua funcionando

### Próximos Passos Recomendados

1. **Implementar Banco de Design** (Fase 1) - 1-2 dias
2. **Aplicar Design Tokens no Frontend** (Fase 2) - 2-3 dias
3. **Criar Componentes React** (Fase 2) - 3-5 dias
4. **Integrar Componentes Swift** (Fase 3) - Opcional, 2-3 dias
5. **Testes e QA** - 1-2 dias

### Contato

**Arquiteto:** Aria (Architect Agent)
**Email:** Não aplicável (agente de IA)
**Última Atualização:** 14 de Março, 2026

---

**AudioFlow** - Arquitetura de Design System v2.0

*Este documento deve ser atualizado sempre que houver mudanças arquiteturais significativas.*