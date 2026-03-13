import Cocoa
import Combine
import Speech

class AppDelegate: NSObject, NSApplicationDelegate {

    // MARK: - Properties
    private var statusItem: NSStatusItem?
    private let stateManager = AppStateManager()
    private var cancellables = Set<AnyCancellable>()
    private var hotkeyController: HotkeyController?
    private let audioController = AudioController()
    private let speechService = SpeechService()
    private let autoPasteService = AutoPasteService()
    private let notificationService = NotificationService()
    private let transcriptionCommitCoordinator = TranscriptionCommitCoordinator()
    private var currentTranscription = ""
    private var pasteTargetApplication: NSRunningApplication?
    private let recordingAccentColor = NSColor(
        srgbRed: 0,
        green: 122.0 / 255.0,
        blue: 1,
        alpha: 1
    )

    // Debug file
    private static let debugLogPath = "/tmp/audioflow_debug.log"

    // Animation
    private var animationTimer: Timer?
    private var animationFrame: Int = 0
    // Processing timeout
    private var processingTimeoutTimer: Timer?

    // MARK: - Lifecycle

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        logDebug("Application did finish launching")
        setupStatusBar()
        setupStateObserver()
        setupHotkey()
        setupSpeechService()
        setupAudioObserver()
        logDebug("AudioFlow setup complete")
        print("AudioFlow started - Menu bar icon active")
        print("Press \(HotkeyConfiguration.displayName) to start/stop recording")
    }

    private func logDebug(_ message: String) {
        let timestamp = ISO8601DateFormatter().string(from: Date())
        let logMessage = "[\(timestamp)] \(message)\n"
        NSLog("%@", "[AudioFlow] \(message)")
        print(logMessage, terminator: "")
        fflush(stdout)
        
        // Also write to file
        let filePath = Self.debugLogPath
        if let data = logMessage.data(using: .utf8) {
            if FileManager.default.fileExists(atPath: filePath) {
                let handle = try! FileHandle(forWritingTo: URL(fileURLWithPath: filePath))
                handle.seekToEndOfFile()
                handle.write(data)
                handle.closeFile()
            } else {
                try? logMessage.write(toFile: filePath, atomically: true, encoding: .utf8)
            }
        }
    }

    func applicationWillTerminate(_ aNotification: Notification) {
        hotkeyController?.stop()
        audioController.stopRecording()
        speechService.stopRecognition()
        print("AudioFlow terminated")
    }

    func applicationSupportsSecureRestorableState(_ app: NSApplication) -> Bool {
        return true
    }

    // MARK: - Status Bar Setup

    private func setupStatusBar() {
        logDebug("Setting up status bar...")
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

        guard let button = statusItem?.button else {
            logDebug("ERROR: Status item button could not be created")
            return
        }

        button.action = #selector(toggleRecording)
        button.target = self
        statusItem?.menu = MenuBuilder.buildMenu(for: stateManager.state, target: self)
        updateIcon(for: stateManager.state)
        logDebug("Status item created successfully")
    }

    // MARK: - State Observer

    private func setupStateObserver() {
        stateManager.$state
            .receive(on: DispatchQueue.main)
            .sink { [weak self] newState in
                self?.handleStateChange(newState)
            }
            .store(in: &cancellables)
    }

    private func handleStateChange(_ state: AppState) {
        logDebug("handleStateChange: \(state)")
        
        // Update icon
        updateIcon(for: state)

        // Update menu
        statusItem?.menu = MenuBuilder.buildMenu(for: state, target: self)

        // Handle audio recording based on state
        handleAudioStateChange(state)

        logDebug("UI updated for state: \(state.description)")
    }

    // MARK: - Hotkey Setup

    private func setupHotkey() {
        hotkeyController = HotkeyController { [weak self] in
            self?.toggleRecording()
        }
        hotkeyController?.start()
    }

    // MARK: - Speech Service Setup

    private func setupSpeechService() {
        speechService.delegate = self

        // Request authorization
        speechService.requestAuthorization { [weak self] authorized in
            if !authorized {
                self?.showSpeechAuthorizationError()
            }
        }
    }

    private func setupAudioObserver() {
        // Listen for audio buffers from AudioController
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAudioBuffer(_:)),
            name: .audioBufferAvailable,
            object: nil
        )
    }

    @objc private func handleAudioBuffer(_ notification: Notification) {
        guard let buffer = notification.userInfo?["buffer"] as? AVAudioPCMBuffer else { return }
        speechService.appendAudioBuffer(buffer)
    }

    // MARK: - Audio State Management

    private func handleAudioStateChange(_ state: AppState) {
        logDebug("handleAudioStateChange: \(state)")
        
        switch state {
        case .recording:
            capturePasteTargetApplication()
            currentTranscription = ""
            transcriptionCommitCoordinator.beginSession()
            do {
                // Start speech recognition
                try speechService.startRecognition()
                // Start audio capture
                try audioController.startRecording()
                // Play start sound
                playSound(.start)
                logDebug("Recording started")
            } catch {
                logDebug("Failed to start recording: \(error)")
                showAudioError(error)
                _ = stateManager.transition(to: .idle)
            }

        case .idle:
            audioController.stopRecording()
            speechService.stopRecognition()
            // Play stop sound
            playSound(.stop)
            logDebug("Recording stopped")

        case .processing:
            audioController.stopRecording()
            speechService.forceEndAudio()
            
            logDebug("Processing - waiting for final result")
            
            // Timeout - if no result after 3 seconds, use partial
            processingTimeoutTimer?.invalidate()
            processingTimeoutTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: false) { [weak self] _ in
                guard let self = self else { return }
                if let text = self.transcriptionCommitCoordinator.commitFromTimeout() {
                    self.commitProcessedTranscription(text, source: "timeout")
                } else {
                    self.logDebug("Timeout reached with no transcription to commit")
                    self.completeProcessingIfNeeded()
                }
            }
        }
    }
    
    private func commitProcessedTranscription(_ text: String, source: String) {
        // Cancel timeout
        processingTimeoutTimer?.invalidate()
        processingTimeoutTimer = nil

        let normalizedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedText.isEmpty else {
            logDebug("Ignoring empty transcription from \(source)")
            completeProcessingIfNeeded()
            return
        }

        // Copy to clipboard
        currentTranscription = normalizedText
        copyToClipboard(normalizedText)

        // Save to history
        saveTranscription(normalizedText)

        restorePasteTargetApplicationFocus()

        // Try to paste into the focused field as if the user pressed Cmd+V
        triggerAutoPaste()
        
        // Return to idle
        showCopiedNotification()
        logDebug("Committed transcription (\(source)): \(normalizedText)")
        completeProcessingIfNeeded()
    }

    private func completeProcessingIfNeeded() {
        switch stateManager.state {
        case .processing:
            _ = stateManager.completeProcessing()
        case .recording:
            _ = stateManager.transition(to: .idle)
        case .idle:
            break
        }
    }

    private func isExpectedCancellationError(_ error: NSError) -> Bool {
        error.domain == "kLSRErrorDomain" && [216, 301].contains(error.code)
    }
    
    private func triggerAutoPaste() {
        logDebug("Attempting automatic paste from latest clipboard contents")

        switch autoPasteService.pasteLatestClipboardContents() {
        case .pasted:
            logDebug("Auto-paste shortcut dispatched")
        case .attemptedWithoutConfirmedAccessibility:
            logDebug("Auto-paste dispatched even though Accessibility trust could not be confirmed")
        }
    }

    private func showAudioError(_ error: Error) {
        let alert = NSAlert()
        alert.messageText = "Erro de Áudio"
        alert.informativeText = "Não foi possível iniciar a captura de áudio: \(error.localizedDescription)"
        alert.alertStyle = .warning
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }

    private func showSpeechAuthorizationError() {
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "Permissão Necessária"
            alert.informativeText = """
            AudioFlow precisa de permissão para reconhecimento de voz.

            Como habilitar:
            1. Abra System Preferences
            2. Vá em Privacy & Security > Speech Recognition
            3. Permita o acesso ao microfone

            Após habilitar, reinicie o aplicativo.
            """
            alert.alertStyle = .warning
            alert.addButton(withTitle: "Abrir Preferências")
            alert.addButton(withTitle: "Cancelar")

            if alert.runModal() == .alertFirstButtonReturn {
                NSWorkspace.shared.open(
                    URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_SpeechRecognition")!
                )
            }
        }
    }

    // MARK: - Icon Management

    private func updateIcon(for state: AppState) {
        logDebug("updateIcon called for state: \(state)")
        
        guard let button = statusItem?.button else {
            logDebug("ERROR: No button found")
            return
        }

        // Stop any existing animation
        stopAnimation()

        switch state {
        case .idle:
            logDebug("Setting idle icon")
            let icon = createStaticLogo()
            icon.isTemplate = true
            button.image = icon
            button.imagePosition = .imageOnly
            button.title = ""
            button.contentTintColor = nil
            button.appearsDisabled = false
            button.toolTip = "AudioFlow - Pronto para gravar"
            logDebug("Idle icon set")

        case .recording:
            logDebug("Setting recording icon")
            button.title = ""
            button.imagePosition = .imageOnly
            button.contentTintColor = nil
            button.appearsDisabled = false
            button.toolTip = "AudioFlow - Gravando..."
            logDebug("Recording icon set, starting animation")
            startAnimation()

        case .processing:
            logDebug("Setting processing icon")
            let icon = createStaticLogo()
            icon.isTemplate = true
            button.image = icon
            button.imagePosition = .imageOnly
            button.title = ""
            button.contentTintColor = nil
            button.appearsDisabled = false
            button.toolTip = "AudioFlow - Processando transcrição..."
            logDebug("Processing icon set")
        }
    }

    // MARK: - Animation

    private func startAnimation() {
        animationFrame = 0
        animationTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            self?.updateAnimationFrame()
        }
    }

    private func stopAnimation() {
        animationTimer?.invalidate()
        animationTimer = nil
    }

    private func updateAnimationFrame() {
        guard let button = statusItem?.button else { return }

        let icon = createAnimatedLogo(frame: animationFrame)
        icon.isTemplate = false
        button.image = icon
        button.imagePosition = .imageOnly
        button.title = ""
        button.contentTintColor = nil

        animationFrame = (animationFrame + 1) % 20
    }

    private func createStaticLogo() -> NSImage {
        let size = NSSize(width: 18, height: 18)
        let image = NSImage(size: size)

        image.lockFocus()

        // Use black for template - will be rendered correctly by macOS
        NSColor.black.setFill()

        let bars: [(x: CGFloat, height: CGFloat, width: CGFloat)] = [
            (9, 14, 2.5),    // center (tallest)
            (5.5, 9, 2),     // inner left
            (12.5, 9, 2),    // inner right
            (2.5, 5.5, 1.8), // middle left
            (15.5, 5.5, 1.8),// middle right
            (0.5, 3.5, 1.5), // outer left
            (17.5, 3.5, 1.5) // outer right
        ]

        for bar in bars {
            let rect = NSRect(
                x: bar.x - bar.width / 2,
                y: (size.height - bar.height) / 2,
                width: bar.width,
                height: bar.height
            )
            let path = NSBezierPath(roundedRect: rect, xRadius: bar.width / 2, yRadius: bar.width / 2)
            path.fill()
        }

        image.unlockFocus()
        return image
    }

    private func createAnimatedLogo(frame: Int) -> NSImage {
        let size = NSSize(width: 18, height: 18)
        let image = NSImage(size: size)

        image.lockFocus()

        recordingAccentColor.setFill()

        // Bar definitions with base height and max height for animation
        let bars: [(x: CGFloat, baseHeight: CGFloat, maxHeight: CGFloat, width: CGFloat)] = [
            (9, 14, 16, 2.5),    // center
            (5.5, 9, 13, 2),     // inner left
            (12.5, 9, 13, 2),    // inner right
            (2.5, 5.5, 9, 1.8),  // middle left
            (15.5, 5.5, 9, 1.8), // middle right
            (0.5, 3.5, 6, 1.5),  // outer left
            (17.5, 3.5, 6, 1.5)  // outer right
        ]

        for (index, bar) in bars.enumerated() {
            // Calculate animated height using sine wave
            let phase = Double(frame) / 20.0 * 2 * .pi + Double(index) * 0.5
            let heightMultiplier = 0.3 + 0.7 * abs(sin(phase))
            let currentHeight = bar.baseHeight + (bar.maxHeight - bar.baseHeight) * heightMultiplier

            let rect = NSRect(
                x: bar.x - bar.width / 2,
                y: (size.height - currentHeight) / 2,
                width: bar.width,
                height: currentHeight
            )
            let path = NSBezierPath(roundedRect: rect, xRadius: bar.width / 2, yRadius: bar.width / 2)
            path.fill()
        }

        image.unlockFocus()
        
        // Ensure proper scaling for retina
        image.size = size
        return image
    }

    // MARK: - Actions

    @objc func toggleRecording() {
        logDebug("toggleRecording called, current state: \(stateManager.state)")
        
        switch stateManager.state {
        case .idle:
            logDebug("Starting recording...")
            _ = stateManager.startRecording()

        case .recording:
            logDebug("Stopping recording, transitioning to processing...")
            _ = stateManager.stopRecording(partialText: currentTranscription)

        case .processing:
            logDebug("Currently processing, ignoring toggle")
            break
        }
    }

    @objc func cancelOperation() {
        processingTimeoutTimer?.invalidate()
        processingTimeoutTimer = nil
        speechService.stopRecognition()
        audioController.stopRecording()
        stateManager.cancel()
        transcriptionCommitCoordinator.beginSession()
        currentTranscription = ""
    }
}

