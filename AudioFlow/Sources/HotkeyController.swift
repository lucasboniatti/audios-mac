import Cocoa
import Carbon.HIToolbox

struct HotkeyConfiguration {

    static let displayName = "Control+A"
    static let menuKeyEquivalent = "a"
    static let menuModifiers: NSEvent.ModifierFlags = [.control]
    static let carbonKeyCode = UInt32(kVK_ANSI_A)
    static let carbonModifiers = UInt32(controlKey)
    static let identifier: UInt32 = 1
    static let signature = fourCharCode("AFHK")

    private static func fourCharCode(_ string: String) -> OSType {
        string.unicodeScalars.reduce(0) { partialResult, scalar in
            (partialResult << 8) + OSType(scalar.value)
        }
    }
}

private let hotKeyEventHandler: EventHandlerUPP = { _, event, userData in
    guard let event, let userData else { return noErr }
    let controller = Unmanaged<HotkeyController>.fromOpaque(userData).takeUnretainedValue()
    controller.handleHotKeyEvent(event)
    return noErr
}

/// Controller for managing global keyboard shortcuts
class HotkeyController {

    // MARK: - Properties

    private var eventHandlerRef: EventHandlerRef?
    private var hotKeyRef: EventHotKeyRef?
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
        stop()
        print("HotkeyController start() called")

        var eventType = EventTypeSpec(
            eventClass: OSType(kEventClassKeyboard),
            eventKind: UInt32(kEventHotKeyPressed)
        )

        let installStatus = InstallEventHandler(
            GetApplicationEventTarget(),
            hotKeyEventHandler,
            1,
            &eventType,
            Unmanaged.passUnretained(self).toOpaque(),
            &eventHandlerRef
        )

        guard installStatus == noErr else {
            print("Failed to install hotkey event handler: \(installStatus)")
            showRegistrationAlert()
            return
        }

        let hotKeyID = EventHotKeyID(
            signature: HotkeyConfiguration.signature,
            id: HotkeyConfiguration.identifier
        )

        let registrationStatus = RegisterEventHotKey(
            HotkeyConfiguration.carbonKeyCode,
            HotkeyConfiguration.carbonModifiers,
            hotKeyID,
            GetApplicationEventTarget(),
            0,
            &hotKeyRef
        )

        guard registrationStatus == noErr else {
            print("Failed to register global hotkey: \(registrationStatus)")
            if let eventHandlerRef {
                RemoveEventHandler(eventHandlerRef)
                self.eventHandlerRef = nil
            }
            showRegistrationAlert()
            return
        }

        print("HotkeyController started - listening for \(HotkeyConfiguration.displayName)")
    }

    /// Stop monitoring for hotkey
    func stop() {
        if let hotKeyRef {
            UnregisterEventHotKey(hotKeyRef)
            self.hotKeyRef = nil
        }

        if let eventHandlerRef {
            RemoveEventHandler(eventHandlerRef)
            self.eventHandlerRef = nil
        }

        print("HotkeyController stopped")
    }

    // MARK: - Private Methods

    fileprivate func handleHotKeyEvent(_ event: EventRef) {
        var hotKeyID = EventHotKeyID()
        let status = GetEventParameter(
            event,
            EventParamName(kEventParamDirectObject),
            EventParamType(typeEventHotKeyID),
            nil,
            MemoryLayout<EventHotKeyID>.size,
            nil,
            &hotKeyID
        )

        guard status == noErr else {
            print("Failed to inspect hotkey event: \(status)")
            return
        }

        guard hotKeyID.signature == HotkeyConfiguration.signature,
              hotKeyID.id == HotkeyConfiguration.identifier else {
            return
        }

        print("\(HotkeyConfiguration.displayName) detected - triggering toggle")
        DispatchQueue.main.async {
            self.onToggle()
        }
    }

    private func showRegistrationAlert() {
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "Atalho Indisponível"
            alert.informativeText = """
            Não foi possível registrar o atalho global \(HotkeyConfiguration.displayName).

            Esse atalho pode estar reservado pelo sistema ou em uso por outro app.
            """
            alert.alertStyle = .warning
            alert.addButton(withTitle: "OK")
            alert.runModal()
        }
    }
}
