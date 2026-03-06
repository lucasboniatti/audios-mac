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

        // History submenu
        buildHistoryMenu(into: menu, target: target)

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

    // MARK: - History Menu

    private static func buildHistoryMenu(into menu: NSMenu, target: AnyObject?) {
        let history = HistoryController.shared.getRecentTranscriptions()

        // History menu item with submenu
        let historyItem = NSMenuItem(
            title: "Histórico",
            action: nil,
            keyEquivalent: ""
        )

        let historySubmenu = NSMenu()

        if history.isEmpty {
            // No transcriptions yet
            let emptyItem = NSMenuItem(
                title: "Nenhuma transcrição",
                action: nil,
                keyEquivalent: ""
            )
            emptyItem.isEnabled = false
            historySubmenu.addItem(emptyItem)
        } else {
            // Add each transcription to submenu
            for transcription in history {
                // Create preview (first 30 chars + "...")
                let preview = transcription.text.count > 30
                    ? String(transcription.text.prefix(30)) + "..."
                    : transcription.text

                let item = NSMenuItem(
                    title: preview,
                    action: #selector(AppDelegate.copyTranscriptionFromHistory(_:)),
                    keyEquivalent: ""
                )
                item.target = target
                item.representedObject = transcription
                item.toolTip = formatTooltip(for: transcription)
                historySubmenu.addItem(item)
            }

            // Separator and clear option
            historySubmenu.addItem(NSMenuItem.separator())

            let clearItem = NSMenuItem(
                title: "Limpar Histórico",
                action: #selector(AppDelegate.clearHistory),
                keyEquivalent: ""
            )
            clearItem.target = target
            historySubmenu.addItem(clearItem)
        }

        historyItem.submenu = historySubmenu
        menu.addItem(historyItem)

        // Search item (below history)
        let searchItem = NSMenuItem(
            title: "Buscar no Histórico...",
            action: #selector(AppDelegate.showSearchPanel),
            keyEquivalent: "f"
        )
        searchItem.target = target
        menu.addItem(searchItem)
    }

    // MARK: - History Helpers

    private static func formatTooltip(for transcription: Transcription) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        formatter.locale = Locale(identifier: "pt_BR")

        let dateString = formatter.string(from: transcription.timestamp)
        return "\(dateString)\n\nClique para copiar"
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