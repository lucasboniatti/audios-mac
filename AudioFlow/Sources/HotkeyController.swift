import Cocoa

/// Controller for managing global keyboard shortcuts
class HotkeyController {

    // MARK: - Constants

    /// Space key code
    private static let spaceKeyCode: UInt16 = 49

    // MARK: - Properties

    private var globalMonitor: Any?
    private var localMonitor: Any?
    private let onToggle: () -> Void

    // MARK: - Initialization

    init(onToggle: @escaping () -> Void) {
        self.onToggle = onToggle
    }

    deinit {
        stop()
    }

    // MARK: - Public Methods

    /// Start monitoring for global hotkey
    func start() {
        // Check Accessibility permission
        guard checkAccessibilityPermission() else {
            showAccessibilityAlert()
            return
        }

        // Global monitor (works when app is not in focus)
        globalMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
            self?.handleKeyEvent(event)
        }

        // Local monitor (works when app is in focus)
        localMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            self?.handleKeyEvent(event)
            return event
        }

        print("HotkeyController started - listening for Space key")
    }

    /// Stop monitoring for hotkey
    func stop() {
        if let monitor = globalMonitor {
            NSEvent.removeMonitor(monitor)
            globalMonitor = nil
        }

        if let monitor = localMonitor {
            NSEvent.removeMonitor(monitor)
            localMonitor = nil
        }

        print("HotkeyController stopped")
    }

    // MARK: - Private Methods

    private func handleKeyEvent(_ event: NSEvent) {
        // Check if Space key was pressed
        if event.keyCode == Self.spaceKeyCode {
            // Only trigger if no modifier keys are pressed (pure Space)
            if event.modifierFlags.isEmpty {
                print("Space key detected - triggering toggle")
                onToggle()
            }
        }
    }

    private func checkAccessibilityPermission() -> Bool {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: false] as CFDictionary
        return AXIsProcessTrustedWithOptions(options)
    }

    private func showAccessibilityAlert() {
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "Permissão Necessária"
            alert.informativeText = """
            AudioFlow precisa de permissão de Accessibility para detectar o hotkey global (Space).

            Como habilitar:
            1. Abra System Preferences
            2. Vá em Privacy & Security > Accessibility
            3. Adicione AudioFlow à lista

            Após habilitar, reinicie o aplicativo.
            """
            alert.alertStyle = .warning
            alert.addButton(withTitle: "Abrir Preferências")
            alert.addButton(withTitle: "Cancelar")

            if alert.runModal() == .alertFirstButtonReturn {
                // Open System Preferences to Accessibility
                NSWorkspace.shared.open(
                    URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")!
                )
            }
        }
    }
}