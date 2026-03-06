import Cocoa
import Combine
import Speech
import UserNotifications

@main
class AppDelegate: NSObject, NSApplicationDelegate {

    // MARK: - Properties
    private var statusItem: NSStatusItem?
    private let stateManager = AppStateManager()
    private var cancellables = Set<AnyCancellable>()
    private var hotkeyController: HotkeyController?
    private let audioController = AudioController()
    private let speechService = SpeechService()
    private var currentTranscription = ""

    // Animation
    private var animationTimer: Timer?
    private var animationFrame: Int = 0

    // MARK: - Lifecycle

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        setupStatusBar()
        setupStateObserver()
        setupHotkey()
        setupSpeechService()
        setupAudioObserver()
        print("AudioFlow started - Menu bar icon active")
        print("Press Space to start/stop recording")
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
        // Create status item with square length (standard icon size)
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

        // Configure initial icon
        updateIcon(for: stateManager.state)

        // Set initial menu
        statusItem?.menu = MenuBuilder.buildMenu(for: stateManager.state, target: self)
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

    private func handleStateChange(_ newState: AppState) {
        // Update icon
        updateIcon(for: newState)

        // Update menu
        statusItem?.menu = MenuBuilder.buildMenu(for: newState, target: self)

        // Handle audio recording based on state
        handleAudioState(newState)

        print("UI updated for state: \(newState.description)")
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

    private func handleAudioState(_ state: AppState) {
        switch state {
        case .recording:
            currentTranscription = ""
            do {
                // Start speech recognition
                try speechService.startRecognition()
                // Start audio capture
                try audioController.startRecording()
                // Play start sound
                playSound(.start)
                print("Recording started - Speech recognition active")
            } catch {
                print("Failed to start recording: \(error)")
                showAudioError(error)
                _ = stateManager.transition(to: .idle)
            }

        case .idle:
            audioController.stopRecording()
            speechService.stopRecognition()
            // Play stop sound
            playSound(.stop)
            print("Recording stopped")

        case .processing:
            audioController.stopRecording()
            // Speech recognition will stop automatically when final result received
            print("Processing transcription")
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
        guard let button = statusItem?.button else { return }

        // Stop any existing animation
        stopAnimation()

        switch state {
        case .idle:
            let icon = createStaticLogo()
            icon.isTemplate = true
            button.image = icon
            button.contentTintColor = nil
            button.toolTip = "AudioFlow - Pronto para gravar"

        case .recording:
            startAnimation()
            button.toolTip = "AudioFlow - Gravando..."

        case .processing:
            let icon = createStaticLogo()
            icon.isTemplate = true
            button.image = icon
            button.toolTip = "AudioFlow - Processando transcrição..."
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
        button.contentTintColor = .systemRed

        animationFrame = (animationFrame + 1) % 20
    }

    private func createStaticLogo() -> NSImage {
        let size = NSSize(width: 18, height: 18)
        let image = NSImage(size: size)

        image.lockFocus()

        let bars: [(x: CGFloat, height: CGFloat, width: CGFloat)] = [
            (9, 14, 2.5),    // center (tallest)
            (5.5, 9, 2),     // inner left
            (12.5, 9, 2),    // inner right
            (2.5, 5.5, 1.8), // middle left
            (15.5, 5.5, 1.8),// middle right
            (0.5, 3.5, 1.5), // outer left
            (17.5, 3.5, 1.5) // outer right
        ]

        NSColor.black.setFill()

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

        NSColor.black.setFill()

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
        return image
    }

    // MARK: - Actions

    @objc func toggleRecording() {
        switch stateManager.state {
        case .idle:
            _ = stateManager.startRecording()

        case .recording:
            _ = stateManager.stopRecording(partialText: currentTranscription)

        case .processing:
            break
        }
    }

    @objc func cancelOperation() {
        speechService.stopRecognition()
        audioController.stopRecording()
        stateManager.cancel()
        currentTranscription = ""
    }
}

// MARK: - Speech Service Delegate

extension AppDelegate: SpeechServiceDelegate {

    func speechService(_ service: SpeechService, didReceivePartialResult text: String) {
        currentTranscription = text
        stateManager.updatePartialText(text)
        print("Partial: \(text)")
    }

    func speechService(_ service: SpeechService, didReceiveFinalResult text: String) {
        currentTranscription = text
        print("Final: \(text)")

        // Copy to clipboard
        copyToClipboard(text)

        // Save to history
        saveTranscription(text)

        // Return to idle
        DispatchQueue.main.async { [weak self] in
            _ = self?.stateManager.completeProcessing()
            self?.showCopiedNotification()
        }
    }

    func speechService(_ service: SpeechService, didFailWithError error: Error) {
        print("Speech error: \(error)")
        // Don't show error for cancellation
        let nsError = error as NSError
        if nsError.domain == "kLSRErrorDomain" && nsError.code == 216 {
            return
        }

        DispatchQueue.main.async { [weak self] in
            let alert = NSAlert()
            alert.messageText = "Erro de Transcrição"
            alert.informativeText = error.localizedDescription
            alert.alertStyle = .warning
            alert.addButton(withTitle: "OK")
            alert.runModal()
            _ = self?.stateManager.transition(to: .idle)
        }
    }

    func speechServiceDidChangeAvailability(_ service: SpeechService, isAvailable: Bool) {
        print("Speech recognition available: \(isAvailable)")
    }

    // MARK: - Helper Methods

    private func copyToClipboard(_ text: String) {
        ClipboardService.shared.copy(text)
    }

    private func saveTranscription(_ text: String) {
        HistoryController.shared.saveTranscription(text)
        print("Saved to history")
    }

    private func showCopiedNotification() {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound]) { _, _ in }

        let content = UNMutableNotificationContent()
        content.title = "AudioFlow"
        content.body = "Texto copiado para o clipboard!"
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )
        center.add(request)
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