#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Script Pemasangan Google Chrome Official ARM64 di Ubuntu PRoot
# ==============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}====================================================${NC}"
echo -e "${GREEN}   Pasang Google Chrome Stable Resmi (ARM64)        ${NC}"
echo -e "${CYAN}====================================================${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -d "$SCRIPT_DIR/.git" ]; then
    git -C "$SCRIPT_DIR" fetch origin main 2>/dev/null || true
    git -C "$SCRIPT_DIR" reset --hard origin/main 2>/dev/null || true
fi

proot-distro login ubuntu -- bash -c '
    set -e
    export DEBIAN_FRONTEND=noninteractive

    echo -e "\033[1;33m[1/3] Mengunduh Google Chrome Stable ARM64 resmi...\033[0m"
    cd /root
    curl -fL "https://dl.google.com/linux/direct/google-chrome-stable_current_arm64.deb" -o google-chrome.deb

    echo -e "\033[1;33m[2/3] Memasang paket Google Chrome & dependensi...\033[0m"
    apt-get update -y
    apt-get install -y ./google-chrome.deb
    rm -f google-chrome.deb

    # Buat symlink default agar Puppeteer langsung menggunakannya
    ln -sf /usr/bin/google-chrome-stable /usr/bin/chromium-browser 2>/dev/null || true
    ln -sf /usr/bin/google-chrome-stable /usr/bin/chromium 2>/dev/null || true

    echo -e "\033[0;32m[3/3] Selesai! Versi browser terpasang:\033[0m"
    google-chrome --version
'

echo ""
echo -e "${GREEN}Google Chrome berhasil dipasang!${NC}"
echo -e "Silakan jalankan: ${CYAN}./cek-browser.sh${NC} atau ${CYAN}./start.sh${NC}"
