import Cocoa
import Carbon.HIToolbox

protocol AccessibilityPermissionChecking {
    func isTrusted(prompt: Bool) -> Bool
}

protocol PasteShortcutPosting {
    func postPasteShortcut()
}

protocol AutoPasteAlertPresenting {
    func showAccessibilityRequiredAlert()
}

enum AutoPasteResult: Equatable {
    case pasted
    case permissionRequired
}

final class AutoPasteService {

    private let accessibilityPermissionChecker: AccessibilityPermissionChecking
    private let pasteShortcutPoster: PasteShortcutPosting
    private let alertPresenter: AutoPasteAlertPresenting
    private var hasRequestedAccessibilityPermission = false

    init(
        accessibilityPermissionChecker: AccessibilityPermissionChecking = SystemAccessibilityPermissionChecker(),
        pasteShortcutPoster: PasteShortcutPosting = CGEventPasteShortcutPoster(),
        alertPresenter: AutoPasteAlertPresenting = AutoPasteAccessibilityAlertPresenter()
    ) {
        self.accessibilityPermissionChecker = accessibilityPermissionChecker
        self.pasteShortcutPoster = pasteShortcutPoster
        self.alertPresenter = alertPresenter
    }

    @discardableResult
    func pasteLatestClipboardContents() -> AutoPasteResult {
        let shouldPrompt = !hasRequestedAccessibilityPermission
        let isTrusted = accessibilityPermissionChecker.isTrusted(prompt: shouldPrompt)
        hasRequestedAccessibilityPermission = true

        guard isTrusted else {
            alertPresenter.showAccessibilityRequiredAlert()
            return .permissionRequired
        }

        pasteShortcutPoster.postPasteShortcut()
        return .pasted
    }
}

struct SystemAccessibilityPermissionChecker: AccessibilityPermissionChecking {

    func isTrusted(prompt: Bool) -> Bool {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: prompt] as CFDictionary
        return AXIsProcessTrustedWithOptions(options)
    }
}

struct CGEventPasteShortcutPoster: PasteShortcutPosting {

    func postPasteShortcut() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            guard let source = CGEventSource(stateID: .hidSystemState) else { return }

            let commandDown = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(kVK_Command), keyDown: true)
            let vKeyDown = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(kVK_ANSI_V), keyDown: true)
            let vKeyUp = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(kVK_ANSI_V), keyDown: false)
            let commandUp = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(kVK_Command), keyDown: false)

            vKeyDown?.flags = .maskCommand
            vKeyUp?.flags = .maskCommand

            commandDown?.post(tap: .cghidEventTap)
            vKeyDown?.post(tap: .cghidEventTap)
            vKeyUp?.post(tap: .cghidEventTap)
            commandUp?.post(tap: .cghidEventTap)
        }
    }
}

final class AutoPasteAccessibilityAlertPresenter: AutoPasteAlertPresenting {

    func showAccessibilityRequiredAlert() {
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "Permissão Necessária"
            alert.informativeText = """
            AudioFlow precisa de permissão de Accessibility para colar automaticamente a transcrição no app em foco.

            Como habilitar:
            1. Abra System Settings
            2. Vá em Privacy & Security > Accessibility
            3. Adicione AudioFlow à lista

            Depois disso, volte para o app onde deseja colar e grave novamente.
            """
            alert.alertStyle = .warning
            alert.addButton(withTitle: "Abrir Preferências")
            alert.addButton(withTitle: "Cancelar")

            if alert.runModal() == .alertFirstButtonReturn {
                NSWorkspace.shared.open(
                    URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")!
                )
            }
        }
    }
}
