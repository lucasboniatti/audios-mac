import XCTest

@testable import AudioFlow

final class AutoPasteServiceTests: XCTestCase {

    func testPasteLatestClipboardContents_PostsPasteShortcutWhenAccessibilityGranted() {
        let permissionChecker = MockAccessibilityPermissionChecker(results: [true])
        let pastePoster = MockPasteShortcutPoster()
        let fallbackPastePoster = MockPasteShortcutPoster()
        let alertPresenter = MockAutoPasteAlertPresenter()
        let service = AutoPasteService(
            accessibilityPermissionChecker: permissionChecker,
            pasteShortcutPoster: pastePoster,
            fallbackPasteShortcutPoster: fallbackPastePoster,
            alertPresenter: alertPresenter
        )

        let result = service.pasteLatestClipboardContents()

        XCTAssertEqual(result, .pasted)
        XCTAssertEqual(permissionChecker.prompts, [true])
        XCTAssertEqual(pastePoster.postCount, 1)
        XCTAssertEqual(fallbackPastePoster.postCount, 0)
        XCTAssertEqual(alertPresenter.accessibilityAlertCount, 0)
        XCTAssertEqual(alertPresenter.automationAlertCount, 0)
    }

    func testPasteLatestClipboardContents_StillPostsPasteShortcutWhenAccessibilityCannotBeConfirmed() {
        let permissionChecker = MockAccessibilityPermissionChecker(results: [false])
        let pastePoster = MockPasteShortcutPoster()
        let fallbackPastePoster = MockPasteShortcutPoster()
        let alertPresenter = MockAutoPasteAlertPresenter()
        let service = AutoPasteService(
            accessibilityPermissionChecker: permissionChecker,
            pasteShortcutPoster: pastePoster,
            fallbackPasteShortcutPoster: fallbackPastePoster,
            alertPresenter: alertPresenter
        )

        let result = service.pasteLatestClipboardContents()

        XCTAssertEqual(result, .attemptedWithoutConfirmedAccessibility)
        XCTAssertEqual(permissionChecker.prompts, [true])
        XCTAssertEqual(pastePoster.postCount, 0)
        XCTAssertEqual(fallbackPastePoster.postCount, 1)
        XCTAssertEqual(alertPresenter.accessibilityAlertCount, 0)
        XCTAssertEqual(alertPresenter.automationAlertCount, 0)
    }

    func testPasteLatestClipboardContents_OnlyPromptsSystemPermissionOncePerSession() {
        let permissionChecker = MockAccessibilityPermissionChecker(results: [false, false])
        let pastePoster = MockPasteShortcutPoster()
        let fallbackPastePoster = MockPasteShortcutPoster()
        let alertPresenter = MockAutoPasteAlertPresenter()
        let service = AutoPasteService(
            accessibilityPermissionChecker: permissionChecker,
            pasteShortcutPoster: pastePoster,
            fallbackPasteShortcutPoster: fallbackPastePoster,
            alertPresenter: alertPresenter
        )

        _ = service.pasteLatestClipboardContents()
        _ = service.pasteLatestClipboardContents()

        XCTAssertEqual(permissionChecker.prompts, [true, false])
        XCTAssertEqual(pastePoster.postCount, 0)
        XCTAssertEqual(fallbackPastePoster.postCount, 2)
        XCTAssertEqual(alertPresenter.accessibilityAlertCount, 0)
        XCTAssertEqual(alertPresenter.automationAlertCount, 0)
    }

