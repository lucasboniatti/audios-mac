#!/bin/bash

# Build script para criar o aplicativo AudioFlow como um bundle completo

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

APP_NAME="AudioFlow"
BUNDLE_IDENTIFIER="com.audioflow.app"
BUILD_CONFIGURATION="${BUILD_CONFIGURATION:-release}"
BUILD_ARCH="${BUILD_ARCH:-$(uname -m)}"
DIST_DIR="${DIST_DIR:-${SCRIPT_DIR}/dist}"
BUNDLE_DIR="${DIST_DIR}/${APP_NAME}.app"
ZIP_PATH="${DIST_DIR}/${APP_NAME}.zip"
SKIP_OPEN="${SKIP_OPEN:-0}"
PACKAGE_RELEASE_ZIP="${PACKAGE_RELEASE_ZIP:-1}"
BUILD_PRODUCTS_DIR="AudioFlow/.build/${BUILD_ARCH}-apple-macosx/${BUILD_CONFIGURATION}"
EXECUTABLE_PATH="${BUILD_PRODUCTS_DIR}/${APP_NAME}"
SIGNING_DIR="$(mktemp -d "/tmp/audioflow-sign.XXXXXX")"
SIGNED_BUNDLE_DIR="${SIGNING_DIR}/${APP_NAME}.app"

cleanup() {
    rm -rf "${SIGNING_DIR}"
}

trap cleanup EXIT

echo "========================================"
echo "  AudioFlow Build Script"
echo "========================================"

# Build com Swift Package Manager
echo "[1/5] Compilando (${BUILD_CONFIGURATION}/${BUILD_ARCH})..."
cd AudioFlow
swift build --configuration "${BUILD_CONFIGURATION}" --arch "${BUILD_ARCH}"
cd ..

# Criar estrutura do bundle do aplicativo
echo "[2/5] Criando bundle..."
if [ ! -f "${EXECUTABLE_PATH}" ]; then
    echo "Erro: executavel nao encontrado em ${EXECUTABLE_PATH}"
    exit 1
fi

rm -rf "${BUNDLE_DIR}" "${ZIP_PATH}"
mkdir -p "${BUNDLE_DIR}/Contents/MacOS"
mkdir -p "${BUNDLE_DIR}/Contents/Resources"

# Copiar o executável - caminho correto do SPM
cp "${EXECUTABLE_PATH}" "${BUNDLE_DIR}/Contents/MacOS/${APP_NAME}"
chmod +x "${BUNDLE_DIR}/Contents/MacOS/${APP_NAME}"

# Criar o Info.plist correto
cat > "${BUNDLE_DIR}/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>AudioFlow</string>
    <key>CFBundleIdentifier</key>
    <string>${BUNDLE_IDENTIFIER}</string>
    <key>CFBundleName</key>
    <string>AudioFlow</string>
    <key>CFBundleDisplayName</key>
    <string>AudioFlow</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>12.0</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSPrincipalClass</key>
    <string>NSApplication</string>
    <key>NSMicrophoneUsageDescription</key>
    <string>AudioFlow precisa de acesso ao microfone para transcrever sua voz</string>
    <key>NSSpeechRecognitionUsageDescription</key>
    <string>AudioFlow precisa de acesso ao reconhecimento de voz para transcrever áudio</string>
    <key>NSAppleEventsUsageDescription</key>
    <string>AudioFlow precisa automatizar a colagem do texto transcrito no app em foco</string>
</dict>
</plist>
EOF

# Criar ícone do app (AppIcon.icns)
echo "[3/5] Criando icone do app..."
ICONSET_DIR="./AudioFlow/Resources/AppIcon.iconset"
mkdir -p "$ICONSET_DIR"

# Criar ícone base 1024x1024 usando Swift em arquivo separado
ICON_SWIFT="/tmp/create_icon.swift"
cat > "$ICON_SWIFT" << 'SWIFTCODE'
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let iconsetDir = CommandLine.arguments[1]
let size = 1024

let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let context = CGContext(
    data: nil,
    width: size,
    height: size,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    print("Erro ao criar contexto")
    exit(1)
}

// Fundo branco
context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
context.fill(CGRect(x: 0, y: 0, width: size, height: size))

// Barras em preto/cinza escuro
let barColor = CGColor(red: 0.2, green: 0.2, blue: 0.2, alpha: 1)

let barWidth = CGFloat(size) * 0.08
let gap = CGFloat(size) * 0.035
let totalBars: CGFloat = 7
let totalWidth = totalBars * barWidth + (totalBars - 1) * gap
let startX = (CGFloat(size) - totalWidth) / 2

let heights = [0.35, 0.55, 0.75, 0.95, 0.75, 0.55, 0.35]

