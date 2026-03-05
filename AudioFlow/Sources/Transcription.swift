import CoreData
import Foundation

@objc(Transcription)
public class Transcription: NSManagedObject {
    @NSManaged public var id: UUID
    @NSManaged public var text: String
    @NSManaged public var timestamp: Date
}

// MARK: - Fetch Request
extension Transcription {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<Transcription> {
        return NSFetchRequest<Transcription>(entityName: "Transcription")
    }
}

// MARK: - Identifiable
extension Transcription: Identifiable {}