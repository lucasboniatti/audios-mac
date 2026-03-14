# Arquitetura: AudioFlow Web Dashboard com Supabase

**Data:** 2026-03-14
**Autor:** @architect (Aria)
**Status:** DRAFT - Aguardando Validação QA
**Epic:** EPIC-007 - AudioFlow Web Sincronizado

---

## 1. Visão Geral

### Problema Atual
- Frontend web funciona apenas com SQLite local (CoreData)
- Autenticação é apenas senha fixa (sem cadastro real)
- Dashboard sem filtros funcionais
- Sem sincronização cloud
- Sem perfil de usuário com foto

### Solução Proposta
Sistema web completo com:
- **Autenticação Supabase** (email/senha)
- **Perfil de usuário** com foto (Supabase Storage)
- **Sincronização CoreData ↔ Supabase** (hibrid local/cloud)
- **Dashboard funcional** com filtros por data
- **Compatibilidade total** com app macOS existente

---

## 2. Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND WEB                              │
│  localhost:3000 (ou domínio customizado)                         │
│  ├── index.html (Gravações)                                     │
│  ├── dashboard.html (Dashboard com filtros)                     │
│  ├── login.html (Login email/senha)                             │
│  ├── signup.html (Criar conta)                                  │
│  └── profile.html (Editar perfil + foto)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NODE.JS API BRIDGE                            │
│  frontend/server.js (Express + WebSocket)                        │
│  ├── Auth: Supabase Auth (email/senha)                          │
│  ├── CRUD: Transcrições (CoreData local + Supabase sync)        │
│  ├── Storage: Fotos de perfil (Supabase Storage)                │
│  └── Real-time: WebSocket para updates                          │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│   COREDATA (LOCAL)       │     │      SUPABASE (CLOUD)           │
│   AudioFlow.sqlite       │◄───►│  ├── auth.users                 │
│   (App macOS)            │     │  ├── public.profiles            │
│   └─────────────────────┘     │  ├── public.transcriptions      │
│                                │  └── storage avatars            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Stack Tecnológico

### Frontend
| Tecnologia | Versão | Motivo |
|------------|--------|--------|
| **HTML/CSS/JS** | Vanilla | KISS principle, já existe |
| **Tailwind CSS** | 4.x CDN | Design system já definido |
| **Supabase JS** | 2.x | Client SDK para auth/storage |

### Backend (Node.js Bridge)
| Tecnologia | Versão | Motivo |
|------------|--------|--------|
| **Express** | 5.x | Já implementado |
| **better-sqlite3** | 12.x | Leitura CoreData local |
| **@supabase/supabase-js** | 2.x | Client para Supabase |
| **ws** | 8.x | WebSocket real-time |

### Cloud (Supabase)
| Serviço | Uso |
|---------|-----|
| **Auth** | Email/senha authentication |
| **PostgreSQL** | Banco relacional cloud |
| **Storage** | Fotos de perfil |
| **RLS** | Row Level Security |

---

## 4. Modelo de Dados

### 4.1 CoreData (Local - macOS App)

**Mantido 100% como está.** App macOS continua funcionando offline.

```sql
-- ZTRANSCRIPTION (CoreData internal)
Z_PK INTEGER PRIMARY KEY
ZTEXT TEXT
ZTIMESTAMP FLOAT  -- CoreData epoch (seconds since 2001-01-01)
ZID BLOB          -- UUID em bytes
```

### 4.2 Supabase (Cloud)

#### Tabela: `public.profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{
    "theme": "dark",
    "accentColor": "#007AFF",
    "autoPaste": true,
    "soundFeedback": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

#### Tabela: `public.transcriptions`
```sql
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id INTEGER,  -- Referência ao Z_PK do CoreData
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,

  UNIQUE(user_id, local_id)  -- Evitar duplicatas por usuário
);

-- Índices para queries comuns
CREATE INDEX idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX idx_transcriptions_timestamp ON transcriptions(timestamp DESC);
CREATE INDEX idx_transcriptions_user_timestamp ON transcriptions(user_id, timestamp DESC);

-- RLS
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transcriptions"
  ON transcriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transcriptions"
  ON transcriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transcriptions"
  ON transcriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transcriptions"
  ON transcriptions FOR DELETE
  USING (auth.uid() = user_id);
```

