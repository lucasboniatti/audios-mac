import XCTest

@testable import AudioFlow

final class NotificationServiceTests: XCTestCase {

    func testSupportsUserNotifications_WhenRunningFromAppBundleWithBundleIdentifier() {
        let context = NotificationRuntimeContext(
            bundlePath: "/Applications/AudioFlow.app",
            bundleIdentifier: "com.audioflow.app"
        )

        XCTAssertTrue(context.supportsUserNotifications)
    }

    func testSupportsUserNotifications_WhenRunningFromBinaryWithoutAppBundle() {
        let context = NotificationRuntimeContext(
            bundlePath: "/Users/test/AudioFlow/.build/debug/AudioFlow",
            bundleIdentifier: nil
        )

        XCTAssertFalse(context.supportsUserNotifications)
    }

    func testShowCopiedNotification_ReturnsUnavailableOutsideAppBundle() {
        let service = NotificationService {
            NotificationRuntimeContext(
                bundlePath: "/Users/test/AudioFlow/.build/debug/AudioFlow",
                bundleIdentifier: nil
            )
        }

        XCTAssertEqual(service.showCopiedNotification(), .unavailable)
    }
}
