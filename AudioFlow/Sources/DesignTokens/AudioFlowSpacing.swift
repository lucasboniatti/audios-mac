//
//  AudioFlowSpacing.swift
//  AudioFlow Design Tokens
//
//  Created by Uma (UX Design Expert)
//

import SwiftUI

extension CGFloat {
    // MARK: - Spacing Scale (4px base)
    static let spacing0: CGFloat = 0
    static let spacing1: CGFloat = 4
    static let spacing2: CGFloat = 8
    static let spacing3: CGFloat = 12
    static let spacing4: CGFloat = 16
    static let spacing5: CGFloat = 20
    static let spacing6: CGFloat = 24
    static let spacing8: CGFloat = 32
    static let spacing10: CGFloat = 40
    static let spacing12: CGFloat = 48
    static let spacing14: CGFloat = 56
    static let spacing16: CGFloat = 64
}

extension EdgeInsets {
    // MARK: - Container Padding
    static let containerXS = EdgeInsets(
        top: .spacing2,
        leading: .spacing2,
        bottom: .spacing2,
        trailing: .spacing2
    )

    static let containerSM = EdgeInsets(
        top: .spacing3,
        leading: .spacing3,
        bottom: .spacing3,
        trailing: .spacing3
    )

    static let containerMD = EdgeInsets(
        top: .spacing4,
        leading: .spacing4,
        bottom: .spacing4,
        trailing: .spacing4
    )

    static let containerLG = EdgeInsets(
        top: .spacing6,
        leading: .spacing6,
        bottom: .spacing6,
        trailing: .spacing6
    )
}