for i in 0..<7 {
    let barHeight = CGFloat(size) * heights[i]
    let x = startX + CGFloat(i) * (barWidth + gap)
    let y = (CGFloat(size) - barHeight) / 2

    let rect = CGRect(x: x, y: y, width: barWidth, height: barHeight)
    let path = CGPath(
        roundedRect: rect,
        cornerWidth: barWidth / 2,
        cornerHeight: barWidth / 2,
        transform: nil
    )

    context.addPath(path)
    context.setFillColor(barColor)
    context.fillPath()
}

guard let image = context.makeImage() else {
    print("Erro ao criar imagem")
    exit(1)
}

let url = URL(fileURLWithPath: "\(iconsetDir)/icon_512x512@2x.png")
guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    print("Erro ao criar destino")
    exit(1)
}
CGImageDestinationAddImage(destination, image, nil)
CGImageDestinationFinalize(destination)

print("Ícone base criado: \(url.path)")
SWIFTCODE

# Executar Swift para criar ícone base
swift "$ICON_SWIFT" "$ICONSET_DIR" 2>/dev/null

# Se criou o ícone base, gerar os demais tamanhos com sips
if [ -f "$ICONSET_DIR/icon_512x512@2x.png" ]; then
    # Criar todos os tamanhos necessários
    sips -z 16 16 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_16x16.png" 2>/dev/null
    sips -z 32 32 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_16x16@2x.png" 2>/dev/null
    sips -z 32 32 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_32x32.png" 2>/dev/null
    sips -z 64 64 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_32x32@2x.png" 2>/dev/null
    sips -z 128 128 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_128x128.png" 2>/dev/null
    sips -z 256 256 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_128x128@2x.png" 2>/dev/null
    sips -z 256 256 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_256x256.png" 2>/dev/null
    sips -z 512 512 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_256x256@2x.png" 2>/dev/null
    sips -z 512 512 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_512x512.png" 2>/dev/null

    # Converter para .icns
    iconutil -c icns "$ICONSET_DIR" -o "${BUNDLE_DIR}/Contents/Resources/AppIcon.icns"
    echo "Ícone .icns criado com sucesso"
    rm -rf "$ICONSET_DIR"
else
    echo "Aviso: Não foi possível criar o ícone"
    rm -rf "$ICONSET_DIR"
fi

# Criar entitlements
cat > "${BUNDLE_DIR}/Contents/Resources/AudioFlow.entitlements" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.app-sandbox</key>
    <false/>
    <key>com.apple.security.device.audio-input</key>
    <true/>
</dict>
</plist>
EOF

echo "[4/5] Assinando bundle com identidade estável..."
ditto "${BUNDLE_DIR}" "${SIGNED_BUNDLE_DIR}"
xattr -cr "${SIGNED_BUNDLE_DIR}"
codesign \
    --force \
    --deep \
    --sign - \
    --identifier "${BUNDLE_IDENTIFIER}" \
    --entitlements "${SIGNED_BUNDLE_DIR}/Contents/Resources/AudioFlow.entitlements" \
    "${SIGNED_BUNDLE_DIR}"

rm -rf "${BUNDLE_DIR}"
ditto "${SIGNED_BUNDLE_DIR}" "${BUNDLE_DIR}"

echo "[4/5] Aplicativo criado em: ${BUNDLE_DIR}"

if [ "${PACKAGE_RELEASE_ZIP}" = "1" ]; then
    echo "[5/5] Empacotando ${APP_NAME}.zip..."
    mkdir -p "${DIST_DIR}"
    ditto -c -k --sequesterRsrc --keepParent "${BUNDLE_DIR}" "${ZIP_PATH}"
    echo "Arquivo de release criado em: ${ZIP_PATH}"
else
    echo "[5/5] Empacotamento zip desabilitado"
fi

if [ "${SKIP_OPEN}" = "1" ]; then
    echo "SKIP_OPEN=1; pulando abertura automatica do app."
else
    echo "Abrindo AudioFlow..."
    open "${BUNDLE_DIR}"
fi

echo ""
echo "========================================"
echo "  AudioFlow iniciado com sucesso!"
echo "========================================"
echo ""
echo "O ícone deve aparecer no menu bar (canto superior direito)"
echo "Pressione CONTROL+A para iniciar/parar gravação"
if [ "${PACKAGE_RELEASE_ZIP}" = "1" ]; then
    echo "Asset para GitHub Release: ${ZIP_PATH}"
fi
echo ""
echo "IMPORTANTE: Permissões necessárias:"
echo "  1. System Preferences > Privacy & Security > Microphone"
echo "  2. System Preferences > Privacy & Security > Speech Recognition"  
echo "  3. System Preferences > Privacy & Security > Accessibility"
echo ""
