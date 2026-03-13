import Foundation

/// Coordinates a single transcription session so late callbacks do not overwrite
/// the text that has already been copied to the clipboard and persisted.
final class TranscriptionCommitCoordinator {

    private(set) var partialText = ""
    private(set) var committedText: String?

    var hasCommittedText: Bool {
        committedText != nil
    }

    func beginSession() {
        partialText = ""
        committedText = nil
    }

    func updatePartialText(_ text: String) {
        guard committedText == nil else { return }
        partialText = normalize(text)
    }

    func commitFromFinal(_ text: String) -> String? {
        commit(preferredText: text, fallbackText: partialText)
    }

    func commitFromTimeout() -> String? {
        commit(preferredText: partialText)
    }

    func commitFromErrorFallback() -> String? {
        commit(preferredText: partialText)
    }

    private func commit(preferredText: String, fallbackText: String? = nil) -> String? {
        guard committedText == nil else { return nil }

        let normalizedPreferredText = normalize(preferredText)
        if !normalizedPreferredText.isEmpty {
            committedText = normalizedPreferredText
            return normalizedPreferredText
        }

        guard let fallbackText else { return nil }

        let normalizedFallbackText = normalize(fallbackText)
        guard !normalizedFallbackText.isEmpty else { return nil }

        committedText = normalizedFallbackText
        return normalizedFallbackText
    }

    private func normalize(_ text: String) -> String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