#### Tabela: `public.tags`
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#007AFF',
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, name)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tags"
  ON tags FOR ALL
  USING (auth.uid() = user_id);
```

### 4.3 Sincronização CoreData ↔ Supabase

**Estratégia:** Background sync com conflito resolution

```
[macOS App grava]
     ↓
[CoreData (local)]
     ↓
[server.js detecta mudança]
     ↓
[Push para Supabase]
     ↓
[Update synced_at]
```

**Conflito Resolution:**
- **Create:** Sempre push para Supabase
- **Update:** Último `updated_at` vence
- **Delete:** Propaga para ambos lados

---

## 5. Autenticação e Perfis

### 5.1 Fluxo de Login/Signup

#### Signup (Criar Conta)
```
1. Usuário preenche: nome, email, senha
2. Frontend chama: supabase.auth.signUp()
3. Supabase envia email de confirmação
4. Usuário confirma email
5. Trigger cria registro em `profiles`
6. Redirect para dashboard
```

#### Login
```
1. Usuário preenche: email, senha
2. Frontend chama: supabase.auth.signInWithPassword()
3. Supabase retorna: session (access_token, refresh_token)
4. Frontend armazena: localStorage + session Supabase
5. Redirect para dashboard
```

#### Logout
```
1. Frontend chama: supabase.auth.signOut()
2. Limpa localStorage
3. Redirect para login
```

### 5.2 Perfil de Usuário

#### Editar Perfil
```
1. Usuário altera nome ou foto
2. Se foto: upload para Supabase Storage (avatars/)
3. Atualiza tabela profiles
4. Interface reflete mudança em tempo real
```

#### Upload de Foto
```javascript
// Storage bucket: avatars
// Path: {user_id}/avatar.jpg
// Public URL: https://...supabase.co/storage/v1/object/public/avatars/{user_id}/avatar.jpg

const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${user.id}/avatar`, file, {
    cacheControl: '3600',
    upsert: true
  });
```

---

## 6. Dashboard com Filtros

### 6.1 Filtros por Data

**UI:** Botões de filtro (já existe no HTML, precisa funcionalidade)

```javascript
// Filtros disponíveis:
- Hoje
- Ontem
- Últimos 3 dias
- Últimos 7 dias
- Esta semana
- Este mês
- Todo período
- Personalizado (date picker)
```

**Backend:** Query com parâmetro de data

```sql
-- GET /api/transcriptions?start={iso}&end={iso}
SELECT * FROM transcriptions
WHERE user_id = $1
  AND timestamp >= $2
  AND timestamp < $3
ORDER BY timestamp DESC;
```

### 6.2 Dashboard Stats

**Estatísticas calculadas:**

1. **Total de Palavras**
   - Soma de todas as palavras no período
   - Contagem: `text.split(/\s+/).length`

2. **Média Diária**
   - Média de palavras por dia
   - Fórmula: `totalWords / daysWithTranscriptions`

3. **Gráfico Semanal**
   - Últimos 7 dias com barras
   - Cada barra = palavras por dia

4. **Palavras Mais Faladas**
   - Top 30 palavras (min 4 chars)
   - Frequência com contagem

5. **Tendência**
   - Comparação período atual vs período anterior
   - Porcentagem de crescimento/queda

---

## 7. API Endpoints

### Auth Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/signup` | Criar conta (email/senha) |
| POST | `/auth/login` | Login (email/senha) |
| POST | `/auth/logout` | Logout |
| GET | `/auth/session` | Verificar sessão ativa |
| GET | `/auth/callback` | Callback OAuth (se necessário) |

### Profile Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/profile` | Obter perfil do usuário |
| PATCH | `/api/profile` | Atualizar nome/preferências |
| POST | `/api/profile/avatar` | Upload foto de perfil |
| DELETE | `/api/profile/avatar` | Remover foto |

