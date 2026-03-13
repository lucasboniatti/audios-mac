# EPIC-001: AudioFlow — Menu Bar App para Transcrição de Áudio

**Status:** Draft  
**Created:** 2026-03-05  
**Owner:** @pm (Morgan)  
**Priority:** HIGH  

---

## Overview

### Problem Statement
Usuários macOS precisam transcrever áudio rapidamente para texto, mas soluções existentes requerem abrir aplicativos específicos, múltiplos passos para copiar o texto e interfaces que interrompem o fluxo de trabalho.

### Solution
**AudioFlow** é um menu bar app que captura áudio via hotkey global, transcreve usando Speech Recognition nativo do macOS (pt-BR) e copia automaticamente para o clipboard.

### Target Users
- Usuários macOS que precisam de ditado rápido para documentação
- Pessoas que querem transcrever mensagens de voz
- Profissionais que fazem notas de voz para texto

---

## Business Value

| Metric | Target |
|--------|--------|
| Time to transcribe | < 5 segundos para textos curtos |
| User friction | Zero - apenas 1 hotkey |
| Adoption goal | Uso diário pelo owner |

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Language | Swift 5.9+ |
| Framework | AppKit |
| Speech | SFSpeechRecognizer (pt-BR) |
| Audio | AVAudioEngine |
| Persistence | CoreData |
| Clipboard | NSPasteboard |
| Target | macOS 12.0+ |

---

## Scope

### In Scope (v1.0)
- ✅ Hotkey global (Space toggle)
- ✅ Transcrição em pt-BR
- ✅ Clipboard automático
- ✅ Histórico (10 transcrições)
- ✅ Busca no histórico
- ✅ Export TXT
- ✅ Menu bar app (sem janela)

### Out of Scope
- ❌ Multi-idioma
- ❌ Atalhos customizáveis
- ❌ Cloud sync (iCloud)
- ❌ Edição de transcrições
- ❌ Persistência de áudio
- ❌ Suporte Windows/Linux

---

## Stories Summary

| Phase | Story ID | Title | Priority | Effort | Status |
|-------|----------|-------|----------|--------|--------|
| **1** | 1.1 | Criar projeto Xcode | MUST | S | ⬜ Todo |
| **1** | 1.2 | Configurar CoreData | MUST | S | ⬜ Todo |
| **2** | 2.1 | Menu bar status item | MUST | S | ⬜ Todo |
| **2** | 2.2 | Estados do app | MUST | M | ⬜ Todo |
| **3** | 3.1 | Global hotkey | MUST | M | ⬜ Todo |
| **3** | 3.2 | Captura de áudio | MUST | M | ⬜ Todo |
| **3** | 3.3 | Transcrição Speech | MUST | M | ⬜ Todo |
| **3** | 3.4 | Clipboard automático | MUST | S | ⬜ Todo |
| **4** | 4.1 | Histórico de transcrições | SHOULD | M | ⬜ Todo |
| **4** | 4.2 | Busca no histórico | SHOULD | S | ⬜ Todo |
| **5** | 5.1 | Export TXT | COULD | S | ⬜ Todo |
| **5** | 5.2 | Notificações e feedback | COULD | S | ⬜ Todo |
| **6** | 6.1 | Testes unitários | MUST | M | ⬜ Todo |
| **6** | 6.2 | Testes integração/perf | MUST | M | ⬜ Todo |

**Total Stories:** 14  
**Estimated Effort:** 24-38 horas

---

## Acceptance Criteria (Epic Level)

- [ ] App aparece no menu bar ao iniciar
- [ ] Space toggle inicia/para gravação
- [ ] Texto transcrito vai automaticamente para clipboard
- [ ] Histórico mostra últimas 10 transcrições
- [ ] Busca funciona em tempo real
- [ ] Export gera arquivo TXT válido
- [ ] Performance < 500ms latência
- [ ] Memória < 100MB em idle
- [ ] Cobertura de testes > 70%

---

## Dependencies

### Framework Dependencies
- AppKit (NSStatusItem, NSMenu, NSPasteboard)
- Speech (SFSpeechRecognizer)
- AVFoundation (AVAudioEngine)
- CoreData (NSPersistentContainer)

### External Dependencies
- None (zero dependências externas)

### Permissions Required
- `NSMicrophoneUsageDescription`
- `NSSpeechRecognitionUsageDescription`

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Fn key não detectável | Alta | Médio | Space toggle como primary |
| Permissões negadas | Média | Alto | Alert com instrução |
| Speech offline | Baixa | Médio | Indicador de processamento |
| Crash durante gravação | Baixa | Médio | Auto-save incremental |

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hotkey primary | Space toggle | Fn key é hardware-level, Space é mais confiável |
| UI Framework | AppKit | SwiftUI não suporta menu bar apps sem janela |
| Persistence | CoreData | Nativo, simples, sem dependências |
| No Carbon API | NSEvent | Carbon é legacy, NSEvent é moderno |

---

## Definition of Done

- [ ] Todas as stories MUST implementadas
- [ ] Testes unitários passando (>70% cobertura)
- [ ] Testes de performance passando
- [ ] Code review aprovado
- [ ] App compila sem warnings
- [ ] NFRs validados (<500ms, <100MB)
- [ ] Documentação atualizada

---

## References

- `docs/prd/requirements.json`
- `docs/prd/spec.md`
- `docs/prd/implementation.yaml`
- `docs/prd/research.json`
- `docs/prd/complexity.json`
- `docs/prd/critique.json`

---

## Progress

**Started:** -  
**Completed:** -  
**Progress:** 0/14 stories (0%)

---

*Created by @pm (Morgan) via AIOS*
