#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Script Diagnostik Browser Chromium & Puppeteer di Termux Ubuntu
# ==============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}====================================================${NC}"
echo -e "${GREEN}    Diagnostik Browser Chromium & Node.js           ${NC}"
echo -e "${CYAN}====================================================${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Otomatis sync jika folder adalah repositori git
if [ -d "$SCRIPT_DIR/.git" ]; then
    echo -e "${YELLOW}Mengambil script diagnostik terbaru dari GitHub...${NC}"
    git -C "$SCRIPT_DIR" fetch origin main 2>/dev/null || true
    git -C "$SCRIPT_DIR" reset --hard origin/main 2>/dev/null || true
fi

echo ""
echo "--- [Host Termux] Cek Arsitektur & Paket ---"
uname -m
which chromium 2>/dev/null || echo "Host Termux: Chromium native belum ada"
which node 2>/dev/null || echo "Host Termux: Node native belum ada"

proot-distro login ubuntu --bind "$SCRIPT_DIR":/mnt/bot -- bash -c '
    mkdir -p /root/wa-bot
    cd /root/wa-bot

    # Salin file cek.js dari mount folder Termux
    cp -f /mnt/bot/cek.js /root/wa-bot/cek.js 2>/dev/null || true

    unset DBUS_SESSION_BUS_ADDRESS
    unset DBUS_SYSTEM_BUS_ADDRESS
    export NO_AT_BRIDGE=1

    echo ""
    echo "--- 1. Cek binary Chromium di Ubuntu ---"
    which chromium || which chromium-browser || echo "Chromium tidak ditemukan!"
    chromium --version 2>/dev/null || chromium-browser --version 2>/dev/null || echo "Gagal menjalankan chromium --version"

    echo ""
    echo "--- 2. Uji Coba Direct CLI Chromium (Menampilkan Error Asli) ---"
    chromium --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu --headless --dump-dom https://example.com
    echo "Exit Code Chromium: $?"

    echo ""
    echo "--- 3. Menjalankan Matriks Pengujian Puppeteer (cek.js) ---"
    if [ -f cek.js ]; then
        node cek.js
    else
        echo "Error: cek.js tidak ditemukan."
    fi
'
