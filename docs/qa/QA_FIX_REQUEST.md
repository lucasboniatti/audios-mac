# QA FIX REQUEST — Arquitetura AudioFlow + Supabase

**Data:** 2026-03-14
**QA Agent:** Quinn (@qa)
**Arquiteto Responsável:** Aria (@architect)
**Documento:** `docs/architecture/audioflow-web-supabase-architecture.md`
**Epic:** EPIC-007 - AudioFlow Web Sincronizado
**Status:** CONCERNS — Requer ajustes antes de implementação

---

## Re-review Result (2026-03-14)

**Status Atual:** PASS  
**Gate Atual:** `docs/qa/gates/epic-007-audioflow-web-sync-architecture.yml`

Os blockers documentais desta revisão foram absorvidos na arquitetura revisada:
- runtime de usuário com `SUPABASE_ANON_KEY + JWT + RLS`
- endpoint de busca seguro com validação de input e `ilike`
- sincronização com versionamento e reconciliação explícita de conflito
- roadmap renumerado para `9.1` a `9.5` e alinhado ao PRD/epic formal

O conteúdo abaixo permanece como registro histórico da primeira rodada de review e dos fixes solicitados naquela etapa.

---

## 📊 QA Gate Summary

| Critério | Score | Status |
|----------|-------|--------|
| **Segurança** | 4/5 | ⚠️ CONCERNS |
| **Modelo de Dados** | 4.5/5 | ⚠️ MINOR CONCERNS |
| **Sincronização** | 3/5 | ❌ MUST FIX |
| **Performance** | 5/5 | ✅ EXCELLENT |
| **Completude** | 5/5 | ✅ EXCELLENT |
| **Riscos** | 4/5 | ⚠️ MINOR CONCERNS |
| **Documentação** | 5/5 | ✅ EXCELLENT |

**Average Score:** 4.4/5
**Veredito:** CONCERNS — Aprovação condicional a correções

---

## 🔴 MUST FIX (Crítico — Bloqueia implementação)

### FIX-001: Service Role Key no server.js

**Severidade:** CRITICAL
**Categoria:** Segurança
**Linhas no Documento:** 537-538

**Problema:**
O documento sugere usar `SUPABASE_SERVICE_ROLE_KEY` no server.js para operações de usuário. Service role key **bypassa todas as RLS policies**, criando vulnerabilidade crítica de segurança.

**Código Problemático:**
```env
# .env (linha 537-538)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Risco:**
- Qualquer operação com service role key ignora RLS
- Users podem acessar dados de outros users
- Violação de princípio de least privilege

**Solução Recomendada:**
```env
# .env (corrigido)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key APENAS para scripts admin/migrations
# NUNCA em produção no server.js
```

**Código server.js:**
```javascript
const { createClient } = require('@supabase/supabase-js');

// ✅ CORRETO: Usar anon key para operações de usuário
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware passa user token para Supabase
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      // Supabase client usa token do user, respeitando RLS
      req.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: { Authorization: `Bearer ${token}` }
          }
        }
      );
      req.user = user;
    }
  }

  next();
});
```

**Validação:**
- [ ] Service role key removida do server.js
- [ ] Anon key usada para todas as operações de usuário
- [ ] Token passado no header Authorization
- [ ] RLS policies testadas e funcionando

---

### FIX-002: SQL Injection no Search Endpoint

**Severidade:** CRITICAL
**Categoria:** Segurança
**Linhas no Documento:** 363

**Problema:**
O endpoint `GET /api/transcriptions/search?q=` não demonstra sanitização explícita, criando risco de SQL injection.

**Código Problemático (implícito):**
```javascript
// Possível implementação vulnerável
app.get('/api/transcriptions/search', async (req, res) => {
  const query = req.query.q;

  // ❌ RISCO: Se usar raw SQL com interpolação
  const { data } = await supabase
    .rpc('search_transcriptions', { query }); // SQL injection?
});
```

**Risco:**
- Atacante pode injetar SQL via parâmetro `q`
- Pode acessar dados de outros users
- Pode modificar/deletar dados

**Solução Recomendada:**
```javascript
app.get('/api/transcriptions/search', async (req, res) => {
  const query = req.query.q;

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  // ✅ CORRETO: Usar Supabase client com ilike (prepared statement)
  const { data, error } = await req.supabase
    .from('transcriptions')
    .select('id, text, timestamp, is_favorite')
    .ilike('text', `%${query}%`) // Supabase sanitiza automaticamente
    .order('timestamp', { ascending: false })
    .limit(50);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});
