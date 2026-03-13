import Cocoa
import Foundation

extension Notification.Name {
    static let textCopied = Notification.Name("textCopied")
}

/// Service for managing clipboard operations.
final class ClipboardService {

    static let shared = ClipboardService()

    private let pasteboard = NSPasteboard.general

    private init() {}

    func copy(_ text: String) {
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)

        NotificationCenter.default.post(name: .textCopied, object: nil, userInfo: ["text": text])
        print("Clipboard: copied \(text.count) characters")
    }

    func getText() -> String? {
        pasteboard.string(forType: .string)
    }

    var hasText: Bool {
        pasteboard.string(forType: .string) != nil
    }

    func clear() {
        pasteboard.clearContents()
        print("Clipboard: cleared")
    }
}
