import XCTest

@testable import AudioFlow

final class TranscriptionCommitCoordinatorTests: XCTestCase {

    func testCommitFromFinal_TrimsWhitespace() {
        let coordinator = TranscriptionCommitCoordinator()

        coordinator.beginSession()

        let committedText = coordinator.commitFromFinal("  texto final  ")

        XCTAssertEqual(committedText, "texto final")
        XCTAssertTrue(coordinator.hasCommittedText)
    }

    func testCommitFromFinal_UsesPartialWhenFinalIsEmpty() {
        let coordinator = TranscriptionCommitCoordinator()

        coordinator.beginSession()
        coordinator.updatePartialText("texto parcial")

        let committedText = coordinator.commitFromFinal("   ")

        XCTAssertEqual(committedText, "texto parcial")
        XCTAssertEqual(coordinator.committedText, "texto parcial")
    }

    func testCommitFromTimeout_UsesLatestPartialText() {
        let coordinator = TranscriptionCommitCoordinator()

        coordinator.beginSession()
        coordinator.updatePartialText("primeiro")
        coordinator.updatePartialText("texto final do timeout")

        let committedText = coordinator.commitFromTimeout()

        XCTAssertEqual(committedText, "texto final do timeout")
    }

    func testCommitFromFinal_IgnoresCallbacksAfterTimeoutCommit() {
        let coordinator = TranscriptionCommitCoordinator()

        coordinator.beginSession()
        coordinator.updatePartialText("texto parcial")

        XCTAssertEqual(coordinator.commitFromTimeout(), "texto parcial")
        XCTAssertNil(coordinator.commitFromFinal(""))
        XCTAssertEqual(coordinator.committedText, "texto parcial")
    }

    func testBeginSession_ClearsPreviousCommit() {
        let coordinator = TranscriptionCommitCoordinator()

        coordinator.beginSession()
        _ = coordinator.commitFromFinal("texto 1")

        coordinator.beginSession()
        coordinator.updatePartialText("texto 2")

        XCTAssertFalse(coordinator.hasCommittedText)
        XCTAssertEqual(coordinator.commitFromTimeout(), "texto 2")
    }
}
