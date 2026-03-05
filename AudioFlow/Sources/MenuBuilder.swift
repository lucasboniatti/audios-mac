import Cocoa

/// Builds the menu bar dropdown menu for AudioFlow based on app state
class MenuBuilder {

    // MARK: - Build Menu

    static func buildMenu(for state: AppState, target: AnyObject? = nil) -> NSMenu {
        let menu = NSMenu()

        switch state {
        case .idle:
            buildIdleMenu(menu, target: target)

        case .recording:
            buildRecordingMenu(menu, target: target)

        case .processing(let partialText):
            buildProcessingMenu(menu, partialText: partialText, target: target)
        }

        return menu
    }

    // MARK: - IDLE Menu

    private static func buildIdleMenu(_ menu: NSMenu, target: AnyObject?) {
        // Record item
        let recordItem = NSMenuItem(
            title: "Gravar (Space)",
            action: #selector(AppDelegate.toggleRecording),
            keyEquivalent: ""
        )
        recordItem.target = target
        menu.addItem(recordItem)

        // Separator
        menu.addItem(NSMenuItem.separator())

        // About item
        let aboutItem = NSMenuItem(
            title: "Sobre AudioFlow",
            action: #selector(showAbout),
            keyEquivalent: ""
        )
        aboutItem.target = MenuBuilder.self
        menu.addItem(aboutItem)

        // Separator
        menu.addItem(NSMenuItem.separator())

        // Quit item
        let quitItem = NSMenuItem(
            title: "Sair",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q"
        )
        menu.addItem(quitItem)
    }

    // MARK: - RECORDING Menu

    private static func buildRecordingMenu(_ menu: NSMenu, target: AnyObject?) {
        // Stop item
        let stopItem = NSMenuItem(
            title: "Parar Gravação (Space)",
            action: #selector(AppDelegate.toggleRecording),
            keyEquivalent: ""
        )
        stopItem.target = target
        menu.addItem(stopItem)

        // Separator
        menu.addItem(NSMenuItem.separator())

        // Partial text (disabled, shows current transcription)
        let partialItem = NSMenuItem(
            title: "Transcribendo em tempo real...",
            action: nil,
            keyEquivalent: ""
        )
        partialItem.isEnabled = false
        menu.addItem(partialItem)

        // Separator
        menu.addItem(NSMenuItem.separator())

        // Cancel item
        let cancelItem = NSMenuItem(
            title: "Cancelar",
            action: #selector(AppDelegate.cancelOperation),
            keyEquivalent: ""
        )
        cancelItem.target = target
        menu.addItem(cancelItem)
    }

    // MARK: - PROCESSING Menu

    private static func buildProcessingMenu(_ menu: NSMenu, partialText: String, target: AnyObject?) {
        // Processing indicator
        let processingItem = NSMenuItem(
            title: "⏳ Processando...",
            action: nil,
            keyEquivalent: ""
        )
        processingItem.isEnabled = false
        menu.addItem(processingItem)

        // Partial text preview (if available)
        if !partialText.isEmpty {
            let previewText = partialText.count > 50
                ? String(partialText.prefix(50)) + "..."
                : partialText

            let previewItem = NSMenuItem(
                title: "\"\(previewText)\"",
                action: nil,
                keyEquivalent: ""
            )
            previewItem.isEnabled = false
            menu.addItem(previewItem)
        }

        // Separator
        menu.addItem(NSMenuItem.separator())

        // Cancel item
        let cancelItem = NSMenuItem(
            title: "Cancelar",
            action: #selector(AppDelegate.cancelOperation),
            keyEquivalent: ""
        )
        cancelItem.target = target
        menu.addItem(cancelItem)
    }

    // MARK: - Actions

    @objc static func showAbout() {
        NSApp.activate(ignoringOtherApps: true)
        NSApp.orderFrontStandardAboutPanel(nil)
    }
}