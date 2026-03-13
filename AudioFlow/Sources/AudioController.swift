import AVFoundation
import Foundation

// MARK: - Notification Names

extension Notification.Name {
    static let audioBufferAvailable = Notification.Name("audioBufferAvailable")
    static let audioRecordingError = Notification.Name("audioRecordingError")
}

// MARK: - Audio Controller

/// Controller for capturing audio from the microphone
class AudioController {

    // MARK: - Properties

    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var isRecording = false

    // MARK: - Recording Control

    /// Start recording audio from the default microphone
    /// - Throws: Error if microphone is unavailable or permission denied
    func startRecording() throws {
        guard !isRecording else {
            print("Already recording")
            return
        }

        // Request microphone permission first
        AVCaptureDevice.requestAccess(for: .audio) { [weak self] granted in
            if !granted {
                print("Microphone permission denied")
                DispatchQueue.main.async {
                    NotificationCenter.default.post(
                        name: .audioRecordingError,
                        object: nil,
                        userInfo: ["error": AudioError.permissionDenied]
                    )
                }
                return
            }
            print("Microphone permission granted")
            DispatchQueue.main.async {
                do {
                    try self?.startRecordingInternal()
                } catch {
                    NotificationCenter.default.post(
                        name: .audioRecordingError,
                        object: nil,
                        userInfo: ["error": error]
                    )
                }
            }
        }
    }
    
    private func startRecordingInternal() throws {
        // Create audio engine
        audioEngine = AVAudioEngine()
        guard let audioEngine = audioEngine else {
            throw AudioError.engineCreationFailed
        }

        // Get input node
        inputNode = audioEngine.inputNode
        guard let inputNode = inputNode else {
            throw AudioError.inputNodeUnavailable
        }

        // Get recording format from input node
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        print("Audio format: \(recordingFormat)")
        print("Sample rate: \(recordingFormat.sampleRate) Hz")
        print("Channels: \(recordingFormat.channelCount)")

        // Install tap to capture audio buffers
        inputNode.installTap(
            onBus: 0,
            bufferSize: 1024,
            format: recordingFormat
        ) { [weak self] buffer, time in
            self?.processAudioBuffer(buffer, time: time)
        }

        // Start the audio engine
        try audioEngine.start()

        isRecording = true
        print("Audio recording started")
    }

    /// Stop recording audio
    func stopRecording() {
        guard isRecording else {
            print("Not recording")
            return
        }

        // Remove tap from input node
        inputNode?.removeTap(onBus: 0)

        // Stop audio engine
        audioEngine?.stop()
        audioEngine = nil
        inputNode = nil

        isRecording = false
        print("Audio recording stopped")
    }

    // MARK: - Private Methods

    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer, time: AVAudioTime) {
        // Post notification with the audio buffer for SpeechService
        NotificationCenter.default.post(
            name: .audioBufferAvailable,
            object: nil,
            userInfo: ["buffer": buffer, "time": time]
        )
        // Log every buffer to debug
        print("Audio buffer: \(buffer.frameLength) frames at \(time.sampleTime)")
    }
}

// MARK: - Audio Errors

enum AudioError: LocalizedError {
    case engineCreationFailed
    case inputNodeUnavailable
    case permissionDenied
    case deviceUnavailable

    var errorDescription: String? {
        switch self {
        case .engineCreationFailed:
            return "Failed to create audio engine"
        case .inputNodeUnavailable:
            return "Microphone input unavailable"
        case .permissionDenied:
            return "Microphone permission denied"
        case .deviceUnavailable:
            return "No microphone device available"
        }
    }
}