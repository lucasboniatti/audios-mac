import CoreData
import Foundation

/// Service responsible for managing CoreData persistence
class PersistenceService {

    // MARK: - Singleton
    static let shared = PersistenceService()

    // MARK: - Properties
    let container: NSPersistentContainer

    var viewContext: NSManagedObjectContext {
        return container.viewContext
    }

    // MARK: - Initialization
    private init() {
        // Create the managed object model programmatically
        let model = NSManagedObjectModel()

        // Create Transcription entity
        let transcriptionEntity = NSEntityDescription()
        transcriptionEntity.name = "Transcription"
        transcriptionEntity.managedObjectClassName = "Transcription"

        // id attribute
        let idAttribute = NSAttributeDescription()
        idAttribute.name = "id"
        idAttribute.attributeType = .UUIDAttributeType
        idAttribute.isOptional = false

        // text attribute
        let textAttribute = NSAttributeDescription()
        textAttribute.name = "text"
        textAttribute.attributeType = .stringAttributeType
        textAttribute.isOptional = false

        // timestamp attribute
        let timestampAttribute = NSAttributeDescription()
        timestampAttribute.name = "timestamp"
        timestampAttribute.attributeType = .dateAttributeType
        timestampAttribute.isOptional = false

        transcriptionEntity.properties = [idAttribute, textAttribute, timestampAttribute]
        model.entities = [transcriptionEntity]

        // Create container
        container = NSPersistentContainer(name: "AudioFlow", managedObjectModel: model)

        // Load persistent stores
        container.loadPersistentStores { description, error in
            if let error = error {
                fatalError("CoreData failed to load: \(error.localizedDescription)")
            }
            print("CoreData loaded successfully: \(description.url?.path ?? "in-memory")")
        }

        // Configure view context
        container.viewContext.automaticallyMergesChangesFromParent = true
        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    }

    // MARK: - Save
    func save() {
        let context = viewContext
        if context.hasChanges {
            do {
                try context.save()
                print("CoreData saved successfully")
            } catch {
                print("CoreData save error: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Create
    func createTranscription(text: String) -> Transcription {
        let context = viewContext
        let transcription = Transcription(context: context)
        transcription.id = UUID()
        transcription.text = text
        transcription.timestamp = Date()
        save()
        return transcription
    }

    // MARK: - Read
    func fetchAllTranscriptions() -> [Transcription] {
        let request: NSFetchRequest<Transcription> = Transcription.fetchRequest()
        request.sortDescriptors = [NSSortDescriptor(key: "timestamp", ascending: false)]

        do {
            return try viewContext.fetch(request)
        } catch {
            print("Fetch error: \(error.localizedDescription)")
            return []
        }
    }

    func fetchRecentTranscriptions(limit: Int = 10) -> [Transcription] {
        let request: NSFetchRequest<Transcription> = Transcription.fetchRequest()
        request.sortDescriptors = [NSSortDescriptor(key: "timestamp", ascending: false)]
        request.fetchLimit = limit

        do {
            return try viewContext.fetch(request)
        } catch {
            print("Fetch error: \(error.localizedDescription)")
            return []
        }
    }

    // MARK: - Delete
    func deleteTranscription(_ transcription: Transcription) {
        viewContext.delete(transcription)
        save()
    }

    func deleteAllTranscriptions() {
        let fetchRequest: NSFetchRequest<NSFetchRequestResult> = Transcription.fetchRequest()
        let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)

        do {
            try viewContext.execute(deleteRequest)
            save()
        } catch {
            print("Delete all error: \(error.localizedDescription)")
        }
    }
}