    func testPasteLatestClipboardContents_RecoversAfterPermissionGrantedLater() {
        let permissionChecker = MockAccessibilityPermissionChecker(results: [false, true])
        let pastePoster = MockPasteShortcutPoster()
        let fallbackPastePoster = MockPasteShortcutPoster()
        let alertPresenter = MockAutoPasteAlertPresenter()
        let service = AutoPasteService(
            accessibilityPermissionChecker: permissionChecker,
            pasteShortcutPoster: pastePoster,
            fallbackPasteShortcutPoster: fallbackPastePoster,
            alertPresenter: alertPresenter
        )

        XCTAssertEqual(service.pasteLatestClipboardContents(), .attemptedWithoutConfirmedAccessibility)
        XCTAssertEqual(service.pasteLatestClipboardContents(), .pasted)
        XCTAssertEqual(permissionChecker.prompts, [true, false])
        XCTAssertEqual(pastePoster.postCount, 1)
        XCTAssertEqual(fallbackPastePoster.postCount, 1)
        XCTAssertEqual(alertPresenter.accessibilityAlertCount, 0)
        XCTAssertEqual(alertPresenter.automationAlertCount, 0)
    }

    func testPasteLatestClipboardContents_ShowsAccessibilityAlertWhenFallbackReportsMissingAccessibilityPermission() {
        let permissionChecker = MockAccessibilityPermissionChecker(results: [false, false])
        let pastePoster = MockPasteShortcutPoster()
        let fallbackPastePoster = MockPasteShortcutPoster(errorToEmit: .missingAccessibilityPermission)
        let alertPresenter = MockAutoPasteAlertPresenter()
        let service = AutoPasteService(
            accessibilityPermissionChecker: permissionChecker,
            pasteShortcutPoster: pastePoster,
            fallbackPasteShortcutPoster: fallbackPastePoster,
            alertPresenter: alertPresenter
        )

        XCTAssertEqual(service.pasteLatestClipboardContents(), .attemptedWithoutConfirmedAccessibility)
        XCTAssertEqual(service.pasteLatestClipboardContents(), .attemptedWithoutConfirmedAccessibility)
        XCTAssertEqual(alertPresenter.accessibilityAlertCount, 1)
        XCTAssertEqual(alertPresenter.automationAlertCount, 0)
    }

    func testPasteLatestClipboardContents_ShowsAutomationAlertWhenFallbackReportsMissingAutomationPermission() {
        let permissionChecker = MockAccessibilityPermissionChecker(results: [false, false])
        let pastePoster = MockPasteShortcutPoster()
        let fallbackPastePoster = MockPasteShortcutPoster(errorToEmit: .missingAutomationPermission)
        let alertPresenter = MockAutoPasteAlertPresenter()
        let service = AutoPasteService(
            accessibilityPermissionChecker: permissionChecker,
            pasteShortcutPoster: pastePoster,
            fallbackPasteShortcutPoster: fallbackPastePoster,
            alertPresenter: alertPresenter
        )

        XCTAssertEqual(service.pasteLatestClipboardContents(), .attemptedWithoutConfirmedAccessibility)
        XCTAssertEqual(service.pasteLatestClipboardContents(), .attemptedWithoutConfirmedAccessibility)
        XCTAssertEqual(alertPresenter.accessibilityAlertCount, 0)
        XCTAssertEqual(alertPresenter.automationAlertCount, 1)
    }
}

private final class MockAccessibilityPermissionChecker: AccessibilityPermissionChecking {
    private var results: [Bool]
    private(set) var prompts: [Bool] = []

    init(results: [Bool]) {
        self.results = results
    }

    func isTrusted(prompt: Bool) -> Bool {
        prompts.append(prompt)
        guard !results.isEmpty else { return false }
        return results.removeFirst()
    }
}

private final class MockPasteShortcutPoster: PasteShortcutPosting {
    private(set) var postCount = 0
    private let errorToEmit: PasteShortcutPostingError?

    init(errorToEmit: PasteShortcutPostingError? = nil) {
        self.errorToEmit = errorToEmit
    }

    func postPasteShortcut(onError: ((PasteShortcutPostingError) -> Void)?) {
        postCount += 1
        if let errorToEmit {
            onError?(errorToEmit)
        }
    }
}

private final class MockAutoPasteAlertPresenter: AutoPasteAlertPresenting {
    private(set) var accessibilityAlertCount = 0
    private(set) var automationAlertCount = 0

    func showAccessibilityRequiredAlert() {
        accessibilityAlertCount += 1
    }

    func showAutomationRequiredAlert() {
        automationAlertCount += 1
    }
}