// MARK: - Speech Service Delegate

extension AppDelegate: SpeechServiceDelegate {

    func speechService(_ service: SpeechService, didReceivePartialResult text: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard !self.transcriptionCommitCoordinator.hasCommittedText else {
                self.logDebug("Ignoring late partial result after commit: \(text)")
                return
            }

            self.logDebug("Partial result: \(text)")
            self.currentTranscription = text
            self.transcriptionCommitCoordinator.updatePartialText(text)
            self.stateManager.updatePartialText(text)
        }
    }

    func speechService(_ service: SpeechService, didReceiveFinalResult text: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.logDebug("Final result: \(text)")

            if let committedText = self.transcriptionCommitCoordinator.commitFromFinal(text) {
                self.commitProcessedTranscription(committedText, source: "final")
                return
            }

            if self.transcriptionCommitCoordinator.hasCommittedText {
                self.logDebug("Ignoring final result because a transcription was already committed")
            } else {
                self.logDebug("Ignoring empty final result with no transcription to commit")
                self.completeProcessingIfNeeded()
            }
        }
    }

    func speechService(_ service: SpeechService, didFailWithError error: Error) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.logDebug("Speech error: \(error)")
            
            // Cancel timeout
            self.processingTimeoutTimer?.invalidate()
            self.processingTimeoutTimer = nil
            
            // Don't show error for expected cancellation when we already have the result
            let nsError = error as NSError
            if self.isExpectedCancellationError(nsError) {
                self.logDebug("Ignoring expected speech cancellation: \(nsError.code)")
                return
            }

            // Handle "no speech detected" - use partial if available
            if nsError.domain == "kAFAssistantErrorDomain" {
                if let text = self.transcriptionCommitCoordinator.commitFromErrorFallback() {
                    self.commitProcessedTranscription(text, source: "error-fallback")
                } else {
                    self.completeProcessingIfNeeded()
                }
                return
            }

            let alert = NSAlert()
            alert.messageText = "Erro de Transcrição"
            alert.informativeText = error.localizedDescription
            alert.alertStyle = .warning
            alert.addButton(withTitle: "OK")
            alert.runModal()
            self.completeProcessingIfNeeded()
        }
    }

    func speechServiceDidChangeAvailability(_ service: SpeechService, isAvailable: Bool) {
        logDebug("Speech recognition available: \(isAvailable)")
    }

    // MARK: - Helper Methods

    private func copyToClipboard(_ text: String) {
        ClipboardService.shared.copy(text)
    }

    private func capturePasteTargetApplication() {
        let currentAppProcessIdentifier = ProcessInfo.processInfo.processIdentifier

        if let frontmostApplication = NSWorkspace.shared.frontmostApplication,
           frontmostApplication.processIdentifier != currentAppProcessIdentifier {
            pasteTargetApplication = frontmostApplication
            logDebug("Captured paste target app: \(frontmostApplication.localizedName ?? "unknown")")
        } else {
            pasteTargetApplication = nil
            logDebug("No external frontmost app captured for auto-paste")
        }
    }

    private func restorePasteTargetApplicationFocus() {
        guard let pasteTargetApplication else {
            logDebug("Skipping paste target activation because no previous app was captured")
            return
        }

        let appName = pasteTargetApplication.localizedName ?? "unknown"
        let didActivate = pasteTargetApplication.activate(options: [.activateIgnoringOtherApps])
        logDebug("Restoring focus to \(appName): \(didActivate)")
    }

    private func saveTranscription(_ text: String) {
        HistoryController.shared.saveTranscription(text)
        print("Saved to history")
    }

    private func showCopiedNotification() {
        switch notificationService.showCopiedNotification() {
        case .dispatched:
            logDebug("Copied notification dispatched")
        case .unavailable:
            logDebug("Skipping copied notification because AudioFlow is not running from an app bundle")
        }
    }

    // MARK: - History Actions

    @objc func copyTranscriptionFromHistory(_ sender: NSMenuItem) {
        guard let transcription = sender.representedObject as? Transcription else { return }
        ClipboardService.shared.copy(transcription.text)
        print("Copied from history: \(transcription.text.prefix(30))...")
    }

    @objc func clearHistory() {
        HistoryController.shared.deleteAllTranscriptions()
        // Refresh menu
        statusItem?.menu = MenuBuilder.buildMenu(for: stateManager.state, target: self)
        print("History cleared")
    }

    // MARK: - Login Item Actions

    @objc func toggleStartAtLogin() {
        let isEnabled = LoginItemService.shared.toggle()
        logDebug("Start at login: \(isEnabled ? "enabled" : "disabled")")
        // Refresh menu to show new state
        statusItem?.menu = MenuBuilder.buildMenu(for: stateManager.state, target: self)
    }

    @objc func exportHistory() {
        let savePanel = NSSavePanel()
        savePanel.title = "Exportar Histórico"
        savePanel.nameFieldStringValue = "AudioFlow_Historico.txt"
        savePanel.allowedContentTypes = [.text]
        savePanel.canCreateDirectories = true

        savePanel.begin { [weak self] response in
            guard response == .OK, let url = savePanel.url else { return }

            do {
                try HistoryController.shared.exportToTXT(to: url)
                DispatchQueue.main.async {
                    self?.showExportSuccessNotification(url: url)
                }
            } catch {
                DispatchQueue.main.async {
                    self?.showExportError(error: error)
                }
            }
        }
    }

    private func showExportSuccessNotification(url: URL) {
        let alert = NSAlert()
        alert.messageText = "Exportação Concluída"
        alert.informativeText = "Histórico salvo em:\n\(url.path)"
        alert.alertStyle = .informational
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }

    private func showExportError(error: Error) {
        let alert = NSAlert()
        alert.messageText = "Erro na Exportação"
        alert.informativeText = error.localizedDescription
        alert.alertStyle = .critical
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }

    @objc func showSearchPanel() {
        SearchPanelController.shared.showPanel()
    }

    // MARK: - Sound Feedback

    private enum SoundType {
        case start
        case stop
    }

    private func playSound(_ type: SoundType) {
        let soundName: String
        switch type {
        case .start:
            soundName = "Pop"
        case .stop:
            soundName = "Morse"
        }

        guard let sound = NSSound(named: NSSound.Name(soundName)) else { return }
        sound.volume = 0.5
        sound.play()
    }
}
