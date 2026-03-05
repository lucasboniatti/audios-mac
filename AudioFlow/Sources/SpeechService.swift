import Speech
import AVFoundation
import Foundation

// MARK: - Speech Service Delegate Protocol

protocol SpeechServiceDelegate: AnyObject {
    func speechService(_ service: SpeechService, didReceivePartialResult text: String)
    func speechService(_ service: SpeechService, didReceiveFinalResult text: String)
    func speechService(_ service: SpeechService, didFailWithError error: Error)
    func speechServiceDidChangeAvailability(_ service: SpeechService, isAvailable: Bool)
}

// MARK: - Speech Service

/// Service for transcribing audio using Apple's Speech Recognition framework
class SpeechService: NSObject {

    // MARK: - Properties

    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?

    weak var delegate: SpeechServiceDelegate?

    var isAvailable: Bool {
        return speechRecognizer?.isAvailable ?? false
    }

    var isRecording: Bool {
        return recognitionTask != nil && recognitionTask?.state != .completed
    }

    // MARK: - Initialization

    override init() {
        super.init()
        // Initialize with Portuguese (Brazil) locale
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "pt_BR"))
    }

    deinit {
        stopRecognition()
    }

    // MARK: - Authorization

    /// Request speech recognition authorization
    /// - Parameter completion: Called with true if authorized, false otherwise
    func requestAuthorization(completion: @escaping (Bool) -> Void) {
        SFSpeechRecognizer.requestAuthorization { status in
            DispatchQueue.main.async {
                switch status {
                case .authorized:
                    print("Speech recognition authorized")
                    completion(true)

                case .denied:
                    print("Speech recognition denied")
                    completion(false)

                case .restricted:
                    print("Speech recognition restricted")
                    completion(false)

                case .notDetermined:
                    print("Speech recognition not determined")
                    completion(false)

                @unknown default:
                    print("Speech recognition unknown status")
                    completion(false)
                }
            }
        }
    }

    /// Check if speech recognition is authorized
    var isAuthorized: Bool {
        return SFSpeechRecognizer.authorizationStatus() == .authorized
    }

    // MARK: - Recognition Control

    /// Start speech recognition
    /// - Throws: SpeechError if recognition cannot be started
    func startRecognition() throws {
        // Check authorization
        guard isAuthorized else {
            throw SpeechError.notAuthorized
        }

        // Check availability
        guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
            throw SpeechError.notAvailable
        }

        // Cancel any existing task
        stopRecognition()

        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            throw SpeechError.requestCreationFailed
        }

        // Configure for real-time results
        recognitionRequest.shouldReportPartialResults = true

        // Note: addsPunctuation is only available in macOS 13+
        // For macOS 12 compatibility, we don't set it

        // Start recognition task
        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            self?.handleRecognitionResult(result, error: error)
        }

        print("Speech recognition started")
    }

    /// Append audio buffer to recognition request
    /// - Parameter buffer: Audio buffer from microphone
    func appendAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        recognitionRequest?.append(buffer)
    }

    /// Stop speech recognition
    func stopRecognition() {
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil
        print("Speech recognition stopped")
    }

    // MARK: - Private Methods

    private func handleRecognitionResult(_ result: SFSpeechRecognitionResult?, error: Error?) {
        if let error = error {
            // Check if it's a cancellation error (user stopped)
            let nsError = error as NSError
            if nsError.domain == "kLSRErrorDomain" && nsError.code == 216 {
                // Recognition was cancelled - not a real error
                print("Recognition was cancelled")
                return
            }

            print("Recognition error: \(error.localizedDescription)")
            delegate?.speechService(self, didFailWithError: error)
            return
        }

        guard let result = result else { return }

        let text = result.bestTranscription.formattedString

        if result.isFinal {
            print("Final result: \(text)")
            delegate?.speechService(self, didReceiveFinalResult: text)
        } else {
            print("Partial result: \(text)")
            delegate?.speechService(self, didReceivePartialResult: text)
        }
    }
}

// MARK: - Speech Errors

enum SpeechError: LocalizedError {
    case notAuthorized
    case notAvailable
    case requestCreationFailed
    case noSpeechDetected

    var errorDescription: String? {
        switch self {
        case .notAuthorized:
            return "Speech recognition not authorized. Please grant permission in System Preferences."
        case .notAvailable:
            return "Speech recognition is not available. Check your internet connection."
        case .requestCreationFailed:
            return "Failed to create speech recognition request."
        case .noSpeechDetected:
            return "No speech was detected."
        }
    }
}