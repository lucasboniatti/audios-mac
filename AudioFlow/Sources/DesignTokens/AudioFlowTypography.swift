//
//  AudioFlowTypography.swift
//  AudioFlow Design Tokens
//
//  Created by Uma (UX Design Expert)
//

import SwiftUI

extension Font {
    // MARK: - Font Family
    static let primaryFamily = "Public Sans"
    static let secondaryFamily = "Inter"

    // MARK: - Font Sizes
    static func fontSize2XS() -> Font { .system(size: 9) }
    static func fontSizeXS() -> Font { .system(size: 10) }
    static func fontSizeSM() -> Font { .system(size: 11) }
    static func fontSizeBase() -> Font { .system(size: 12) }
    static func fontSizeMD() -> Font { .system(size: 13) }
    static func fontSizeLG() -> Font { .system(size: 14) }
    static func fontSizeXL() -> Font { .system(size: 15) }
    static func fontSize2XL() -> Font { .system(size: 16) }
    static func fontSize3XL() -> Font { .system(size: 18) }
    static func fontSize4XL() -> Font { .system(size: 20) }
    static func fontSize5XL() -> Font { .system(size: 24) }
    static func fontSize6XL() -> Font { .system(size: 32) }
    static func fontSize7XL() -> Font { .system(size: 40) }

    // MARK: - Pre-configured Styles
    static func title() -> Font {
        .custom(primaryFamily, size: 20).weight(.bold)
    }

    static func subtitle() -> Font {
        .custom(primaryFamily, size: 16).weight(.semibold)
    }

    static func body() -> Font {
        .custom(primaryFamily, size: 14).weight(.regular)
    }

    static func caption() -> Font {
        .custom(primaryFamily, size: 12).weight(.regular)
    }

    static func label() -> Font {
        .custom(primaryFamily, size: 10).weight(.bold)
    }
}

extension Text {
    // MARK: - Text Styles
    func titleStyle() -> some View {
        self.font(.title())
            .foregroundColor(.textPrimary)
            .tracking(-0.015)
    }

    func subtitleStyle() -> some View {
        self.font(.subtitle())
            .foregroundColor(.textPrimary)
    }

    func bodyStyle() -> some View {
        self.font(.body())
            .foregroundColor(.textSecondary)
    }

    func captionStyle() -> some View {
        self.font(.caption())
            .foregroundColor(.textTertiary)
    }

    func labelStyle() -> some View {
        self.font(.label())
            .foregroundColor(.textLabel)
            .kerning(0.05)
            .textCase(.uppercase)
    }
}