# Backup e Recovery - AudioFlow

**Documento:** Disaster Recovery (DR)
**Versão:** 1.0
**Data:** 2026-03-15
**Responsável:** Equipe AudioFlow

---

## 1. Visão Geral

O AudioFlow utiliza o **Supabase** como backend de dados em nuvem, aproveitando sua infraestrutura gerenciada para backups automatizados.

### Arquitetura de Dados

| Componente | Tipo | Backup Automático |
|------------|------|-------------------|
| PostgreSQL (Supabase) | Cloud | ✅ Sim |
| SQLite Local | Client-side | ❌ Não (responsabilidade do usuário) |

---

## 2. Backup Automático Supabase

### Como Funciona

O Supabase realiza backups automáticos do banco PostgreSQL:

| Tipo | Frequência | Retenção |
|------|------------|----------|
| **Full Backup** | Diário | 7 dias |
| **Point-in-Time Recovery (PITR)** | Contínuo | 7 dias (Pro) |

### Cobertura

Todas as tabelas do AudioFlow são incluídas automaticamente:
- `profiles` - Perfis de usuário
- `transcriptions` - Transcrições sincronizadas
- `tags` - Tags personalizadas
- `sync_conflicts` - Registro de conflitos

### Verificar Status do Backup

1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard
2. Selecione o projeto `khkqkqxhfnhtnlmtzvbq`
3. Navegue para **Database** → **Backups**
4. Verifique a lista de backups disponíveis

---

## 3. Procedimento de Restore

### 3.1 Restore Completo (via Dashboard)

**Quando usar:** Recuperação de desastre total.

1. Acesse o Dashboard do Supabase
2. Vá para **Database** → **Backups**
3. Selecione o backup desejado
4. Clique em **Restore**
5. Confirme a operação
6. Aguarde a conclusão (pode levar vários minutos)

**⚠️ Aviso:** Restore completo sobrescreve todos os dados atuais.

### 3.2 Point-in-Time Recovery (PITR)

**Quando usar:** Recuperação para um momento específico.

**Disponível apenas no plano Pro do Supabase.**

1. Acesse **Database** → **Backups** → **PITR**
2. Selecione data e hora alvo
3. Clique em **Restore to timestamp**
4. Confirme a operação

### 3.3 Restore de Tabela Específica

**Quando usar:** Apenas uma tabela precisa ser recuperada.

```sql
-- 1. Criar tabela temporária com dados do backup
CREATE TABLE transcriptions_restore AS
SELECT * FROM transcriptions;

-- 2. Verificar dados
SELECT COUNT(*) FROM transcriptions_restore;

-- 3. Se correto, substituir tabela original
DROP TABLE transcriptions;
ALTER TABLE transcriptions_restore RENAME TO transcriptions;

-- 4. Recriar índices e policies
-- (executar migrations novamente)
```

---

## 4. RPO e RTO

### Recovery Point Objective (RPO)

| Cenário | RPO |
|---------|-----|
| Backup diário | Até 24 horas |
| PITR (Pro) | Até 1 minuto |

### Recovery Time Objective (RTO)

| Operação | RTO Estimado |
|----------|--------------|
| Restore via Dashboard | 5-30 minutos |
| PITR Restore | 10-60 minutos |
| Restore manual SQL | 1-4 horas |

---

## 5. Backup Local (SQLite)

### Responsabilidade do Usuário

O banco SQLite local fica em:
- **macOS:** `~/Library/Application Support/AudioFlow/`

### Recomendações de Backup

```bash
# Backup manual
cp ~/Library/Application\ Support/AudioFlow/transcriptions.db \
   ~/Backups/transcriptions_$(date +%Y%m%d).db

# Backup automático (adicionar ao crontab)
# 0 2 * * * cp ~/Library/Application\ Support/AudioFlow/transcriptions.db ~/Backups/transcriptions_$(date +\%Y\%m\%d).db
```

---

## 6. Plano de Contingência

### Cenário 1: Dados Corrompidos no Cloud

1. Verificar se o problema afeta todos os usuários
2. Entrar em contato com Suporte Supabase
3. Avaliar necessidade de restore
4. Comunicar usuários sobre possível perda de dados

### Cenário 2: Indisponibilidade do Supabase

1. Verificar status: https://status.supabase.com
2. App continua funcionando em modo local
3. Sync será retomado quando serviço voltar
4. Monitorar automaticamente via health check

### Cenário 3: Perda de Dados por Bug

1. Identificar o bug e corrigir
2. Avaliar extensão da perda
3. Usar PITR se disponível
4. Notificar usuários afetados

---

## 7. Contatos de Emergência

| Recurso | Contato |
|---------|---------|
| Supabase Status | https://status.supabase.com |
| Supabase Support | support@supabase.com |
| Documentação | https://supabase.com/docs |

---

## 8. Checklist de Verificação Mensal

- [ ] Verificar backups recentes no Dashboard
- [ ] Testar restore em ambiente de staging
- [ ] Revisar alertas de storage
- [ ] Verificar RPO/RTO ainda atendem requisitos
- [ ] Atualizar contatos de emergência

---

## 9. Histórico de Revisões

| Data | Versão | Alteração |
|------|--------|-----------|
| 2026-03-15 | 1.0 | Criação inicial |

---

**Próxima revisão:** 2026-04-15