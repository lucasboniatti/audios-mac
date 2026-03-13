import Cocoa

/// Controller for the search panel window
class SearchPanelController: NSWindowController {

    // MARK: - Properties
    private var searchField: NSSearchField!
    private var tableView: NSTableView!
    private var scrollView: NSScrollView!
    private var results: [Transcription] = []

    // MARK: - Singleton
    static let shared = SearchPanelController()

    // MARK: - Initialization
    private init() {
        // Create the panel window
        let panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 400, height: 300),
            styleMask: [.titled, .closable, .resizable],
            backing: .buffered,
            defer: false
        )
        panel.title = "Buscar no Histórico"
        panel.center()
        panel.isFloatingPanel = true
        panel.hidesOnDeactivate = false
        panel.minSize = NSSize(width: 300, height: 200)

        super.init(window: panel)

        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // MARK: - UI Setup
    private func setupUI() {
        guard let contentView = window?.contentView else { return }

        // Search field
        searchField = NSSearchField(frame: NSRect(x: 0, y: 0, width: 0, height: 24))
        searchField.placeholderString = "Buscar transcrições..."
        searchField.target = self
        searchField.action = #selector(searchFieldChanged(_:))
        searchField.bezelStyle = .roundedBezel

        // Table view for results
        tableView = NSTableView()
        tableView.headerView = nil
        tableView.style = .plain
        tableView.selectionHighlightStyle = .regular
        tableView.doubleAction = #selector(copySelectedRow(_:))
        tableView.target = self
        tableView.delegate = self
        tableView.dataSource = self

        // Create column
        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("TextColumn"))
        column.width = 350
        tableView.addTableColumn(column)

        // Scroll view
        scrollView = NSScrollView()
        scrollView.documentView = tableView
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false

        // Layout with Auto Layout
        let stackView = NSStackView()
        stackView.orientation = .vertical
        stackView.spacing = 8
        stackView.translatesAutoresizingMaskIntoConstraints = false

        contentView.addSubview(stackView)

        NSLayoutConstraint.activate([
            stackView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            stackView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 12),
            stackView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -12),
            stackView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -12)
        ])

        // Add search field
        searchField.translatesAutoresizingMaskIntoConstraints = false
        stackView.addArrangedSubview(searchField)

        // Add scroll view
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        stackView.addArrangedSubview(scrollView)

        NSLayoutConstraint.activate([
            scrollView.heightAnchor.constraint(greaterThanOrEqualToConstant: 200)
        ])

        // Initial results
        loadInitialResults()
    }

    // MARK: - Actions
    @objc private func searchFieldChanged(_ sender: NSSearchField) {
        let query = sender.stringValue
        search(query)
    }

    @objc private func copySelectedRow(_ sender: NSTableView) {
        let row = tableView.selectedRow
        guard row >= 0 && row < results.count else { return }

        let transcription = results[row]
        ClipboardService.shared.copy(transcription.text)
        print("Copied from search: \(transcription.text.prefix(30))...")

        // Close panel after copying
        close()
    }

    // MARK: - Public Methods
    func showPanel() {
        showWindow(nil)
        window?.makeKeyAndOrderFront(nil)
        searchField.becomeFirstResponder()
        loadInitialResults()
    }

    // MARK: - Private Methods
    private func search(_ query: String) {
        results = HistoryController.shared.searchTranscriptions(query: query)
        tableView.reloadData()

        // Update window title based on results
        window?.title = results.isEmpty
            ? "Buscar no Histórico - Nenhum resultado"
            : "Buscar no Histórico - \(results.count) resultado(s)"
    }

    private func loadInitialResults() {
        searchField.stringValue = ""
        results = HistoryController.shared.getRecentTranscriptions()
        tableView.reloadData()
        window?.title = "Buscar no Histórico"
    }
}

// MARK: - NSTableViewDataSource
extension SearchPanelController: NSTableViewDataSource {
    func numberOfRows(in tableView: NSTableView) -> Int {
        return results.count
    }
}

// MARK: - NSTableViewDelegate
extension SearchPanelController: NSTableViewDelegate {
    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        guard row < results.count else { return nil }

        let transcription = results[row]

        // Create or reuse cell
        let cellIdentifier = NSUserInterfaceItemIdentifier("TranscriptionCell")
        var cell = tableView.makeView(withIdentifier: cellIdentifier, owner: nil) as? NSTableCellView

        if cell == nil {
            cell = NSTableCellView()
            cell?.identifier = cellIdentifier

            // Text field
            let textField = NSTextField()
            textField.isEditable = false
            textField.isBordered = false
            textField.backgroundColor = .clear
            textField.maximumNumberOfLines = 2
            textField.lineBreakMode = .byTruncatingTail
            textField.translatesAutoresizingMaskIntoConstraints = false

            cell?.addSubview(textField)
            cell?.textField = textField

            NSLayoutConstraint.activate([
                textField.leadingAnchor.constraint(equalTo: cell!.leadingAnchor, constant: 4),
                textField.trailingAnchor.constraint(equalTo: cell!.trailingAnchor, constant: -4),
                textField.topAnchor.constraint(equalTo: cell!.topAnchor, constant: 2),
                textField.bottomAnchor.constraint(equalTo: cell!.bottomAnchor, constant: -2)
            ])
        }

        // Configure cell
        cell?.textField?.stringValue = transcription.text

        return cell
    }

    func tableView(_ tableView: NSTableView, heightOfRow row: Int) -> CGFloat {
        return 36
    }
}