```

**Validação:**
- [ ] Endpoint usa `.ilike()` ou prepared statements
- [ ] Input validado (min length, caracteres permitidos)
- [ ] Teste de SQL injection passa
- [ ] RLS policies aplicadas corretamente

---

### FIX-003: Conflito Resolution Insuficiente

**Severidade:** HIGH
**Categoria:** Sincronização / Data Integrity
**Linhas no Documento:** 220-223

**Problema:**
A estratégia "last write wins" para edição simultânea de transcrições pode causar **perda de dados silenciosa**.

**Código Problemático:**
```javascript
// Linha 220-223
Create: Sempre push para Supabase
Update: Último updated_at vence  // ❌ Perde dados da edição anterior
Delete: Propaga para ambos lados
```

**Cenário Problemático:**
```
1. User edita transcrição no macOS (offline) → CoreData atualiza
2. User edita MESMA transcrição no web → Supabase atualiza
3. Sync acontece:
   - Se CoreData sync depois → edição web é perdida
   - Se Supabase sync depois → edição macOS é perdida
4. User não é notificado do conflito
5. Dados são perdidos sem possibilidade de recuperação
```

**Risco:**
- Perda de trabalho do usuário
- Experiência ruim (dados desaparecem)
- Falta de confiabilidade no sistema de sync

**Solução Recomendada (Version Vector):**

```javascript
// 1. Adicionar coluna de versão na tabela
ALTER TABLE transcriptions ADD COLUMN version INTEGER DEFAULT 1;

// 2. Lógica de sync com version check
async function syncTranscription(localTranscription, userId) {
  const { data: serverVersion } = await supabase
    .from('transcriptions')
    .select('version, updated_at')
    .eq('id', localTranscription.id)
    .single();

  if (serverVersion) {
    // Verificar conflito
    const localUpdated = new Date(localTranscription.updated_at);
    const serverUpdated = new Date(serverVersion.updated_at);

    // Se server é mais recente E versão diferente → CONFLITO
    if (serverUpdated > localUpdated &&
        serverVersion.version !== localTranscription.version) {
      // Criar registro de conflito
      await logConflict({
        transcription_id: localTranscription.id,
        user_id: userId,
        local_text: localTranscription.text,
        server_text: serverVersion.text,
        detected_at: new Date().toISOString()
      });

      // Retornar erro para UI resolver
      throw new Error('CONFLICT_DETECTED');
    }
  }

  // Sem conflito → atualizar
  const { error } = await supabase
    .from('transcriptions')
    .upsert({
      ...localTranscription,
      version: (serverVersion?.version || 0) + 1,
      synced_at: new Date().toISOString()
    });

  return { success: true };
}

// 3. UI de resolução de conflito
function showConflictDialog(localText, serverText) {
  return `
    <div class="conflict-dialog">
      <h3>Conflito Detectado</h3>
      <p>Esta transcrição foi editada em outro dispositivo.</p>

      <div class="conflict-options">
        <div>
          <h4>Sua versão:</h4>
          <p>${localText}</p>
          <button onclick="keepLocal()">Manter minha versão</button>
        </div>

        <div>
          <h4>Versão do servidor:</h4>
          <p>${serverText}</p>
          <button onclick="keepServer()">Usar versão do servidor</button>
        </div>
      </div>
    </div>
  `;
}
```

**Solução Alternativa (Mais Simples):**

```javascript
// Manter histórico de versões
CREATE TABLE transcription_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  edited_at TIMESTAMPTZ DEFAULT NOW(),
  edited_by TEXT, -- 'local' ou 'web'
  version INTEGER
);

