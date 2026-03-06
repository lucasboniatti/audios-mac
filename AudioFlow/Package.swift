// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AudioFlow",
    platforms: [
        .macOS(.v12)
    ],
    products: [
        .executable(name: "AudioFlow", targets: ["AudioFlow"])
    ],
    targets: [
        .executableTarget(
            name: "AudioFlow",
            path: "Sources",
            exclude: ["Info.plist"]
        ),
        .testTarget(
            name: "AudioFlowTests",
            dependencies: [],
            path: "Tests"
        )
    ]
)