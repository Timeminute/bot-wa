#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Script Menjalankan Bot WhatsApp 24 Jam Non-Stop di Termux
# ==============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}====================================================${NC}"
echo -e "${GREEN}   Memulai Bot WhatsApp 24 Jam Non-Stop (Termux)    ${NC}"
echo -e "${CYAN}====================================================${NC}"

# Aktifkan Wake-lock agar Android tidak mematikan CPU saat layar mati
echo -e "${YELLOW}Mengaktifkan Termux Wake-lock (Layar mati CPU tetap hidup)...${NC}"
termux-wake-lock || true

# Fungsi untuk memeriksa koneksi internet
check_internet() {
    ping -c 1 8.8.8.8 >/dev/null 2>&1
    return $?
}

# Sinkronkan file bot terbaru jika ada perubahan di folder luar
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Otomatis git pull jika folder merupakan repositori git
if [ -d "$SCRIPT_DIR/.git" ]; then
    echo -e "${YELLOW}Memeriksa pembaruan dari GitHub (git pull)...${NC}"
    git -C "$SCRIPT_DIR" fetch origin main 2>/dev/null || true
    git -C "$SCRIPT_DIR" reset --hard origin/main 2>/dev/null || true
fi

mkdir -p "$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu/root/wa-bot"
cp -f "$SCRIPT_DIR/index.js" "$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu/root/wa-bot/" 2>/dev/null || true
cp -f "$SCRIPT_DIR/package.json" "$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu/root/wa-bot/" 2>/dev/null || true

# Loop 24 Jam Non-Stop: Jika bot crash / internet putus, bot otomatis menyala lagi
while true; do
    echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')] Memeriksa koneksi internet...${NC}"
    
    until check_internet; do
        echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] Internet terputus. Menunggu koneksi kembali...${NC}"
        sleep 5
    done

    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] Internet terhubung! Menjalankan Bot...${NC}"
    
    # Jalankan bot di dalam environment Ubuntu proot
    proot-distro login ubuntu -- bash -c '
        cd /root/wa-bot

        # Bersihkan direktori PM2 tanpa memanggil binary pm2 (mencegah PRoot signal 15)
        rm -rf /root/.pm2 2>/dev/null || true

        # Hapus file lock sisa sesi sebelumnya jika ada
        rm -f /root/wa-bot/.wwebjs_auth/session/Singleton* 2>/dev/null || true
        rm -f .wwebjs_auth/session/Singleton* 2>/dev/null || true

        # Matikan peringatan DBus agar Chromium tidak mencari system bus di container
        export NO_AT_BRIDGE=1
        export DBUS_SESSION_BUS_ADDRESS=/dev/null

        # Pastikan font sistem tersedia agar engine render Chromium tidak crash saat memuat halaman
        if [ ! -f /usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf ]; then
            echo "[Info] Memasang paket font sistem untuk Chromium..."
            apt-get update -y && apt-get install -y --no-install-recommends fonts-liberation fonts-freefont-ttf libgbm1 libasound2 ca-certificates 2>/dev/null || true
        fi

        # Unduh index.js terbaru langsung dari GitHub (bypass CDN cache)
        curl -fsSL "https://raw.githubusercontent.com/Timeminute/bot-wa/main/index.js?v=$(date +%s)" -o index.js 2>/dev/null || true

        # Pastikan Chromium tersedia
        if [ -f /usr/bin/chromium ] && [ ! -f /usr/bin/chromium-browser ]; then
            ln -sf /usr/bin/chromium /usr/bin/chromium-browser 2>/dev/null || true
        fi
        CHROME_PATH="$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null || echo "/usr/bin/chromium")"
        export PUPPETEER_EXECUTABLE_PATH="$CHROME_PATH"

        echo "[Info] Menggunakan browser: $CHROME_PATH"
        echo "[Info] Memulai WhatsApp Web..."

        node index.js
    '

    EXIT_CODE=$?
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] Bot berhenti (Exit Code: $EXIT_CODE). Restart otomatis dalam 5 detik...${NC}"
    sleep 5
done
