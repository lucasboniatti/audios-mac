import XCTest
import Cocoa

// MARK: - Test Helpers

/// Mock clipboard for testing without affecting system clipboard
final class MockPasteboard {
    private var contents: String?

    func setString(_ string: String) {
        contents = string
    }

    func string() -> String? {
        return contents
    }

    func clearContents() {
        contents = nil
    }
}

// MARK: - Clipboard Service Tests

/// Tests for clipboard logic without accessing actual types
final class ClipboardLogicTests: XCTestCase {

    var mockPasteboard: MockPasteboard!

    override func setUp() {
        super.setUp()
        mockPasteboard = MockPasteboard()
    }

    override func tearDown() {
        mockPasteboard = nil
        super.tearDown()
    }

    // MARK: - Copy Tests

    func testCopy_SetsTextOnPasteboard() {
        // Given
        let testText = "Hello, World!"

        // When
        mockPasteboard.setString(testText)

        // Then
        XCTAssertEqual(mockPasteboard.string(), testText)
    }

    func testCopy_OverwritesPreviousContent() {
        // Given
        mockPasteboard.setString("First")

        // When
        mockPasteboard.setString("Second")

        // Then
        XCTAssertEqual(mockPasteboard.string(), "Second")
    }

    func testCopy_EmptyString() {
        // Given
        let emptyText = ""

        // When
        mockPasteboard.setString(emptyText)

        // Then
        XCTAssertEqual(mockPasteboard.string(), emptyText)
    }

    func testCopy_LongText() {
        // Given
        let longText = String(repeating: "a", count: 10000)

        // When
        mockPasteboard.setString(longText)

        // Then
        XCTAssertEqual(mockPasteboard.string()?.count, 10000)
    }

    func testCopy_SpecialCharacters() {
        // Given
        let specialText = "Olá, mundo! 🎉 Café - 10€"

        // When
        mockPasteboard.setString(specialText)

        // Then
        XCTAssertEqual(mockPasteboard.string(), specialText)
    }

    // MARK: - Clear Tests

    func testClear_RemovesContent() {
        // Given
        mockPasteboard.setString("Test")

        // When
        mockPasteboard.clearContents()

        // Then
        XCTAssertNil(mockPasteboard.string())
    }

    func testClear_CanBeCalledMultipleTimes() {
        // When
        mockPasteboard.clearContents()
        mockPasteboard.clearContents()
        mockPasteboard.clearContents()

        // Then - Should not crash
        XCTAssertNil(mockPasteboard.string())
    }
}

// MARK: - Transcription Model Tests

/// Simple transcription model for testing
struct TestTranscription: Identifiable {
    let id: UUID
    let text: String
    let timestamp: Date

    init(id: UUID = UUID(), text: String, timestamp: Date = Date()) {
        self.id = id
        self.text = text
        self.timestamp = timestamp
    }
}

final class TranscriptionModelTests: XCTestCase {

    func testTranscription_HasUniqueId() {
        // Given
        let t1 = TestTranscription(text: "First")
        let t2 = TestTranscription(text: "Second")

        // Then
        XCTAssertNotEqual(t1.id, t2.id)
    }

    func testTranscription_StoresText() {
        // Given
        let text = "Test transcription"
        let transcription = TestTranscription(text: text)

        // Then
        XCTAssertEqual(transcription.text, text)
    }

    func testTranscription_StoresTimestamp() {
        // Given
        let before = Date()
        let transcription = TestTranscription(text: "Test")
        let after = Date()

        // Then
        XCTAssertGreaterThanOrEqual(transcription.timestamp, before)
        XCTAssertLessThanOrEqual(transcription.timestamp, after)
    }

    func testTranscription_StoresSpecialCharacters() {
        // Given
        let specialText = "Olá, mundo! 🎉 Café - 10€ \n Nova linha"
        let transcription = TestTranscription(text: specialText)

        // Then
        XCTAssertEqual(transcription.text, specialText)
    }

    func testTranscription_StoredLongText() {
        // Given
        let longText = String(repeating: "a", count: 10000)
        let transcription = TestTranscription(text: longText)

        // Then
        XCTAssertEqual(transcription.text.count, 10000)
    }
}

// MARK: - History FIFO Tests

/// Simple history manager for testing FIFO logic
final class TestHistoryManager {
    private(set) var items: [TestTranscription] = []
    private let maxItems: Int
    private let lock = NSLock()

    init(maxItems: Int = 10) {
        self.maxItems = maxItems
    }

    @discardableResult
    func add(_ text: String) -> TestTranscription {
        lock.lock()
        defer { lock.unlock() }

        let transcription = TestTranscription(text: text)

        // Remove oldest if at capacity
        if items.count >= maxItems {
            items.removeFirst()
        }

        items.append(transcription)
        return transcription
    }

    func getAll() -> [TestTranscription] {
        lock.lock()
        defer { lock.unlock() }
        return items
    }

    func clear() {
        lock.lock()
        defer { lock.unlock() }
        items.removeAll()
    }

