#!/bin/bash

# Script para instalar o AudioFlow localmente ou via GitHub Release

set -euo pipefail

APP_NAME="AudioFlow"
DEFAULT_REPO="lucasboniatti/audios-mac"
MODE="release"
REPO_SLUG="${AUDIOFLOW_REPO:-${DEFAULT_REPO}}"
RELEASE_TAG="${AUDIOFLOW_RELEASE_TAG:-latest}"
REQUESTED_INSTALL_DIR="${AUDIOFLOW_INSTALL_DIR:-/Applications}"
OPEN_AFTER_INSTALL="${AUDIOFLOW_OPEN_AFTER_INSTALL:-1}"
TMP_DIR=""
INSTALL_DIR=""
DEST_DIR=""
SCRIPT_DIR=""

usage() {
    cat <<'EOF'
Uso:
  ./install.sh
  ./install.sh --tag v1.0.0
  ./install.sh --repo owner/repo
  ./install.sh --install-dir /Applications
  ./install.sh --local

Exemplos:
  curl -fsSL https://raw.githubusercontent.com/lucasboniatti/audios-mac/main/install.sh | bash
  curl -fsSL https://raw.githubusercontent.com/lucasboniatti/audios-mac/main/install.sh | bash -s -- --tag v1.0.0
  ./install.sh --local --install-dir /tmp/AudioFlow-Test
EOF
}

cleanup() {
    if [ -n "${TMP_DIR}" ] && [ -d "${TMP_DIR}" ]; then
        rm -rf "${TMP_DIR}"
    fi
}

resolve_install_dir() {
    local requested_dir="$1"

    if [ -d "${requested_dir}" ] && [ -w "${requested_dir}" ]; then
        echo "${requested_dir}"
        return
    fi

    if [ ! -e "${requested_dir}" ]; then
        mkdir -p "${requested_dir}" 2>/dev/null || true
        if [ -d "${requested_dir}" ] && [ -w "${requested_dir}" ]; then
            echo "${requested_dir}"
            return
        fi
    fi

    if [ "${requested_dir}" = "/Applications" ]; then
        local fallback_dir="${HOME}/Applications"
        mkdir -p "${fallback_dir}"
        echo "${fallback_dir}"
        return
    fi

    echo "Erro: sem permissao para instalar em ${requested_dir}" >&2
    exit 1
}

download_url() {
    local repo_slug="$1"
    local release_tag="$2"

    if [ "${release_tag}" = "latest" ]; then
        echo "https://github.com/${repo_slug}/releases/latest/download/${APP_NAME}.zip"
    else
        echo "https://github.com/${repo_slug}/releases/download/${release_tag}/${APP_NAME}.zip"
    fi
}

install_from_bundle() {
    local source_app="$1"

    if [ ! -d "${source_app}" ]; then
        echo "Erro: bundle nao encontrado em ${source_app}" >&2
        exit 1
    fi

    if [ -d "${DEST_DIR}" ]; then
        echo "Removendo versao anterior em ${DEST_DIR}..."
        rm -rf "${DEST_DIR}"
    fi

    echo "Instalando em ${DEST_DIR}..."
    ditto "${source_app}" "${DEST_DIR}"
    chmod +x "${DEST_DIR}/Contents/MacOS/${APP_NAME}"
}

while [ $# -gt 0 ]; do
    case "$1" in
        --local)
            MODE="local"
            shift
            ;;
        --repo)
            REPO_SLUG="$2"
            shift 2
            ;;
        --tag)
            RELEASE_TAG="$2"
            shift 2
            ;;
        --install-dir)
            REQUESTED_INSTALL_DIR="$2"
            shift 2
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo "Argumento invalido: $1" >&2
            usage
            exit 1
            ;;
    esac
done

trap cleanup EXIT

if [ -f "$0" ]; then
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

INSTALL_DIR="$(resolve_install_dir "${REQUESTED_INSTALL_DIR}")"
DEST_DIR="${INSTALL_DIR}/${APP_NAME}.app"

echo "========================================"
echo "  AudioFlow Install Script"
echo "========================================"

if [ "${INSTALL_DIR}" != "${REQUESTED_INSTALL_DIR}" ]; then
    echo "Sem permissao para ${REQUESTED_INSTALL_DIR}; usando ${INSTALL_DIR}."
fi

if [ "${MODE}" = "local" ]; then
    if [ -z "${SCRIPT_DIR}" ]; then
        echo "Erro: --local requer executar o script a partir do repositorio." >&2
        exit 1
    fi

    install_from_bundle "${SCRIPT_DIR}/dist/${APP_NAME}.app"
else
    if ! command -v curl >/dev/null 2>&1; then
        echo "Erro: curl nao encontrado no sistema." >&2
        exit 1
    fi

    TMP_DIR="$(mktemp -d "/tmp/audioflow-install.XXXXXX")"
    ZIP_PATH="${TMP_DIR}/${APP_NAME}.zip"
    EXTRACT_DIR="${TMP_DIR}/unzipped"
    DOWNLOAD_URL="$(download_url "${REPO_SLUG}" "${RELEASE_TAG}")"

    echo "Baixando release de ${REPO_SLUG}..."
    echo "URL: ${DOWNLOAD_URL}"
    curl -fL --retry 3 --connect-timeout 15 -o "${ZIP_PATH}" "${DOWNLOAD_URL}"

    echo "Extraindo app..."
    mkdir -p "${EXTRACT_DIR}"
    ditto -x -k "${ZIP_PATH}" "${EXTRACT_DIR}"

    install_from_bundle "${EXTRACT_DIR}/${APP_NAME}.app"
fi

echo ""
echo "========================================"
echo "  AudioFlow instalado com sucesso!"
echo "========================================"
echo ""
echo "Local instalado: ${DEST_DIR}"
echo "Na primeira execucao, aceite as permissoes de Microfone, Speech Recognition e Accessibility."

if [ "${OPEN_AFTER_INSTALL}" = "1" ]; then
    echo "Abrindo ${APP_NAME}..."
    open "${DEST_DIR}"
else
    echo "Abertura automatica desabilitada (AUDIOFLOW_OPEN_AFTER_INSTALL=0)."
fi
