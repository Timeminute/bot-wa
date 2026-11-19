#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Menghentikan Bot WhatsApp (PM2)
# ==============================================================================

proot-distro login ubuntu -- bash -c 'pm2 stop bot-wa'
echo "Bot WhatsApp berhasil dihentikan."
