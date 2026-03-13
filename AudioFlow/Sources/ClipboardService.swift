import Cocoa
import Foundation

// MARK: - Notification Names

extension Notification.Name {
    static let textCopied = Notification.Name("textCopied")
}

// MARK: - Clipboard Service

/// Service for managing clipboard operations
class ClipboardService {

    // MARK: - Singleton

    static let shared = ClipboardService()

    // MARK: - Properties

    private let pasteboard = NSPasteboard.general

    // MARK: - Initialization

    private init() {}

    // MARK: - Public Methods

    /// Copy text to clipboard
    /// - Parameter text: Text to copy
    func copy(_ text: String) {
        // Clear previous contents
        pasteboard.clearContents()

        // Set new text
        pasteboard.setString(text, forType: .string)

        // Post notification for observers
        NotificationCenter.default.post(name: .textCopied, object: nil, userInfo: ["text": text])

        print("Clipboard: copied \(text.count) characters")
    }

    /// Get current clipboard text
    /// - Returns: Current clipboard text or nil if empty/not string
    func getText() -> String? {
        return pasteboard.string(forType: .string)
    }

    /// Check if clipboard has text
    var hasText: Bool {
        return pasteboard.string(forType: .string) != nil
    }

    /// Clear clipboard
    func clear() {
        pasteboard.clearContents()
        print("Clipboard: cleared")
    }
}