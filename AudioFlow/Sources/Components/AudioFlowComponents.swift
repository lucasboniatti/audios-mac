//
//  AudioFlowComponents.swift
//  AudioFlow Component Library
//
//  Created by Uma (UX Design Expert)
//

import SwiftUI

enum AudioFlowBrandAsset: String, CaseIterable {
    case primaryLogo = "logo.svg"
    case transparentLogo = "logo-transparent.svg"
    case whiteBackgroundLogo = "logo-white-bg.svg"
    case transparentLogoPNG = "logo-transparent.png"
    case whiteBackgroundLogoPNG = "logo-white-bg.png"
    case animatedLogo = "logo-animated.gif"
    case compactAnimatedLogo = "logo-animated-44.gif"
    case appIcon1024 = "app-icon-1024.png"
}

enum AudioFlowBranding {
    static let accentHex = "#007AFF"
    static let accentColor = Color.primary500
    static let preferredWebLogo = AudioFlowBrandAsset.primaryLogo
    static let preferredTransparentLogo = AudioFlowBrandAsset.transparentLogo
}

// MARK: - Button Component
struct AudioFlowButton: View {
    enum ButtonVariant {
        case primary
        case secondary
        case destructive
        case fab
    }

    let variant: ButtonVariant
    let action: () -> Void
    let label: () -> AnyView

    init(variant: ButtonVariant = .primary, action: @escaping () -> Void, @ViewBuilder label: @escaping () -> some View) {
        self.variant = variant
        self.action = action
        self.label = { AnyView(label()) }
    }

    var body: some View {
        Button(action: action) {
            label()
                .frame(maxWidth: variant == .fab ? nil : .infinity)
                .padding(variant == .fab ? EdgeInsets() : EdgeInsets(top: .spacing3, leading: .spacing6, bottom: .spacing3, trailing: .spacing6))
                .background(backgroundColor)
                .foregroundColor(foregroundColor)
                .cornerRadius(borderRadius)
                .shadow(color: shadowColor, radius: shadowRadius, x: 0, y: shadowOffset)
                .overlay(
                    variant == .fab ? RoundedRectangle(cornerRadius: borderRadius)
                        .stroke(Color.backgroundDark, lineWidth: 4) : nil
                )
        }
    }

    private var backgroundColor: Color {
        switch variant {
        case .primary, .fab:
            return .primary500
        case .secondary:
            return .surfaceElevated
        case .destructive:
            return .clear
        }
    }

    private var foregroundColor: Color {
        switch variant {
        case .primary, .fab:
            return .white
        case .secondary:
            return .textPrimary
        case .destructive:
            return .destructiveDefault
        }
    }

    private var borderRadius: CGFloat {
        return variant == .fab ? .spacing16 / 2 : 12
    }

    private var shadowColor: Color {
        switch variant {
        case .primary:
            return .primary500.opacity(0.3)
        case .fab:
            return .primary500.opacity(0.4)
        default:
            return .clear
        }
    }

    private var shadowRadius: CGFloat {
        return variant == .fab ? 20 : 15
    }

    private var shadowOffset: CGFloat {
        return variant == .fab ? 0 : -3
    }
}

// MARK: - Card Component
struct AudioFlowCard<Content: View>: View {
    enum CardVariant {
        case `default`
        case elevated
        case interactive
    }

    let variant: CardVariant
    let content: Content

    init(variant: CardVariant = .default, @ViewBuilder content: () -> Content) {
        self.variant = variant
        self.content = content()
    }

    var body: some View {
        content
            .padding(.spacing4)
            .background(backgroundColor)
            .cornerRadius(16)
            .shadow(color: shadowColor, radius: shadowRadius)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(variant == .interactive ? Color.borderSubtle : .borderSubtle, lineWidth: 1)
            )
    }

    private var backgroundColor: Color {
        return variant == .elevated ? .surfaceElevated : .surfaceDark
    }

    private var shadowColor: Color {
        switch variant {
        case .elevated:
            return .black.opacity(0.3)
        case .interactive:
            return .black.opacity(0.1)
        default:
            return .black.opacity(0.05)
        }
    }

    private var shadowRadius: CGFloat {
        return variant == .elevated ? 15 : 5
    }
}

// MARK: - FAB Component
struct AudioFlowFAB: View {
    let icon: String
    let action: () -> Void

    @State private var isPressed = false

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 32))
                .foregroundColor(.white)
                .frame(width: .spacing16, height: .spacing16)
                .background(Color.primary500)
                .cornerRadius(.spacing16 / 2)
                .shadow(color: .primary500.opacity(0.4), radius: 20, x: 0, y: 0)
                .overlay(
                    Circle()
                        .stroke(Color.backgroundDark, lineWidth: 4)
                )
                .scaleEffect(isPressed ? 0.95 : 1.0)
        }
        .buttonStyle(PlainButtonStyle())
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
    }
}

// MARK: - Preview
#Preview {
    ZStack {
        Color.backgroundDark.ignoresSafeArea()

        VStack(spacing: 20) {
            AudioFlowButton(variant: .primary, action: {}) {
                Text("Salvar Alterações")
            }
            .frame(width: 200)

            AudioFlowButton(variant: .secondary, action: {}) {
                Text("Cancelar")
            }
            .frame(width: 200)

            AudioFlowButton(variant: .destructive, action: {}) {
                Text("Sair")
            }
            .frame(width: 200)

            AudioFlowCard {
                VStack(alignment: .leading) {
                    Text("Título do Card")
                        .font(.title())
                    Text("Conteúdo do card")
                        .font(.body())
                }
            }
            .frame(width: 280)

            AudioFlowFAB(icon: "mic.fill", action: {})
        }
        .padding()
    }
}
