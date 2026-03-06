# AudioFlow — Handoff Document

**Data:** 2026-03-19
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

### Stories Concluídas ✅

| Story | Título | Arquivos |
|-------|--------|----------|
| 1.1 | Criar projeto Xcode | Package.swift, AppDelegate.swift |
| 1.2 | Configurar CoreData | PersistenceService.swift, Transcription.swift |
| 2.1 | Menu bar status item | MenuBuilder.swift |
| 2.2 | Estados do app | AppState.swift |
| 3.1 | Global hotkey | HotkeyController.swift |
| 3.2 | Captura de áudio | AudioController.swift |
| 3.3 | Transcrição Speech | SpeechService.swift |
| 3.4 | Clipboard automático | ClipboardService.swift |
| 4.1 | Histórico de transcrições | HistoryController.swift |

### Stories Pendentes ⬜

| Story | Título | Prioridade |
|-------|--------|------------|
| 4.2 | Busca no histórico | SHOULD |
| 5.1 | Export TXT | COULD |
| 5.2 | Notificações e feedback | COULD |
| 6.1 | Testes unitários | MUST |
| 6.2 | Testes integração/perf | MUST |

---

## Estrutura de Arquivos

```
AudioFlow/
├── Package.swift
├── Sources/
│   ├── AppDelegate.swift      # Entry point + integração
│   ├── AppState.swift         # IDLE, RECORDING, PROCESSING
│   ├── AudioController.swift  # AVAudioEngine
│   ├── ClipboardService.swift # NSPasteboard
│   ├── Controllers/
│   │   └── HistoryController.swift # FIFO 10 itens
│   ├── HotkeyController.swift # NSEvent global monitor
│   ├── Info.plist            # LSUIElement, permissões
│   ├── MenuBuilder.swift     # Menus por estado + histórico
│   ├── PersistenceService.swift # CoreData
│   ├── SpeechService.swift   # SFSpeechRecognizer pt-BR
│   └── Transcription.swift   # NSManagedObject
└── .build/
```

---

## Como Continuar

### Para desenvolver a próxima story:
```
/aios-dev *develop 4.2
```

### Para fazer commit:
```
/aios-devops *push
```

### Para ver status:
```
/aios-master *status
```

---

## Documentação do Projeto

- `docs/prd/requirements.json` — Requisitos
- `docs/prd/spec.md` — Especificação técnica
- `docs/prd/implementation.yaml` — Plano de implementação
- `docs/epics/EPIC-001-AudioFlow.md` — Epic principal
- `docs/stories/*.story.md` — Stories individuais

---

## Build Status

```
Build complete! ✅ No warnings!
```

---

## Próximas Ações Recomendadas

1. **Story 4.2** — Implementar busca no histórico
2. **Story 5.1** — Export TXT
3. **Commit** das alterações com @devops

---

*Handoff gerado em 2026-03-19*