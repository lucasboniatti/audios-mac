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
                print("Recording started - Speech recognition active")
            } catch {
                print("Failed to start recording: \(error)")
                showAudioError(error)
                _ = stateManager.transition(to: .idle)
            }

        case .idle:
            audioController.stopRecording()
            speechService.stopRecognition()
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

        switch state {
        case .idle:
            let icon = NSImage(systemSymbolName: "mic.fill", accessibilityDescription: "AudioFlow")
            icon?.isTemplate = true
            button.image = icon
            button.contentTintColor = nil
            button.toolTip = "AudioFlow - Pronto para gravar"

        case .recording:
            let icon = NSImage(systemSymbolName: "mic.fill", accessibilityDescription: "Gravando")
            icon?.isTemplate = false
            button.image = icon
            button.contentTintColor = .systemRed
            button.toolTip = "AudioFlow - Gravando..."

        case .processing:
            let icon = NSImage(systemSymbolName: "arrow.clockwise", accessibilityDescription: "Processando")
            icon?.isTemplate = true
            button.image = icon
            button.toolTip = "AudioFlow - Processando transcrição..."
        }
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

    @objc func showSearchPanel() {
        SearchPanelController.shared.showPanel()
    }
}