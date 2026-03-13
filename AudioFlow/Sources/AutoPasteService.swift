import Cocoa
import Carbon.HIToolbox

protocol AccessibilityPermissionChecking {
    func isTrusted(prompt: Bool) -> Bool
}

enum PasteShortcutPostingError: Equatable {
    case missingAccessibilityPermission
    case missingAutomationPermission
    case unknown(String)
}

protocol PasteShortcutPosting {
    func postPasteShortcut(onError: ((PasteShortcutPostingError) -> Void)?)
}

protocol AutoPasteAlertPresenting {
    func showAccessibilityRequiredAlert()
    func showAutomationRequiredAlert()
}

enum AutoPasteResult: Equatable {
    case pasted
    case attemptedWithoutConfirmedAccessibility
}

final class AutoPasteService {

    private let accessibilityPermissionChecker: AccessibilityPermissionChecking
    private let accessibilityPasteShortcutPoster: PasteShortcutPosting
    private let fallbackPasteShortcutPoster: PasteShortcutPosting
    private let alertPresenter: AutoPasteAlertPresenting
    private var hasRequestedAccessibilityPermission = false
    private var hasShownAccessibilityAlert = false
    private var hasShownAutomationAlert = false

    init(
        accessibilityPermissionChecker: AccessibilityPermissionChecking = SystemAccessibilityPermissionChecker(),
        pasteShortcutPoster: PasteShortcutPosting = CGEventPasteShortcutPoster(),
        fallbackPasteShortcutPoster: PasteShortcutPosting = AppleScriptPasteShortcutPoster(),
        alertPresenter: AutoPasteAlertPresenting = AutoPasteAccessibilityAlertPresenter()
    ) {
        self.accessibilityPermissionChecker = accessibilityPermissionChecker
        self.accessibilityPasteShortcutPoster = pasteShortcutPoster
        self.fallbackPasteShortcutPoster = fallbackPasteShortcutPoster
        self.alertPresenter = alertPresenter
    }

    @discardableResult
    func pasteLatestClipboardContents() -> AutoPasteResult {
        let shouldPrompt = !hasRequestedAccessibilityPermission
        let isTrusted = accessibilityPermissionChecker.isTrusted(prompt: shouldPrompt)
        hasRequestedAccessibilityPermission = true

        guard isTrusted else {
            // Dev/distributed bundles can report false negatives here even when
            // CGEvent paste does not work reliably, so fall back to System Events.
            fallbackPasteShortcutPoster.postPasteShortcut { [weak self] error in
                self?.handleFallbackPasteError(error)
            }
            return .attemptedWithoutConfirmedAccessibility
        }

        hasShownAccessibilityAlert = false
        hasShownAutomationAlert = false
        accessibilityPasteShortcutPoster.postPasteShortcut(onError: nil)
        return .pasted
    }

    private func handleFallbackPasteError(_ error: PasteShortcutPostingError) {
        switch error {
        case .missingAccessibilityPermission:
            guard !hasShownAccessibilityAlert else { return }
            hasShownAccessibilityAlert = true
            alertPresenter.showAccessibilityRequiredAlert()

        case .missingAutomationPermission:
            guard !hasShownAutomationAlert else { return }
            hasShownAutomationAlert = true
            alertPresenter.showAutomationRequiredAlert()

        case .unknown(let message):
            NSLog("%@", "[AudioFlow] AppleScript paste fallback failed: \(message)")
        }
    }
}

struct SystemAccessibilityPermissionChecker: AccessibilityPermissionChecking {

    func isTrusted(prompt: Bool) -> Bool {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: prompt] as CFDictionary
        return AXIsProcessTrustedWithOptions(options)
    }
}

struct CGEventPasteShortcutPoster: PasteShortcutPosting {

    func postPasteShortcut(onError: ((PasteShortcutPostingError) -> Void)?) {
        waitForModifierKeysToBeReleased {
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

struct AppleScriptPasteShortcutPoster: PasteShortcutPosting {

    func postPasteShortcut(onError: ((PasteShortcutPostingError) -> Void)?) {
        waitForModifierKeysToBeReleased {
            let script = """
            tell application "System Events"
                keystroke "v" using command down
            end tell
            """

            var error: NSDictionary?
            NSAppleScript(source: script)?.executeAndReturnError(&error)

            if let error {
                NSLog("%@", "[AudioFlow] AppleScript paste fallback failed: \(error)")
                onError?(Self.mapError(error))
            }
        }
    }

    private static func mapError(_ error: NSDictionary) -> PasteShortcutPostingError {
        let errorNumber = error[NSAppleScript.errorNumber] as? Int ?? 0
        let message = (error[NSAppleScript.errorMessage] as? String)
            ?? (error[NSAppleScript.errorBriefMessage] as? String)
            ?? "Unknown AppleScript error"
        let normalizedMessage = message.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: .current)

        switch errorNumber {
        case 1002:
            return .missingAccessibilityPermission
        case -1743:
            return .missingAutomationPermission
        default:
            if normalizedMessage.contains("acionar teclas") || normalizedMessage.contains("keystroke") {
                return .missingAccessibilityPermission
            }

            if normalizedMessage.contains("apple events") || normalizedMessage.contains("not authorized") {
                return .missingAutomationPermission
            }

            return .unknown(message)
        }
    }
}

private let blockedModifierFlags: CGEventFlags = [
    .maskCommand,
    .maskControl,
    .maskAlternate,
    .maskShift
]

private func waitForModifierKeysToBeReleased(
    attempt: Int = 0,
    maxAttempts: Int = 12,
    action: @escaping () -> Void
) {
    let activeFlags = CGEventSource.flagsState(.combinedSessionState)

    guard !activeFlags.intersection(blockedModifierFlags).isEmpty, attempt < maxAttempts else {
        let dispatchDelay: TimeInterval = attempt == 0 ? 0.25 : 0.05
        DispatchQueue.main.asyncAfter(deadline: .now() + dispatchDelay, execute: action)
        return
    }

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
        waitForModifierKeysToBeReleased(
            attempt: attempt + 1,
            maxAttempts: maxAttempts,
            action: action
        )
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

    func showAutomationRequiredAlert() {
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "Permissão Necessária"
            alert.informativeText = """
            AudioFlow precisa de permissão de Automação para controlar o System Events e colar automaticamente a transcrição no app em foco.

            Como habilitar:
            1. Abra System Settings
            2. Vá em Privacy & Security > Automation
            3. Permita que AudioFlow controle System Events

            Depois disso, volte para o app onde deseja colar e grave novamente.
            """
            alert.alertStyle = .warning
            alert.addButton(withTitle: "Abrir Preferências")
            alert.addButton(withTitle: "Cancelar")

            if alert.runModal() == .alertFirstButtonReturn {
                NSWorkspace.shared.open(
                    URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation")!
                )
            }
        }
    }
}
