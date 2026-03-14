import XCTest

@testable import AudioFlow

final class BrandAssetsTests: XCTestCase {

    func testBrandingMetadataMatchesSharedAccentColor() {
        XCTAssertEqual(AudioFlowBranding.accentHex, "#007AFF")
        XCTAssertEqual(AudioFlowBranding.preferredWebLogo, .primaryLogo)
        XCTAssertEqual(AudioFlowBranding.preferredTransparentLogo, .transparentLogo)
    }

    func testExpectedBrandAssetsExistInRepository() {
        let testsDirectory = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        let packageDirectory = testsDirectory.deletingLastPathComponent()
        let assetsDirectory = packageDirectory.appendingPathComponent("Assets", isDirectory: true)

        for asset in AudioFlowBrandAsset.allCases {
            let fileURL = assetsDirectory.appendingPathComponent(asset.rawValue)
            XCTAssertTrue(FileManager.default.fileExists(atPath: fileURL.path), "Missing brand asset: \(asset.rawValue)")
        }
    }
}