### Transcriptions Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/transcriptions` | Listar (com paginação e filtros) |
| GET | `/api/transcriptions/search` | Buscar por texto |
| GET | `/api/transcriptions/stats` | Estatísticas do dashboard |
| POST | `/api/transcriptions` | Criar transcrição (sync) |
| PATCH | `/api/transcriptions/:id` | Atualizar (favorito, tags) |
| DELETE | `/api/transcriptions/:id` | Deletar transcrição |

### Tags Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/tags` | Listar tags do usuário |
| POST | `/api/tags` | Criar tag |
| DELETE | `/api/tags/:id` | Deletar tag |
| POST | `/api/transcriptions/:id/tags` | Adicionar tag |
| DELETE | `/api/transcriptions/:id/tags/:tag_id` | Remover tag |

---

## 8. Frontend Pages

### 8.1 Páginas Existentes (Modificar)

#### `login.html`
- **Atual:** Senha fixa
- **Novo:** Email/senha com Supabase Auth
- **Adicionar:** Link para signup

#### `index.html` (Gravações)
- **Atual:** Lista transcrições do CoreData
- **Novo:** Sincroniza com Supabase
- **Manter:** Fallback para modo offline (CoreData)

#### `dashboard.html`
- **Atual:** Stats sem filtros funcionais
- **Novo:** Filtros por data funcionais
- **Adicionar:** Date picker personalizado

### 8.2 Páginas Novas

#### `signup.html`
```html
<!-- Criar conta -->
<form>
  <input type="text" placeholder="Nome completo" required>
  <input type="email" placeholder="Email" required>
  <input type="password" placeholder="Senha (min 8 chars)" required>
  <button type="submit">Criar Conta</button>
</form>
<p>Já tem conta? <a href="/login">Fazer login</a></p>
```

#### `profile.html`
```html
<!-- Editar perfil -->
<div class="profile-card">
  <img src="avatar_url" alt="Avatar">
  <button>Alterar foto</button>
</div>
<form>
  <input type="text" value="Nome completo">
  <input type="email" value="email@exemplo.com" disabled>
  <button type="submit">Salvar</button>
</form>
```

---

## 9. Segurança

### 9.1 Row Level Security (RLS)

**Todas as tabelas protegidas:**
- Users só acessam próprios dados
- Verificação via `auth.uid()`

### 9.2 Storage Security

**Bucket `avatars`:**
```sql
-- Políticas de storage
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
```

### 9.3 API Security

**Middleware de autenticação:**
```javascript
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
}
```

---

## 10. Performance

### 10.1 Otimizações Frontend

- **Lazy loading:** Transcrições paginadas (100 por página)
- **WebSocket:** Updates em tempo real sem polling
- **Cache:** LocalStorage para dados frequentes
- **Debounce:** Busca com 300ms debounce

### 10.2 Otimizações Backend

- **Connection pooling:** better-sqlite3 já é síncrono
- **Índices:** Todos os campos de busca indexados
- **Batching:** Sync de transcrições em batches de 100

### 10.3 Otimizações Supabase

- **CDN:** Avatars servidos via CDN
- **RLS:** Verificação rápida via JWT
- **Connection:** Supabase connection pooling

---

## 11. Deployment

### 11.1 Supabase Setup

```bash
# 1. Criar projeto no Supabase Dashboard
# 2. Configurar autenticação:
#    - Email/password habilitado
#    - Email confirm required
# 3. Executar migrations:
supabase db push

# 4. Criar bucket de storage:
#    - Name: avatars
#    - Public: true
```

### 11.2 Frontend Deployment

```bash
# Opção 1: Vercel/Netlify (estático)
# - Build: npm run build
# - Deploy: automático via Git

# Opção 2: VPS com PM2
# - Node.js server
# - Nginx reverse proxy
# - SSL via Let's Encrypt
```

### 11.3 Environment Variables

```env
# .env (NÃO commitar)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Opcional para produção
NODE_ENV=production
PORT=3000
```

---

## 12. Migração de Dados

