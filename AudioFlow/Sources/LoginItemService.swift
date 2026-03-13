import Foundation
import ServiceManagement

/// Manages login item (auto-start at login) functionality
class LoginItemService {

    // MARK: - Singleton

    static let shared = LoginItemService()

    // MARK: - Properties

    private let bundleIdentifier = Bundle.main.bundleIdentifier ?? "com.audioflow.app"

    // MARK: - Public API

    /// Check if app is set to start at login
    var isEnabled: Bool {
        if #available(macOS 13.0, *) {
            return SMAppService.mainApp.status == .enabled
        } else {
            // For older macOS, check via Shared File List
            let loginItems = getLoginItems()
            return loginItems.contains { $0.contains(bundleIdentifier) }
        }
    }

    /// Enable or disable start at login
    /// - Parameter enabled: true to enable, false to disable
    /// - Returns: true if successful, false otherwise
    @discardableResult
    func setEnabled(_ enabled: Bool) -> Bool {
        if #available(macOS 13.0, *) {
            do {
                if enabled {
                    try SMAppService.mainApp.register()
                } else {
                    try SMAppService.mainApp.unregister()
                }
                return true
            } catch {
                print("LoginItemService error: \(error.localizedDescription)")
                return false
            }
        } else {
            // Fallback for older macOS using Shared File List
            return setLoginItemLegacy(enabled)
        }
    }

    /// Toggle start at login
    /// - Returns: New state (true = enabled, false = disabled)
    @discardableResult
    func toggle() -> Bool {
        let newState = !isEnabled
        setEnabled(newState)
        return newState
    }

    // MARK: - Legacy Support (macOS 12 and earlier)

    private func getLoginItems() -> [String] {
        let url = URL(fileURLWithPath: "/Library/LaunchAgents")
        // Simple check - see if our plist exists
        let plistPath = url.appendingPathComponent("\(bundleIdentifier).plist").path
        return FileManager.default.fileExists(atPath: plistPath) ? [bundleIdentifier] : []
    }

    private func setLoginItemLegacy(_ enabled: Bool) -> Bool {
        // For macOS 12 and earlier, use SMLoginItemSetEnabled
        // Note: This requires a helper app bundle, so we'll use AppleScript as fallback
        let script = enabled
            ? "tell application \"System Events\" to make login item at end with properties {path:\"/Applications/AudioFlow.app\", hidden:true}"
            : "tell application \"System Events\" to delete login item \"AudioFlow\""

        var error: NSDictionary?
        if let scriptObject = NSAppleScript(source: script) {
            scriptObject.executeAndReturnError(&error)
            if let error = error {
                print("LoginItemService AppleScript error: \(error)")
                return false
            }
            return true
        }
        return false
    }
}