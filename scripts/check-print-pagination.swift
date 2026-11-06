import AppKit
import PDFKit
import WebKit

// Exercise the real page and Apple's paginated print API. createPDF() and
// emulating print CSS alone do not exercise browser page breaks.
@MainActor final class PrintCheck: NSObject, WKNavigationDelegate {
    let url = URL(string: CommandLine.arguments[1])!
    let perPage = Int(CommandLine.arguments[2])!
    let count = Int(CommandLine.arguments[3])!
    let output = URL(fileURLWithPath: CommandLine.arguments[4])
    var view: WKWebView!
    var window: NSWindow!
    var printing = false
    var previewCardTopMm: Double = 0

    func start() throws {
        let fixture = try String(contentsOfFile: CommandLine.arguments[5], encoding: .utf8)
        let cards: [[String: Any]] = fixture.split(separator: "|").prefix(count).enumerated().map { index, record in
            let cells = record.split(separator: ";", omittingEmptySubsequences: false)
            return [
                "cardTitle": "card-\(index + 1)", "cardNumber": index + 1,
                "numbers": cells.dropFirst().prefix(27).map { Int($0).map { $0 as Any } ?? NSNull() },
            ]
        }
        var session: [String: Any] = [
            "game": ["filename": "Print regression", "cards": cards],
            "drawn": [], "paused": false, "target": "line", "stage": "print",
            "started": false, "cardsPerPage": perPage,
        ]
        if ProcessInfo.processInfo.environment["PRINT_CUSTOM_OPTIONS"] == "1" {
            session["printOptions"] = [
                "inkSaving": true, "largeNumbers": true, "borders": "square",
                "footer": "90-ball bingo · Community evening · A long custom footer to check clipping and pagination",
                "logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQ0AAAAASUVORK5CYII=",
            ]
        }
        let json = String(data: try JSONSerialization.data(withJSONObject: session), encoding: .utf8)!
        let encoded = String(data: try JSONSerialization.data(withJSONObject: [json]), encoding: .utf8)!
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.userContentController.addUserScript(WKUserScript(
            source: "localStorage.setItem('bingoEventSession.v1', \(encoded)[0]);",
            injectionTime: .atDocumentStart, forMainFrameOnly: true
        ))
        view = WKWebView(frame: NSRect(x: 0, y: 0, width: 390, height: 844), configuration: config)
        view.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1"
        view.navigationDelegate = self
        window = NSWindow(contentRect: view.frame, styleMask: [.borderless], backing: .buffered, defer: false)
        window.contentView = view
        view.load(URLRequest(url: url))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { poll() }

    func poll() {
        guard !printing else { return }
        view.evaluateJavaScript("document.querySelectorAll('.bingo-flow-print-only article').length") { value, _ in
            if (value as? Int) == self.count {
                self.printing = true
                DispatchQueue.main.async { self.printPDF() }
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { self.poll() }
            }
        }
    }

    func printPDF() {
        // Measure the card origin, not font selection bounds: DOM ranges and
        // PDFKit report different glyph extents across macOS/font versions.
        // A tiny, out-of-flow label exposes the printed origin without changing
        // card sizing. Its font metrics are negligible at the 1 mm tolerance.
        view.evaluateJavaScript("""
            (() => {
                const sheet = document.querySelector('.bingo-flow-sheet-page');
                const card = sheet.querySelector('article');
                for (const firstCard of [card, document.querySelector('.bingo-flow-print-only article')]) {
                    firstCard.style.position = 'relative';
                    const marker = document.createElement('span');
                    marker.textContent = 'BINGO_PRINT_ORIGIN';
                    marker.style.cssText = 'position:absolute;top:0;left:0;font:1px/1px monospace;';
                    firstCard.append(marker);
                }
                const page = sheet.getBoundingClientRect();
                return (card.getBoundingClientRect().top - page.top) / (page.width / 210);
            })()
            """) { value, _ in
                guard let position = value as? Double else { self.fail("Could not measure print preview") }
                self.previewCardTopMm = position
                self.startPrintOperation()
            }
    }

    func startPrintOperation() {
        let info = NSPrintInfo.shared.copy() as! NSPrintInfo
        info.paperSize = NSSize(width: 210 * 72 / 25.4, height: 297 * 72 / 25.4)
        info.topMargin = 12 * 72 / 25.4; info.bottomMargin = info.topMargin
        info.leftMargin = info.topMargin; info.rightMargin = info.topMargin
        info.horizontalPagination = .fit; info.verticalPagination = .automatic
        info.isHorizontallyCentered = false; info.isVerticallyCentered = false
        info.jobDisposition = .save
        info.dictionary()[NSPrintInfo.AttributeKey.jobSavingURL] = output
        let operation = view.printOperation(with: info)
        operation.canSpawnSeparateThread = true
        operation.showsPrintPanel = false; operation.showsProgressPanel = false
        // run() on the main thread only renders asynchronous preview placeholders.
        operation.runModal(for: window, delegate: self,
                           didRun: #selector(finished(_:success:context:)), contextInfo: nil)
    }

    @objc func finished(_ operation: NSPrintOperation, success: Bool, context: UnsafeMutableRawPointer?) {
        guard success, let pdf = PDFDocument(url: output) else { fail("Could not print PDF") }
        let expectedPages = (count + perPage - 1) / perPage
        guard pdf.pageCount == expectedPages else {
            fail("\(count) cards at \(perPage)/sheet: expected \(expectedPages) A4 pages, got \(pdf.pageCount)")
        }
        let pattern = try! NSRegularExpression(pattern: "#(\\d+)")
        let firstPage = pdf.page(at: 0)!
        let labelRange = ((firstPage.string ?? "") as NSString).range(of: "BINGO_PRINT_ORIGIN")
        guard labelRange.location != NSNotFound,
              let label = firstPage.selection(for: labelRange) else { fail("Missing card-origin marker on paper") }
        let paperTopMm = (firstPage.bounds(for: .mediaBox).height - label.bounds(for: firstPage).maxY) * 25.4 / 72
        guard abs(paperTopMm - previewCardTopMm) < 1 else {
            fail("Preview card at \(previewCardTopMm)mm differs from paper at \(paperTopMm)mm")
        }
        for index in 0..<pdf.pageCount {
            let text = pdf.page(at: index)!.string ?? ""
            let matches = pattern.matches(in: text, range: NSRange(text.startIndex..., in: text))
            let ids = matches.map { Int((text as NSString).substring(with: $0.range(at: 1)))! }
            let expected = Array((index * perPage + 1)...min((index + 1) * perPage, count))
            guard ids == expected else { fail("Page \(index + 1): expected cards \(expected), got \(ids)") }
            let footers = text.components(separatedBy: "90-ball bingo").count - 1
            guard footers == expected.count else { fail("Page \(index + 1): card footer clipped or duplicated") }
        }
        print("PASS: \(count) cards, \(perPage)/sheet, \(pdf.pageCount) A4 pages; all cards and footers fit")
        NSApplication.shared.terminate(nil)
    }

    func fail(_ message: String) -> Never {
        fputs("FAIL: \(message)\n", stderr)
        exit(1)
    }
}

MainActor.assumeIsolated {
    let app = NSApplication.shared
    app.setActivationPolicy(.prohibited)
    let check = PrintCheck()
    do { try check.start() } catch { check.fail(error.localizedDescription) }
    DispatchQueue.main.asyncAfter(deadline: .now() + 30) { check.fail("Timed out loading or printing \(check.url)") }
    app.run()
}
