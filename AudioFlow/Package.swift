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
    dependencies: [
        // No external dependencies needed for basic functionality
    ],
    targets: [
        .executableTarget(
            name: "AudioFlow",
            path: "Sources",
            exclude: [
                "Info.plist"
            ],
            linkerSettings: [
                .linkedFramework("Cocoa"),
                .linkedFramework("AVFoundation"),
                .linkedFramework("Speech"),
                .linkedFramework("UserNotifications"),
                .linkedFramework("CoreData"),
                .linkedFramework("Combine")
            ]
        ),
        .testTarget(
            name: "AudioFlowTests",
            dependencies: ["AudioFlow"],
            path: "Tests"
        )
    ]
)
