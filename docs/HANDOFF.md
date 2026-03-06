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

### Stories Concluídas ✅ (11/14)

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
| 4.2 | Busca no histórico | SearchPanelController.swift |
| 6.1 | Testes unitários | Tests/ClipboardServiceTests.swift (27 tests) |

### Stories Pendentes ⬜ (3/14)

| Story | Título | Prioridade |
|-------|--------|------------|
| 5.1 | Export TXT | COULD |
| 5.2 | Notificações e feedback | COULD |
| 6.2 | Testes integração/perf | MUST |

---

## Estrutura de Arquivos

```
AudioFlow/
├── Package.swift
├── Sources/
│   ├── AppDelegate.swift           # Entry point + integração
│   ├── AppState.swift              # IDLE, RECORDING, PROCESSING
│   ├── AudioController.swift       # AVAudioEngine
│   ├── ClipboardService.swift      # NSPasteboard
│   ├── Controllers/
│   │   ├── HistoryController.swift     # FIFO 10 itens
│   │   └── SearchPanelController.swift # Busca UI
│   ├── HotkeyController.swift      # NSEvent global monitor
│   ├── Info.plist                  # LSUIElement, permissões
│   ├── MenuBuilder.swift           # Menus por estado + histórico
│   ├── PersistenceService.swift    # CoreData
│   ├── SpeechService.swift         # SFSpeechRecognizer pt-BR
│   └── Transcription.swift         # NSManagedObject
├── Tests/
│   └── ClipboardServiceTests.swift # 27 unit tests
└── .build/
```

---

## Git Status

```
Branch: main
Commits não pushed: 1 (5f42a87)
```

---

## Testes

```
✔ 27 testes passando
- ClipboardLogicTests: 7 tests
- TranscriptionModelTests: 5 tests
- HistoryFIFOTests: 7 tests
- AppStateTests: 5 tests
- NotificationTests: 3 tests
```

---

## Como Continuar

### Opção 1: Fazer push do commit
```
/aios-devops *push
```

### Opção 2: Desenvolver próxima story
```
/aios-dev *develop 5.1   # Export TXT (COULD)
/aios-dev *develop 6.2   # Testes integração (MUST)
```

### Opção 3: Ver status
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
Tests: 27 passing ✅
```

---

## Próximas Ações Recomendadas

1. **Commit** — Criar commit para Story 6.1
2. **Push** — Enviar commits para remoto (`/aios-devops *push`)
3. **Story 6.2** — Implementar testes de integração (MUST)
4. **Story 5.1** — Export TXT (opcional)

---

*Handoff gerado em 2026-03-06*