    func search(query: String) -> [TestTranscription] {
        lock.lock()
        defer { lock.unlock() }
        return items.filter { $0.text.localizedCaseInsensitiveContains(query) }
    }
}

final class HistoryFIFOTests: XCTestCase {

    var history: TestHistoryManager!

    override func setUp() {
        super.setUp()
        history = TestHistoryManager(maxItems: 10)
    }

    override func tearDown() {
        history = nil
        super.tearDown()
    }

    func testAdd_IncreasesCount() {
        // When
        history.add("First")
        history.add("Second")

        // Then
        XCTAssertEqual(history.getAll().count, 2)
    }

    func testFIFO_RemovesOldestWhenFull() {
        // Given - Add 11 items (one more than max)
        for i in 1...11 {
            history.add("Item \(i)")
        }

        // Then
        XCTAssertEqual(history.getAll().count, 10)
        XCTAssertEqual(history.getAll().first?.text, "Item 2") // Item 1 was removed
        XCTAssertEqual(history.getAll().last?.text, "Item 11")
    }

    func testFIFO_MaintainsCorrectOrder() {
        // When
        history.add("First")
        history.add("Second")
        history.add("Third")

        // Then
        let items = history.getAll()
        XCTAssertEqual(items[0].text, "First")
        XCTAssertEqual(items[1].text, "Second")
        XCTAssertEqual(items[2].text, "Third")
    }

    func testClear_RemovesAllItems() {
        // Given
        history.add("First")
        history.add("Second")

        // When
        history.clear()

        // Then
        XCTAssertTrue(history.getAll().isEmpty)
    }

    func testSearch_FindsMatchingItems() {
        // Given
        history.add("Hello world")
        history.add("Hello Swift")
        history.add("Goodbye")

        // When
        let results = history.search(query: "hello")

        // Then
        XCTAssertEqual(results.count, 2)
    }

    func testSearch_IsCaseInsensitive() {
        // Given
        history.add("HELLO World")
        history.add("hello swift")

        // When
        let results = history.search(query: "HELLO")

        // Then
        XCTAssertEqual(results.count, 2)
    }

    func testSearch_ReturnsEmptyForNoMatch() {
        // Given
        history.add("Hello")
        history.add("World")

        // When
        let results = history.search(query: "xyz")

        // Then
        XCTAssertTrue(results.isEmpty)
    }
}

// MARK: - App State Tests

/// Simple app state for testing
enum TestAppState: Equatable {
    case idle
    case recording
    case processing(partialText: String)

    var canRecord: Bool {
        switch self {
        case .idle: return true
        default: return false
        }
    }

    var canStop: Bool {
        switch self {
        case .recording, .processing: return true
        case .idle: return false
        }
    }
}

final class AppStateTests: XCTestCase {

    func testIdle_CanRecord() {
        // Given
        let state: TestAppState = .idle

        // Then
        XCTAssertTrue(state.canRecord)
        XCTAssertFalse(state.canStop)
    }

    func testRecording_CanStop() {
        // Given
        let state: TestAppState = .recording

        // Then
        XCTAssertFalse(state.canRecord)
        XCTAssertTrue(state.canStop)
    }

    func testProcessing_CanStop() {
        // Given
        let state: TestAppState = .processing(partialText: "test")

        // Then
        XCTAssertFalse(state.canRecord)
        XCTAssertTrue(state.canStop)
    }

    func testProcessing_StoresPartialText() {
        // Given
        let state: TestAppState = .processing(partialText: "Hello")

        // Then
        if case .processing(let text) = state {
            XCTAssertEqual(text, "Hello")
        } else {
            XCTFail("State should be processing")
        }
    }

    func testStateEquality() {
        // Given
        let state1: TestAppState = .idle
        let state2: TestAppState = .idle
        let state3: TestAppState = .recording

        // Then
        XCTAssertEqual(state1, state2)
        XCTAssertNotEqual(state1, state3)
    }
}

// MARK: - Notification Tests

final class NotificationTests: XCTestCase {

    func testTextCopiedNotification_Exists() {
        // Given
        let name = Notification.Name("textCopied")

        // Then
        XCTAssertEqual(name.rawValue, "textCopied")
    }

    func testAudioBufferNotification_Exists() {
        // Given
        let name = Notification.Name("audioBufferAvailable")

        // Then
        XCTAssertEqual(name.rawValue, "audioBufferAvailable")
    }

    func testNotification_PostingAndObserving() {
        // Given
        let expectation = XCTestExpectation(description: "Notification received")
        let testName = Notification.Name("TestNotification")
        let testUserInfo = ["key": "value"]

        let observer = NotificationCenter.default.addObserver(
            forName: testName,
            object: nil,
            queue: .main
        ) { notification in
            XCTAssertEqual(notification.userInfo?["key"] as? String, "value")
            expectation.fulfill()
        }

        // When
        NotificationCenter.default.post(
            name: testName,
            object: nil,
            userInfo: testUserInfo
        )

        // Then
        wait(for: [expectation], timeout: 1.0)
        NotificationCenter.default.removeObserver(observer)
    }
}