### 12.1 Migração Inicial

**Script para migrar dados existentes:**

```javascript
// scripts/migrate-to-supabase.js

async function migrateTranscriptions() {
  // 1. Ler todas as transcrições do CoreData
  const localDB = new Database(DB_PATH);
  const rows = localDB.prepare('SELECT * FROM ZTRANSCRIPTION').all();

  // 2. Para cada transcrição, inserir no Supabase
  for (const row of rows) {
    await supabase.from('transcriptions').insert({
      user_id: userId,
      local_id: row.Z_PK,
      text: row.ZTEXT,
      timestamp: coreDataTimestampToISO(row.ZTIMESTAMP),
      synced_at: new Date().toISOString()
    });
  }

  console.log(`Migradas ${rows.length} transcrições`);
}
```

---

## 13. Monitoramento

### 13.1 Logs

- **Auth events:** Login, logout, signup
- **API errors:** Erros 4xx e 5xx
- **Sync failures:** Falhas de sincronização

### 13.2 Métricas

- **DAU:** Daily Active Users
- **Transcriptions/day:** Média por usuário
- **Sync latency:** Tempo de sincronização

---

## 14. Roadmap de Implementação

### Fase 1: Autenticação (Story 7.1)
- [ ] Configurar projeto Supabase
- [ ] Criar tabelas profiles
- [ ] Implementar signup.html
- [ ] Modificar login.html
- [ ] Middleware de auth

### Fase 2: Perfil de Usuário (Story 7.2)
- [ ] Criar profile.html
- [ ] Upload de avatar
- [ ] Editar nome/preferências

### Fase 3: Sincronização (Story 7.3)
- [ ] Criar tabela transcriptions no Supabase
- [ ] Implementar sync CoreData → Supabase
- [ ] Resolver conflitos
- [ ] Fallback offline

### Fase 4: Dashboard Funcional (Story 7.4)
- [ ] Implementar filtros por data
- [ ] Date picker personalizado
- [ ] Stats dinâmicos por período

### Fase 5: Tags e Favoritos (Story 7.5)
- [ ] Criar tabela tags
- [ ] CRUD de tags
- [ ] Associar tags a transcrições
- [ ] Sincronizar favoritos

---

## 15. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **CoreData quebra compatibilidade** | Baixa | Alto | Não modificar estrutura CoreData |
| **Sync conflitos** | Média | Médio | Estratégia "last write wins" + timestamp |
| **Auth downtime** | Baixa | Alto | Fallback offline com dados locais |
| **Custo Supabase** | Baixa | Médio | Plano gratuito generoso, monitorar uso |
| **Latência sync** | Média | Baixo | Background sync assíncrono |

---

## 16. Decisões Arquiteturais (ADRs)

### ADR-001: Supabase vs Firebase
**Decisão:** Usar Supabase
**Motivo:**
- PostgreSQL (relacional) vs NoSQL
- Open source
- Melhor pricing para escala
- SQL já conhecido pela equipe

### ADR-002: Sync híbrido vs Cloud-only
**Decisão:** Híbrido (CoreData local + Supabase)
**Motivo:**
- App macOS funciona offline
- Latência zero para operações locais
- Backup automático na nuvem
- Experiência não é quebrada

### ADR-003: Vanilla JS vs Framework
**Decisão:** Manter Vanilla JS
**Motivo:**
- Frontend já funcional
- KISS principle
- Menos dependências
- Performance superior

---

## 17. Próximos Passos

1. **@qa validar arquitetura**
   - Revisar segurança
   - Validar modelo de dados
   - Checar performance

2. **@sm criar stories**
   - Story 7.1: Autenticação Supabase
   - Story 7.2: Perfil de Usuário
   - Story 7.3: Sincronização
   - Story 7.4: Dashboard Funcional
   - Story 7.5: Tags e Favoritos

3. **@dev implementar**
   - Seguir ordem das stories
   - Testar cada fase
   - Validar com QA

---

**Fim do Documento de Arquitetura**

*Aria, arquitetando o futuro 🏗️*