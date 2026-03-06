import XCTest
import Cocoa

// MARK: - Integration Tests

/// Integration tests for the complete AudioFlow workflow
final class IntegrationTests: XCTestCase {

    // MARK: - Setup

    override func setUp() {
        super.setUp()
        // Clear clipboard for clean tests
        NSPasteboard.general.clearContents()
    }

    override func tearDown() {
        NSPasteboard.general.clearContents()
        super.tearDown()
    }

    // MARK: - Clipboard Integration

    func testClipboard_FullWorkflow() {
        // Given - Simulate transcription result
        let transcriptionText = "Esta é uma transcrição de teste"

        // When - Copy to clipboard
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(transcriptionText, forType: .string)

        // Then - Verify clipboard contains the text
        let result = pasteboard.string(forType: .string)
        XCTAssertEqual(result, transcriptionText, "Clipboard should contain the transcription")
    }

    func testClipboard_MultipleOperations() {
        // Given
        let texts = ["Primeiro", "Segundo", "Terceiro"]
        let pasteboard = NSPasteboard.general

        // When - Multiple copy operations
        for text in texts {
            pasteboard.clearContents()
            pasteboard.setString(text, forType: .string)
        }

        // Then - Last text should be in clipboard
        XCTAssertEqual(pasteboard.string(forType: .string), "Terceiro")
    }

    func testClipboard_SpecialCharacters() {
        // Given
        let specialTexts = [
            "Olá, mundo! 🎉",
            "Café - 10€",
            "Line1\nLine2\tTab",
            "𝕌𝕟𝕚𝕔𝕠𝕕𝕖"
        ]
        let pasteboard = NSPasteboard.general

        for text in specialTexts {
            // When
            pasteboard.clearContents()
            pasteboard.setString(text, forType: .string)

            // Then
            XCTAssertEqual(pasteboard.string(forType: .string), text, "Should handle: \(text)")
        }
    }

    // MARK: - History Integration

    func testHistory_FullCycle() {
        // Given
        let history = TestHistoryManager(maxItems: 10)
        let transcriptions = ["Primeira", "Segunda", "Terceira"]

        // When - Add transcriptions
        for text in transcriptions {
            history.add(text)
        }

        // Then
        let allItems = history.getAll()
        XCTAssertEqual(allItems.count, 3, "Should have 3 items")

        // When - Search
        let results = history.search(query: "ra")

        // Then
        XCTAssertEqual(results.count, 2, "Should find 2 matches (Primeira, Terceira)")

        // When - Clear
        history.clear()

        // Then
        XCTAssertTrue(history.getAll().isEmpty, "Should be empty after clear")
    }

    func testHistory_FIFOWithLimit() {
        // Given
        let history = TestHistoryManager(maxItems: 5)

        // When - Add 7 items
        for i in 1...7 {
            history.add("Item \(i)")
        }

        // Then - Should have only 5
        let items = history.getAll()
        XCTAssertEqual(items.count, 5, "Should enforce FIFO limit")
        XCTAssertEqual(items.first?.text, "Item 3", "Oldest should be removed")
        XCTAssertEqual(items.last?.text, "Item 7", "Newest should be present")
    }

    // MARK: - Notification Integration

    func testNotification_TextCopiedIsPosted() {
        // Given
        let expectation = XCTestExpectation(description: "Notification posted")
        let testName = Notification.Name("textCopied")

        let observer = NotificationCenter.default.addObserver(
            forName: testName,
            object: nil,
            queue: .main
        ) { notification in
            XCTAssertNotNil(notification.userInfo?["text"])
            expectation.fulfill()
        }

        // When
        NotificationCenter.default.post(
            name: testName,
            object: nil,
            userInfo: ["text": "Test text"]
        )

        // Then
        wait(for: [expectation], timeout: 1.0)
        NotificationCenter.default.removeObserver(observer)
    }

    // MARK: - State Machine Integration

