# AudioFlow — Especificação Técnica v1.0

**Data:** 2026-03-05  
**Status:** Draft  
**Versão:** 1.0.0

---

## 1. Visão do Produto

### 1.1 Problema

Usuários macOS precisam transcrever áudio rapidamente para texto, mas soluções existentes requerem:
- Abrir aplicativos específicos
- Múltiplos passos para copiar o texto
- Interfaces que interrompem o fluxo de trabalho

### 1.2 Solução

**AudioFlow** é um menu bar app que:
- Captura áudio via hotkey global (Fn + Espaço)
- Transcreve usando Speech Recognition nativo do macOS (pt-BR)
- Copia automaticamente para o clipboard
- Mantém histórico das últimas 10 transcrições

### 1.3 Público-Alvo

Usuários macOS que precisam de:
- Ditado rápido para documentação
- Transcrição de mensagens
- Notas de voz para texto

---

## 2. Requisitos Funcionais

### FR-001: Captura de Áudio via Hotkey

| Atributo | Valor |
|----------|-------|
| **Descrição** | Capturar áudio do microfone quando o usuário pressionar o hotkey |
| **Trigger** | Fn + Espaço (toggle: inicia/para) |
| **Feedback** | Indicador visual no menu bar durante gravação |
| **Prioridade** | MUST |

**Comportamento:**
1. Primeira pressão → Inicia gravação (ícone muda para indicar gravação ativa)
2. Segunda pressão → Para gravação e inicia transcrição

**Rastreabilidade:** US-001, US-002, AC-002, AC-003

---

### FR-002: Transcrição Nativa macOS

| Atributo | Valor |
|----------|-------|
| **Descrição** | Usar Speech Recognition framework nativo do macOS |
| **Idioma** | pt-BR (Português Brasileiro) |
| **Latência** | < 500ms para iniciar |
| **Prioridade** | MUST |

**APIs:**
- `SFSpeechRecognizer` com `Locale(identifier: "pt_BR")`
- `SFSpeechAudioBufferRecognitionRequest`
- `AVAudioEngine` para captura de áudio

**Permissões requeridas:**
- `NSMicrophoneUsageDescription`
- `NSSpeechRecognitionUsageDescription`

**Rastreabilidade:** US-001, US-002, AC-003, CON-001, CON-004

---

### FR-003: Clipboard Automático

| Atributo | Valor |
|----------|-------|
| **Descrição** | Copiar transcrição automaticamente para o clipboard |
| **Timing** | Imediatamente após transcrição completar |
| **Disponibilidade** | Cmd+V funciona em qualquer app |
| **Prioridade** | MUST |

**Implementação:**
```swift
NSPasteboard.general.clearContents()
NSPasteboard.general.setString(text, forType: .string)
```

**Rastreabilidade:** US-003, AC-004

---

### FR-004: Histórico de Transcrições

| Atributo | Valor |
|----------|-------|
| **Descrição** | Manter as 10 últimas transcrições acessíveis |
| **Retenção** | 10 itens (FIFO) |
| **Armazenamento** | Local (CoreData/SQLite) |
| **Prioridade** | SHOULD |

**Modelo de dados:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `text` | String | Texto transcrito |
| `timestamp` | Date | Data/hora da transcrição |

**Rastreabilidade:** US-004, AC-005

---

### FR-005: Busca no Histórico

| Atributo | Valor |
|----------|-------|
| **Descrição** | Permitir busca textual no histórico |
| **Escopo** | Texto completo das transcrições |
| **Feedback** | Tempo real (enquanto digita) |
| **Prioridade** | SHOULD |

**Rastreabilidade:** US-005, AC-006

---

### FR-006: Export de Transcrições

| Atributo | Valor |
|----------|-------|
| **Descrição** | Exportar histórico em formato TXT |
| **Formato** | Uma transcrição por linha com timestamp |
| **Destino** | Escolha do usuário (save panel) |
| **Prioridade** | COULD |

**Formato do arquivo:**
```
[2026-03-05 14:30:00] Primeira transcrição...
[2026-03-05 14:35:00] Segunda transcrição...
```

**Rastreabilidade:** US-006, AC-007

---

### FR-007: Menu Bar App

| Atributo | Valor |
|----------|-------|
| **Descrição** | Rodar exclusivamente em background |
| **Interface** | Apenas menu dropdown (sem janela principal) |
| **Ícone** | Microfone (SF Symbol: mic.fill) |
| **Prioridade** | MUST |

**Menu structure:**
```
🎤 AudioFlow
├── 🔴 Gravando... (quando ativo)
├── ───────────────
├── 📋 Histórico
│   ├── [Últimas 10 transcrições]
├── 🔍 Buscar...
├── ───────────────
├── 📤 Exportar TXT
├── ⚙️ Preferências
└── ❌ Sair
```

**Rastreabilidade:** US-001, AC-001

---

## 3. Requisitos Não-Funcionais

### NFR-001: Performance

| Métrica | Valor |
|---------|-------|
| Latência de início | < 500ms após hotkey |
| Latência de transcrição | Tempo real (partial results) |

### NFR-002: Memória

| Métrica | Valor |
|---------|-------|
| RAM em idle | < 100MB |
| RAM gravando | < 150MB |

### NFR-003: Confiabilidade

- Transcrições salvas incrementalmente
- Não perder dados em caso de crash
- Auto-save a cada 5 segundos durante gravação

