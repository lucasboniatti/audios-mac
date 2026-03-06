import CoreData
import Foundation

/// Controller responsible for managing transcription history with FIFO limit
class HistoryController {

    // MARK: - Singleton
    static let shared = HistoryController()

    // MARK: - Constants
    private let maxItems = 10

    // MARK: - Initialization
    private init() {}

    // MARK: - Public Methods

    /// Save a new transcription and enforce FIFO limit
    /// - Parameter text: The transcription text to save
    /// - Returns: The created Transcription object
    @discardableResult
    func saveTranscription(_ text: String) -> Transcription {
        // Create and save the transcription
        let transcription = PersistenceService.shared.createTranscription(text: text)

        // Enforce FIFO limit after saving
        enforceFIFOLimit()

        return transcription
    }

    /// Get recent transcriptions
    /// - Parameter limit: Maximum number of transcriptions to return (default: 10)
    /// - Returns: Array of Transcription objects, most recent first
    func getRecentTranscriptions(limit: Int = 10) -> [Transcription] {
        return PersistenceService.shared.fetchRecentTranscriptions(limit: limit)
    }

    /// Get all transcriptions (for cleanup purposes)
    /// - Returns: Array of all Transcription objects
    func getAllTranscriptions() -> [Transcription] {
        return PersistenceService.shared.fetchAllTranscriptions()
    }

    /// Delete a specific transcription
    /// - Parameter transcription: The transcription to delete
    func deleteTranscription(_ transcription: Transcription) {
        PersistenceService.shared.deleteTranscription(transcription)
    }

    /// Delete all transcriptions
    func deleteAllTranscriptions() {
        PersistenceService.shared.deleteAllTranscriptions()
    }

    /// Copy transcription text to clipboard
    /// - Parameter transcription: The transcription to copy
    func copyToClipboard(_ transcription: Transcription) {
        ClipboardService.shared.copy(transcription.text)
    }

    // MARK: - Search

    /// Search transcriptions by text (case-insensitive, diacritic-insensitive)
    /// - Parameter query: The search query
    /// - Returns: Array of matching Transcription objects, most recent first
    func searchTranscriptions(query: String) -> [Transcription] {
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
            return getRecentTranscriptions()
        }

        let request: NSFetchRequest<Transcription> = Transcription.fetchRequest()
        request.sortDescriptors = [NSSortDescriptor(key: "timestamp", ascending: false)]
        // CONTAINS[cd] = case-insensitive and diacritic-insensitive
        request.predicate = NSPredicate(format: "text CONTAINS[cd] %@", query)

        do {
            return try PersistenceService.shared.viewContext.fetch(request)
        } catch {
            print("Search error: \(error.localizedDescription)")
            return []
        }
    }

    // MARK: - Private Methods

    /// Enforce FIFO limit by removing oldest transcriptions when exceeding maxItems
    private func enforceFIFOLimit() {
        let allTranscriptions = PersistenceService.shared.fetchAllTranscriptions()

        // Check if we need to remove any items
        if allTranscriptions.count > maxItems {
            // Sort by timestamp ascending (oldest first)
            let sortedAsc = allTranscriptions.sorted { $0.timestamp < $1.timestamp }

            // Calculate how many to remove
            let itemsToRemove = allTranscriptions.count - maxItems

            // Remove the oldest items
            for i in 0..<itemsToRemove {
                PersistenceService.shared.viewContext.delete(sortedAsc[i])
            }

            // Save changes
            PersistenceService.shared.save()

            print("HistoryController: Removed \(itemsToRemove) old transcription(s) to enforce FIFO limit")
        }
    }
}