#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Menghentikan Bot WhatsApp (PM2)
# ==============================================================================

proot-distro login ubuntu -- bash -c '
    pm2 stop all 2>/dev/null || true
    pkill -f node 2>/dev/null || true
    pkill -f chromium 2>/dev/null || true
    rm -f /root/wa-bot/.wwebjs_auth/session/Singleton* 2>/dev/null || true
'
echo "Bot WhatsApp dan proses terkait berhasil dihentikan."