### NFR-004: Privacidade

| Dado | Retenção |
|------|----------|
| Áudio | 0s (descartado imediatamente) |
| Texto | 10 transcrições (local apenas) |

---

## 4. Stack Tecnológica

### 4.1 Decisões Arquiteturais

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Linguagem | Swift 5.9+ | Nativo Apple, melhor integração |
| UI Framework | AppKit | SwiftUI não suporta menu bar apps sem janela |
| Arquitetura | MVC simples | Escopo reduzido, sem necessidade de VIPER/Clean |
| Mínimo macOS | 12.0 (Monterey) | SFSpeechRecorder suporte completo |

### 4.2 Frameworks

| Framework | Uso |
|-----------|-----|
| AppKit | NSStatusItem, NSMenu, NSPasteboard |
| Speech | SFSpeechRecognizer, SFSpeechAudioBufferRecognitionRequest |
| AVFoundation | AVAudioEngine (captura de áudio) |
| CoreData | NSPersistentContainer (persistência) |
| Carbon | RegisterEventHotKey (hotkey global) |

### 4.3 Estrutura do Projeto

```
AudioFlow/
├── App/
│   ├── AppDelegate.swift          # Entry point, menu bar setup
│   └── Info.plist                 # Permissões
├── Controllers/
│   ├── AudioController.swift      # Gravação e transcrição
│   ├── HotkeyController.swift     # Global hotkey
│   └── HistoryController.swift    # Histórico e busca
├── Models/
│   ├── Transcription.swift        # CoreData entity
│   └── AppState.swift             # Estado da aplicação
├── Views/
│   └── MenuBuilder.swift          # Construção do NSMenu
├── Services/
│   ├── SpeechService.swift        # SFSpeechRecognizer wrapper
│   ├── ClipboardService.swift     # NSPasteboard wrapper
│   └── PersistenceService.swift   # CoreData stack
├── Resources/
│   └── AudioFlow.xcdatamodeld     # CoreData model
└── Supporting/
    └── Bridging-Header.h          # Carbon API
```

---

## 5. Fluxo de Dados

### 5.1 Fluxo Principal (Gravação → Clipboard)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Hotkey    │────▶│ AudioEngine  │────▶│ SpeechRecognizer │
│  (Fn+Space) │     │  (captura)   │     │   (transcrição)  │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                                                   ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Clipboard  │◀────│   Texto      │◀────│ Partial Results  │
│  (Cmd+V)    │     │  finalizado  │     │   (real-time)    │
└─────────────┘     └──────────────┘     └─────────────────┘
       │
       ▼
┌─────────────┐
│  Histórico  │
│  (CoreData) │
└─────────────┘
```

### 5.2 Estados da Aplicação

```
┌───────────┐    Fn+Space    ┌───────────┐    Fn+Space    ┌───────────┐
│   IDLE    │───────────────▶│ RECORDING │───────────────▶│PROCESSING │
└───────────┘                └───────────┘                └─────┬─────┘
     ▲                                                         │
     │                        Transcrição completa             │
     └─────────────────────────────────────────────────────────┘
```

---

## 6. Interface do Usuário

### 6.1 Menu Bar

**Estado IDLE:**
```
🎤 AudioFlow ▼
├── Gravar (Fn+Espaço)
├── ───────────────
├── 📋 Histórico
│   ├── "Texto da transcrição 1..."
│   ├── "Texto da transcrição 2..."
│   └── Ver mais...
├── 🔍 Buscar...
├── ───────────────
├── 📤 Exportar TXT
└── ❌ Sair
```

**Estado RECORDING:**
```
🔴 Gravando... ▼
├── ⏹ Parar gravação (Espaço)
├── ───────────────
├── "Texto sendo transcrito em tempo real..."
└── ❌ Cancelar
```

### 6.2 Notificações

| Evento | Notificação |
|--------|-------------|
| Gravação iniciada | Nenhuma (apenas ícone muda) |
| Gravação finalizada | "Texto copiado para o clipboard" |
| Erro de permissão | Alert com instrução |

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Fn key não detectável | Alta | Médio | Fallback para Space toggle |
| Permissões negadas | Média | Alto | Alert com instrução clara |
| Transcrição imprecisa | Baixa | Baixo | Aceito como limitação |
| Crash do app | Baixa | Médio | Auto-save incremental |

---

## 8. Out of Scope (v1.0)

- Multi-idioma
- Atalhos customizáveis
- Cloud sync (iCloud)
- Edição de transcrições
- Persistência de áudio
- Integração com outros apps
- Suporte Windows/Linux

---

## 9. Rastreabilidade

### Matriz de Rastreabilidade

| Requisito | User Story | AC | Constraint |
|-----------|------------|----| -----------|
| FR-001 | US-001, US-002 | AC-002, AC-003 | CON-003 |
| FR-002 | US-001, US-002 | AC-003 | CON-001, CON-004 |
| FR-003 | US-003 | AC-004 | - |
| FR-004 | US-004 | AC-005 | - |
| FR-005 | US-005 | AC-006 | - |
| FR-006 | US-006 | AC-007 | - |
| FR-007 | US-001 | AC-001 | CON-002 |

---

## 10. Aprovação

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| Product Manager | - | - | - |
| Tech Lead | - | - | - |
| Stakeholder | - | - | - |

---

**Documento gerado por:** AIOS @pm (Morgan)  
**Fontes:** requirements.json, complexity.json, research.json
