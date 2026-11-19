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
cp -f "$SCRIPT_DIR/index.js" "$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu/root/wa-bot/" 2>/dev/null || true
cp -f "$SCRIPT_DIR/package.json" "$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu/root/wa-bot/" 2>/dev/null || true

echo -e "${GREEN}Menjalankan Bot di latar belakang dengan PM2...${NC}"

proot-distro login ubuntu -- bash -c '
    cd /root/wa-bot
    export PUPPETEER_EXECUTABLE_PATH="$(which google-chrome-stable 2>/dev/null || which google-chrome 2>/dev/null || which chromium-browser 2>/dev/null || which chromium 2>/dev/null || echo "/usr/bin/google-chrome-stable")"
    pm2 start index.js --name bot-wa --time
    pm2 save
'

echo ""
echo -e "${GREEN}Bot berhasil dijalankan di latar belakang!${NC}"
echo -e "Untuk melihat log atau scan QR Code, ketik: ${CYAN}./logs.sh${NC}"
echo -e "Untuk menghentikan bot, ketik: ${CYAN}./stop.sh${NC}"
