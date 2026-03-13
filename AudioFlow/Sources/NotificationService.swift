import Foundation
import UserNotifications

struct NotificationRuntimeContext: Equatable {
    let bundlePath: String
    let bundleIdentifier: String?

    static var main: NotificationRuntimeContext {
        NotificationRuntimeContext(
            bundlePath: Bundle.main.bundlePath,
            bundleIdentifier: Bundle.main.bundleIdentifier
        )
    }

    var supportsUserNotifications: Bool {
        bundlePath.hasSuffix(".app") && !(bundleIdentifier?.isEmpty ?? true)
    }
}

enum NotificationDispatchResult: Equatable {
    case dispatched
    case unavailable
}

final class NotificationService {

    private let runtimeContextProvider: () -> NotificationRuntimeContext

    init(runtimeContextProvider: @escaping () -> NotificationRuntimeContext = { .main }) {
        self.runtimeContextProvider = runtimeContextProvider
    }

    @discardableResult
    func showCopiedNotification() -> NotificationDispatchResult {
        let runtimeContext = runtimeContextProvider()
        guard runtimeContext.supportsUserNotifications else {
            return .unavailable
        }

        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound]) { _, _ in }

        let content = UNMutableNotificationContent()
        content.title = "AudioFlow"
        content.body = "Texto copiado e colado automaticamente!"
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )

        center.add(request)
        return .dispatched
    }
}