// Ao detectar conflito, salvar ambas versões
// Usuário pode recuperar versão anterior depois
```

**Validação:**
- [ ] Coluna `version` adicionada à tabela
- [ ] Lógica de conflito implementada
- [ ] Teste de edição simultânea passa
- [ ] UI de resolução de conflito implementada OU histórico de versões
- [ ] Documentação atualizada com fluxo de conflito

---

## 🟡 SHOULD FIX (Importante — Não bloqueia, mas recomendado)

### FIX-004: Documentar local_id pode ser NULL

**Severidade:** MEDIUM
**Categoria:** Documentação / Modelo de Dados
**Linhas no Documento:** 146

**Problema:**
A coluna `local_id` referencia `Z_PK` do CoreData, mas transcrições criadas via web não terão `local_id`. Isso não está documentado explicitamente.

**Código Atual:**
```sql
-- Linha 146
local_id INTEGER,  -- Referência ao Z_PK do CoreData
```

**Solução Recomendada:**
```sql
-- Atualizado
local_id INTEGER,  -- Referência ao Z_PK do CoreData (NULL se criado via web)
-- NOTA: Transcrições criadas no web não têm correspondência local
-- Sync bidirectional deve criar registro local quando possível
```

**Documentação Adicional:**
```markdown
### 4.3 Sincronização CoreData ↔ Supabase

**Campos Opcionais:**
- `local_id`: Presente apenas para transcrições originadas no CoreData
- Transcrições criadas via web terão `local_id = NULL`
- Quando possível, criar registro local no CoreData durante sync

**Fluxo de Criação:**
1. App macOS → CoreData → `local_id` preenchido
2. Web → Supabase → `local_id = NULL`
3. Sync para CoreData → criar registro local, atualizar `local_id`
```

**Validação:**
- [ ] Documentação atualizada
- [ ] Exemplo de fluxo de criação adicionado
- [ ] Código de sync trata `local_id = NULL` corretamente

---

### FIX-005: Teste Unitário para coreDataTimestampToISO()

**Severidade:** MEDIUM
**Categoria:** Qualidade / Testes
**Linhas no Documento:** 104

**Problema:**
A conversão de timestamp CoreData → ISO é crítica para não perder dados, mas não há menção a testes unitários.

**Código Problemático:**
```javascript
// Linha 104: ZTIMESTAMP FLOAT -- CoreData epoch (seconds since 2001-01-01)
// Linha 567: coreDataTimestampToISO(row.ZTIMESTAMP)
```

**Solução Recomendada:**

```javascript
// frontend/lib/coredata-helpers.js
const COREDATA_EPOCH = new Date('2001-01-01T00:00:00Z').getTime();

function coreDataTimestampToISO(timestamp) {
  if (typeof timestamp !== 'number' || isNaN(timestamp)) {
    throw new Error('Invalid CoreData timestamp');
  }

  const milliseconds = COREDATA_EPOCH + timestamp * 1000;
  return new Date(milliseconds).toISOString();
}

module.exports = { coreDataTimestampToISO };
```

```javascript
// tests/coredata-helpers.test.js
const { coreDataTimestampToISO } = require('../frontend/lib/coredata-helpers');

