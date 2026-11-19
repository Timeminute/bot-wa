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

# Sinkronkan file cek.js ke Ubuntu rootfs
mkdir -p "$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu/root/wa-bot"
cp -f "$SCRIPT_DIR/cek.js" "$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu/root/wa-bot/" 2>/dev/null || true

proot-distro login ubuntu -- bash -c '
    cd /root/wa-bot

    export NO_AT_BRIDGE=1
    export DBUS_SESSION_BUS_ADDRESS=/dev/null

    echo "--- 1. Cek binary Chromium di Ubuntu ---"
    which chromium || which chromium-browser || echo "Chromium tidak ditemukan!"
    chromium --version 2>/dev/null || chromium-browser --version 2>/dev/null || echo "Gagal menjalankan chromium --version"

    echo ""
    echo "--- 2. Cek dependensi library sistem (ldd) ---"
    CHROME_BIN="$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null)"
    if [ -n "$CHROME_BIN" ]; then
        MISSING_LIBS=$(ldd "$CHROME_BIN" 2>/dev/null | grep "not found" || true)
        if [ -n "$MISSING_LIBS" ]; then
            echo -e "\033[0;31mDitemukan library yang hilang:\033[0m"
            echo "$MISSING_LIBS"
            echo "Memasang dependensi yang hilang..."
            apt-get update -y && apt-get install -y --no-install-recommends libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 fonts-liberation ca-certificates
        else
            echo "Semua library sistem Chromium LENGKAP."
        fi
    fi

    echo ""
    echo "--- 3. Menjalankan Tes Puppeteer (cek.js) ---"
    node cek.js
'
