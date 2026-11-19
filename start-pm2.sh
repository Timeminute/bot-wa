#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Menjalankan Bot di Latar Belakang (Background) Menggunakan PM2 di Termux
# ==============================================================================

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Mengaktifkan Termux Wake-lock...${NC}"
termux-wake-lock || true

# Sinkronkan file bot terbaru
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu/root/wa-bot"
cp -u "$SCRIPT_DIR/index.js" "$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu/root/wa-bot/" 2>/dev/null || true
cp -u "$SCRIPT_DIR/package.json" "$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu/root/wa-bot/" 2>/dev/null || true

echo -e "${GREEN}Menjalankan Bot di latar belakang dengan PM2...${NC}"

proot-distro login ubuntu -- bash -c '
    cd /root/wa-bot
    if [ -f /usr/bin/chromium ] && [ ! -f /usr/bin/chromium-browser ]; then
        ln -sf /usr/bin/chromium /usr/bin/chromium-browser 2>/dev/null || true
    fi
    export PUPPETEER_EXECUTABLE_PATH="$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null || echo "/usr/bin/chromium")"
    pm2 start index.js --name bot-wa --time
    pm2 save
'

echo ""
echo -e "${GREEN}Bot berhasil dijalankan di latar belakang!${NC}"
echo -e "Untuk melihat log atau scan QR Code, ketik: ${CYAN}./logs.sh${NC}"
echo -e "Untuk menghentikan bot, ketik: ${CYAN}./stop.sh${NC}"