    func testAppState_FullTransitionCycle() {
        // Given - Start at idle
        var state: TestAppState = .idle

        // When - Start recording
        state = .recording
        XCTAssertFalse(state.canRecord)
        XCTAssertTrue(state.canStop)

        // When - Processing
        state = .processing(partialText: "Partial")
        XCTAssertFalse(state.canRecord)
        XCTAssertTrue(state.canStop)

        // When - Back to idle
        state = .idle
        XCTAssertTrue(state.canRecord)
        XCTAssertFalse(state.canStop)
    }
}

// MARK: - Performance Tests

/// Performance tests for NFR validation
final class PerformanceTests: XCTestCase {

    // MARK: - Latency Tests

    func testClipboard_WriteLatency() {
        // NFR: Clipboard operations should be < 100ms
        let pasteboard = NSPasteboard.general
        let text = "Performance test text"

        measure {
            pasteboard.clearContents()
            pasteboard.setString(text, forType: .string)
            _ = pasteboard.string(forType: .string)
        }
    }

    func testHistory_WriteLatency() {
        // NFR: History operations should be < 100ms
        let history = TestHistoryManager(maxItems: 10)

        measure {
            for i in 1...10 {
                history.add("Transcription \(i)")
            }
        }
    }

    func testHistory_SearchLatency() {
        // Given - Populate history
        let history = TestHistoryManager(maxItems: 100)
        for i in 1...100 {
            history.add("Transcription number \(i) with some longer text")
        }

        // When - Measure search
        measure {
            _ = history.search(query: "number")
        }
    }

    func testTranscription_CreationLatency() {
        // NFR: Transcription creation should be < 50ms
        measure {
            for _ in 1...100 {
                _ = TestTranscription(text: "Test transcription text")
            }
        }
    }

    // MARK: - Memory Tests

    func testMemory_HistorySize() {
        // NFR: History with 10 items should use < 10KB
        let history = TestHistoryManager(maxItems: 10)

        // Add 10 items with reasonable text length
        for i in 1...10 {
            history.add(String(repeating: "Test text \(i) ", count: 20))
        }

        let items = history.getAll()
        let totalCharacters = items.reduce(0) { $0 + $1.text.count }

        // Rough estimate: 1 char ≈ 2 bytes in Swift
        let estimatedBytes = totalCharacters * 2

        XCTAssertLessThan(estimatedBytes, 10_000, "History should use < 10KB")
    }

    func testMemory_TranscriptionModel() {
        // Given
        var transcriptions: [TestTranscription] = []

        // When - Create 100 transcriptions
        for i in 1...100 {
            transcriptions.append(TestTranscription(text: "Transcription \(i)"))
        }

        // Then - Should not cause memory issues
        XCTAssertEqual(transcriptions.count, 100)

        // Cleanup
        transcriptions.removeAll()
        XCTAssertTrue(transcriptions.isEmpty)
    }

    // MARK: - Concurrency Tests

    func testConcurrent_ClipboardAccess() {
        // Given
        let expectation = XCTestExpectation(description: "Concurrent access")
        expectation.expectedFulfillmentCount = 10
        let pasteboard = NSPasteboard.general

        // When - Concurrent writes
        DispatchQueue.concurrentPerform(iterations: 10) { i in
            DispatchQueue.main.async {
                pasteboard.clearContents()
                pasteboard.setString("Text \(i)", forType: .string)
                expectation.fulfill()
            }
        }

        // Then - Should complete without crash
        wait(for: [expectation], timeout: 5.0)
    }

    func testConcurrent_HistoryAccess() {
        // Given
        let expectation = XCTestExpectation(description: "Concurrent history")
        expectation.expectedFulfillmentCount = 20
        let history = TestHistoryManager(maxItems: 10)

        // When - Concurrent add and search
        DispatchQueue.concurrentPerform(iterations: 20) { i in
            if i % 2 == 0 {
                history.add("Item \(i)")
            } else {
                _ = history.search(query: "Item")
            }
            expectation.fulfill()
        }

        // Then - Should complete without crash
        wait(for: [expectation], timeout: 5.0)
    }
}

// MARK: - Test Helpers

// Note: TestTranscription, TestHistoryManager, and TestAppState are defined
// in ClipboardServiceTests.swift. This file reuses those types.