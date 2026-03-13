# QA FIX REQUEST — AudioFlow

**Story:** 2.2  
**Date:** 2026-03-05  
**QA Agent:** @qa (Quinn)  
**Severity:** MEDIUM  

---

## Issues Found

### Issue 1: Warnings de Resultado Não Usado

**Arquivo:** `Sources/AppDelegate.swift`  
**Linhas:** 98, 101, 105  
**Severidade:** MEDIUM  

**Descrição:**
Três warnings de "result of call is unused" nos métodos de transição de estado.

**Código Atual:**
```swift
case .idle:
    stateManager.startRecording()  // ⚠️ warning

case .recording:
    stateManager.stopRecording(partialText: "")  // ⚠️ warning
```

**Solução:**
```swift
case .idle:
    _ = stateManager.startRecording()

case .recording:
    _ = stateManager.stopRecording(partialText: "")
```

---

### Issue 2: Info.plist Ausente

**Arquivo:** N/A  
**Severidade:** MEDIUM  

**Descrição:**
O app não tem Info.plist configurado com `LSUIElement = true`, fazendo com que apareça no Dock. Um menu bar app não deve aparecer no Dock.

**Solução:**
Criar arquivo `Sources/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>AudioFlow</string>
    <key>CFBundleDisplayName</key>
    <string>AudioFlow</string>
    <key>CFBundleIdentifier</key>
    <string>com.audioflow.app</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>12.0</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSMicrophoneUsageDescription</key>
    <string>AudioFlow precisa de acesso ao microfone para transcrever sua voz</string>
    <key>NSSpeechRecognitionUsageDescription</key>
    <string>AudioFlow precisa de acesso ao reconhecimento de voz para transcrever áudio</string>
    <key>NSPrincipalClass</key>
    <string>NSApplication</string>
</dict>
</plist>
```

---

## Checklist para @dev

- [ ] Corrigir warning linha 98 - `_ = stateManager.startRecording()`
- [ ] Corrigir warning linha 101 - `_ = stateManager.stopRecording(...)`
- [ ] Corrigir warning linha 105 - `_ = self?.stateManager.completeProcessing()`
- [ ] Criar Info.plist com LSUIElement = true
- [ ] Verificar que build não tem warnings

---

## Verification Steps

Após correção:

```bash
swift build 2>&1 | grep -i warning
# Deve retornar vazio
```

---

**Assignee:** @dev (Dex)  
**Due:** Antes de Story 3.1  

