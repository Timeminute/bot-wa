#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Script Instalasi Bot WhatsApp di Android (Termux) via Ubuntu PRoot
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}====================================================${NC}"
echo -e "${GREEN}   Instalasi Bot WA All-in-One di Android (Termux)   ${NC}"
echo -e "${CYAN}====================================================${NC}"
echo ""

# 1. Mengaktifkan Wake-lock agar Termux tidak tertidur saat layar mati
echo -e "${YELLOW}[1/6] Mengaktifkan Termux Wake-lock (Cegah Sleep)...${NC}"
termux-wake-lock || true

# 2. Update Termux & Install PRoot Distro
echo -e "${YELLOW}[2/6] Memperbarui repositori Termux & menginstal proot-distro...${NC}"
pkg update -y
pkg install -y proot-distro curl wget git nodejs-lts ffmpeg

# 3. Instalasi Lingkungan Ubuntu di Termux
echo -e "${YELLOW}[3/6] Memeriksa & Menginstal Ubuntu di proot-distro...${NC}"
if proot-distro list | grep -q "ubuntu.*installed"; then
    echo -e "${GREEN}Ubuntu sudah terinstal di proot-distro.${NC}"
else
    echo -e "${BLUE}Mengunduh dan menginstal Ubuntu (mohon tunggu)...${NC}"
    proot-distro install ubuntu
fi

# 4. Menyiapkan folder bot di dalam Ubuntu
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "${YELLOW}[4/6] Menyalin file bot ke dalam Ubuntu...${NC}"
mkdir -p "$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu/root/wa-bot"
cp -rf "$SCRIPT_DIR/index.js" "$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu/root/wa-bot/"
cp -rf "$SCRIPT_DIR/package.json" "$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu/root/wa-bot/"

# 5. Menjalankan konfigurasi paket di dalam Ubuntu
echo -e "${YELLOW}[5/6] Menginstal Node.js, Chromium, FFmpeg, yt-dlp & PM2 di dalam Ubuntu...${NC}"

proot-distro login ubuntu -- bash -c '
set -e
export DEBIAN_FRONTEND=noninteractive

echo "==> Mengupdate paket Ubuntu..."
apt-get update -y && apt-get upgrade -y

echo "==> Mengonfigurasi pencegahan Snap di container PRoot..."
cat <<EOF > /etc/apt/preferences.d/nosnap.pref
Package: snapd
Pin: release a=*
Pin-Priority: -10
EOF

echo "==> Menambahkan repositori Debian untuk paket Chromium native (No-Snap)..."
echo "deb [trusted=yes] http://deb.debian.org/debian bookworm main" > /etc/apt/sources.list.d/debian-chromium.list

echo "==> Menginstal dependensi sistem & Chromium Browser..."
apt-get update -y
apt-get install -y curl wget git ffmpeg python3 python3-pip ca-certificates tzdata chromium

# Symlink agar /usr/bin/chromium dan /usr/bin/chromium-browser sama-sama tersedia
ln -sf /usr/bin/chromium /usr/bin/chromium-browser 2>/dev/null || true

echo "==> Menginstal Node.js v20..."
if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo "==> Menginstal yt-dlp terbaru..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp

echo "==> Menginstal PM2 Process Manager..."
npm install -g pm2 || true

echo "==> Menginstal modul bot WhatsApp (npm install)..."
cd /root/wa-bot
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install
'

# 6. Selesai
echo ""
echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}   SELAMAT! Instalasi Bot WhatsApp Berhasil!        ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo ""
echo -e "Untuk menjalankan bot 24 jam non-stop, jalankan perintah:"
echo -e "${CYAN}./start.sh${NC}"
echo ""
echo -e "Atau jika ingin berjalan di latar belakang menggunakan PM2:"
echo -e "${CYAN}./start-pm2.sh${NC}"
echo ""
