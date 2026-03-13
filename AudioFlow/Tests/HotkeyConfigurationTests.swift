import XCTest
import Carbon.HIToolbox

@testable import AudioFlow

final class HotkeyConfigurationTests: XCTestCase {

    func testMenuShortcutMatchesConfiguredDisplayShortcut() {
        XCTAssertEqual(HotkeyConfiguration.menuKeyEquivalent, "a")
        XCTAssertEqual(HotkeyConfiguration.menuModifiers, [.control])
        XCTAssertEqual(HotkeyConfiguration.displayName, "Control+A")
    }

    func testCarbonShortcutMatchesConfiguredMenuShortcut() {
        XCTAssertEqual(HotkeyConfiguration.carbonKeyCode, UInt32(kVK_ANSI_A))
        XCTAssertEqual(HotkeyConfiguration.carbonModifiers, UInt32(controlKey))
    }

    func testHotkeyIdentifierIsStable() {
        XCTAssertEqual(HotkeyConfiguration.identifier, 1)
        XCTAssertEqual(HotkeyConfiguration.signature, fourCharCode("AFHK"))
    }

    private func fourCharCode(_ string: String) -> OSType {
        string.unicodeScalars.reduce(0) { partialResult, scalar in
            (partialResult << 8) + OSType(scalar.value)
        }
    }
}
