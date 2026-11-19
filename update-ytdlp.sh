#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Update yt-dlp ke versi terbaru di dalam Ubuntu Termux
# ==============================================================================

echo "Memperbarui yt-dlp ke rilis terbaru..."
proot-distro login ubuntu -- bash -c '
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
    chmod a+rx /usr/local/bin/yt-dlp
    yt-dlp --version
'
echo "Update yt-dlp selesai!"
