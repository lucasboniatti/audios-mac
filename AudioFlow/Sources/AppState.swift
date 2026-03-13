import Foundation
import Combine

// MARK: - App State Enum

/// Represents the current state of the AudioFlow application
enum AppState: Equatable {
    case idle
    case recording
    case processing(partialText: String)

    /// Returns a user-friendly description of the state
    var description: String {
        switch self {
        case .idle:
            return "Pronto"
        case .recording:
            return "Gravando..."
        case .processing(let text):
            return "Processando: \(text.prefix(30))..."
        }
    }
}

// MARK: - App State Manager

/// Manages the application state with validated transitions
class AppStateManager: ObservableObject {

    // MARK: - Published Properties

    @Published private(set) var state: AppState = .idle

    // MARK: - Transition Validation

    /// Valid state transitions
    /// - IDLE → RECORDING (user starts recording)
    /// - RECORDING → PROCESSING (user stops recording)
    /// - PROCESSING → IDLE (transcription complete)
    func transition(to newState: AppState) -> Bool {
        let isValidTransition: Bool

        switch (state, newState) {
        case (.idle, .recording):
            isValidTransition = true
            print("State transition: IDLE → RECORDING")

        case (.recording, .processing):
            isValidTransition = true
            print("State transition: RECORDING → PROCESSING")

        case (.recording, .idle):
            // Cancel recording
            isValidTransition = true
            print("State transition: RECORDING → IDLE (cancelled)")

        case (.processing, .idle):
            isValidTransition = true
            print("State transition: PROCESSING → IDLE")

        case (.processing, .recording):
            // Cancel processing and start new recording
            isValidTransition = true
            print("State transition: PROCESSING → RECORDING")

        default:
            isValidTransition = false
            print("Invalid transition attempted: \(state) → \(newState)")
        }

        if isValidTransition {
            state = newState
        }

        return isValidTransition
    }

    // MARK: - Convenience Methods

    /// Start recording (from IDLE)
    func startRecording() -> Bool {
        return transition(to: .recording)
    }

    /// Stop recording and start processing
    func stopRecording(partialText: String = "") -> Bool {
        if state == .recording {
            return transition(to: .processing(partialText: partialText))
        }
        return false
    }

    /// Complete processing (return to IDLE)
    func completeProcessing() -> Bool {
        return transition(to: .idle)
    }

    /// Cancel current operation
    func cancel() {
        switch state {
        case .recording, .processing:
            _ = transition(to: .idle)
        case .idle:
            break
        }
    }

    /// Update partial text during processing
    func updatePartialText(_ text: String) {
        if case .processing = state {
            state = .processing(partialText: text)
        }
    }
}