describe('coreDataTimestampToISO', () => {
  test('converte timestamp zero corretamente', () => {
    const result = coreDataTimestampToISO(0);
    expect(result).toBe('2001-01-01T00:00:00.000Z');
  });

  test('converte timestamp positivo corretamente', () => {
    // 1 dia após epoch (86400 segundos)
    const result = coreDataTimestampToISO(86400);
    expect(result).toBe('2001-01-02T00:00:00.000Z');
  });

  test('converte timestamp real do banco', () => {
    // Exemplo real: 2024-03-14 10:30:00
    const timestamp = 732473400; // Calculado manualmente
    const result = coreDataTimestampToISO(timestamp);
    expect(new Date(result).getFullYear()).toBe(2024);
  });

  test('lança erro para timestamp inválido', () => {
    expect(() => coreDataTimestampToISO(null)).toThrow('Invalid CoreData timestamp');
    expect(() => coreDataTimestampToISO('abc')).toThrow('Invalid CoreData timestamp');
    expect(() => coreDataTimestampToISO(NaN)).toThrow('Invalid CoreData timestamp');
  });

  test('precisão de milissegundos', () => {
    const timestamp = 0.123; // 123ms após epoch
    const result = coreDataTimestampToISO(timestamp);
    expect(result).toMatch(/\.123Z$/);
  });
});
```

**Validação:**
- [ ] Função helper criada com validação
- [ ] Testes unitários escritos
- [ ] Testes passam
- [ ] Função usada consistentemente no código

---

### FIX-006: Adicionar Risco de Data Loss

**Severidade:** MEDIUM
**Categoria:** Riscos / Transparência
**Linhas no Documento:** 629-636

**Problema:**
A tabela de riscos não menciona explicitamente o risco de perda de dados por conflito de sincronização.

**Tabela Atual:**
```markdown
| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| CoreData quebra compatibilidade | Baixa | Alto | Não modificar estrutura CoreData |
| Sync conflitos | Média | Médio | Estratégia "last write wins" + timestamp |
...
```

**Solução Recomendada:**
```markdown
| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| CoreData quebra compatibilidade | Baixa | Alto | Não modificar estrutura CoreData |
| Sync conflitos | Média | Médio | Estratégia "last write wins" + timestamp |
| **Data loss por conflito** | **Média** | **Alto** | **Version vector + conflict detection + manual resolution UI** |
| Auth downtime | Baixa | Alto | Fallback offline com dados locais |
| Custo Supabase | Baixa | Médio | Plano gratuito generoso, monitorar uso |
| Latência sync | Média | Baixo | Background sync assíncrono |
```

**Validação:**
- [ ] Risco de Data Loss adicionado
- [ ] Probabilidade e Impacto corretos
- [ ] Mitigação atualizada com soluções do FIX-003

---

## 💡 NICE TO HAVE (Sugestões — Opcional)

### SUGGESTION-001: Conflict Resolution UI

**Benefício:**
Melhorar UX permitindo usuários resolverem conflitos manualmente.

**Implementação:**
- Modal com diff das duas versões
- Botões: "Manter minha versão" / "Usar versão do servidor" / "Mesclar"
- Log de conflitos para auditoria

**Prioridade:** Baixa
**Esforga:** M (Medium)

---

### SUGGESTION-002: Audit Log para Transcrições

**Benefício:**
Rastreabilidade de alterações, útil para debugging e recuperação.

**Implementação:**
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Prioridade:** Baixa
**Esforga:** S (Small)

---

## ✅ Checklist de Aprovação

Antes de prosseguir com implementação:

### MUST FIX
- [ ] FIX-001: Service Role Key removida do server.js
- [ ] FIX-002: SQL Injection mitigado no search endpoint
- [ ] FIX-003: Conflito Resolution implementado

### SHOULD FIX
- [ ] FIX-004: Documentação de local_id NULL
- [ ] FIX-005: Testes unitários para timestamp conversion
- [ ] FIX-006: Risco de Data Loss adicionado

### Validação Final
- [ ] @architect revisou e aprovou ajustes
- [ ] @qa re-validou documento
- [ ] Documento atualizado em `docs/architecture/`
- [ ] Stories criadas pelo @sm

---

## 📚 Referências

- **Documento Original:** `docs/architecture/audioflow-web-supabase-architecture.md`
- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
- **Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security
- **Conflict Resolution Patterns:** https://martinfowler.com/articles/patterns-of-distributed-systems/single-entry-consensus.html

---

**Quinn, guardião da qualidade 🛡️**
*QA Review completed at 2026-03-14*
