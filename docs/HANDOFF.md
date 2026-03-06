# AudioFlow — Handoff Document

**Data:** 2026-03-06
**De:** Chat atual
**Para:** Próximo chat

---

## Visão Geral do Projeto

**AudioFlow** é um menu bar app para macOS que transcreve áudio em tempo real usando Speech Recognition nativo (pt-BR) e copia automaticamente para o clipboard.

### Stack
- **Linguagem:** Swift 5.9+
- **Framework:** AppKit (não SwiftUI)
- **Target:** macOS 12.0+
- **Sem dependências externas**

---

## Progresso Atual

### Stories Concluídas ✅ (13/14)

| Story | Título | Status |
|-------|--------|--------|
| 1.1 | Criar projeto Xcode | ✅ |
| 1.2 | Configurar CoreData | ✅ |
| 2.1 | Menu bar status item | ✅ |
| 2.2 | Estados do app | ✅ |
| 3.1 | Global hotkey | ✅ |
| 3.2 | Captura de áudio | ✅ |
| 3.3 | Transcrição Speech | ✅ |
| 3.4 | Clipboard automático | ✅ |
| 4.1 | Histórico de transcrições | ✅ |
| 4.2 | Busca no histórico | ✅ |
| 5.1 | Export TXT | ✅ |
| 5.2 | Notificações e feedback | ✅ |
| 6.1 | Testes unitários | ✅ |

### Stories Pendentes ⬜ (1/14)

| Story | Título | Prioridade |
|-------|--------|------------|
| 6.2 | Testes integração/perf | MUST |

---

## Funcionalidades

- **Gravação**: Space para iniciar/parar
- **Transcrição**: Speech Recognition pt-BR
- **Clipboard**: Cópia automática
- **Histórico**: Últimas 10 transcrições (FIFO)
- **Busca**: Painel de busca no histórico
- **Export**: Exportar histórico para TXT
- **Feedback**:
  - Notificação "Texto copiado"
  - Ícone animado vermelho durante gravação
  - Som ao iniciar/parar gravação

---

## Git Status

```
Branch: main
Commits: Sincronizado
```

---

## Testes

```
✔ 27 testes passando
```

---

## Próxima Ação

```
/aios-dev *develop 6.2   # Testes integração (MUST - última story!)
```

---

*Handoff gerado em 2026-03-06*