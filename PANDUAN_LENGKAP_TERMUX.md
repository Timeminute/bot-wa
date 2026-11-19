# Panduan Menjalankan Bot WhatsApp 24 Jam di HP Android (Termux)

Panduan ini berisi cara lengkap menyulap HP Android bekas/nganggur menjadi server bot WhatsApp yang aktif terus **24 jam non-stop**, hemat listrik, dan otomatis menyala kembali jika internet terputus atau bot error.

---

## 1. Bahan-Bahan yang Dibutuhkan

1. **HP Android:**
   - RAM minimal 2 GB atau 3 GB (rekomendasi).
   - Memori penyimpanan internal kosong minimal 2 GB - 3 GB.
   - Android versi 7.0 ke atas.
2. **Aplikasi Termux (Wajib dari F-Droid):**
   - ⚠️ **PENTING:** Jangan mengunduh Termux dari Google Play Store karena versinya sudah lama tidak diupdate dan repositorinya error 404.
   - Unduh Termux APK versi resmi dari F-Droid: [https://f-droid.org/packages/com.termux/](https://f-droid.org/packages/com.termux/) (atau langsung cari APK Termux F-Droid di browser HP).
3. **Koneksi Internet:**
   - WiFi rumah atau paket data stabil.
   - Colokan charger HP agar baterai tidak habis.

---

## 2. Pengaturan Android Agar Bot Tidak Mati (24 Jam Non-Stop)

Sistem Android secara bawaan suka mematikan aplikasi latar belakang demi menghemat baterai. Agar Termux bisa hidup terus 24 jam:

1. **Matikan Optimasi Baterai Termux:**
   - Buka **Pengaturan HP (Settings)** -> **Aplikasi (Apps)** -> cari **Termux**.
   - Masuk ke menu **Baterai (Battery)** -> Pilih **"Tidak Dibatasi" (Unrestricted / Don't optimize)**.
2. **Kunci Termux di Recent Apps:**
   - Buka aplikasi Termux, tekan tombol Recent Apps (tombol navigasi kotak atau geser multitasking).
   - Tekan icon gembok (Lock) pada jendela Termux agar tidak sengaja tertutup saat membersihkan RAM.
3. **Wake-Lock:**
   - Script `./start.sh` dan `./start-pm2.sh` sudah otomatis memanggil `termux-wake-lock`, sehingga saat layar HP dimatikan, prosesor HP tetap terjaga untuk menjalankan bot.

---

## 3. Cara Memindahkan Folder Ini ke HP Android

Folder `termux` ini sudah berisi seluruh file bot dan script instalasi otomatis.

### Cara Termudah (Kabel Data USB):
1. Sambungkan HP Android kamu ke PC/Laptop dengan kabel data.
2. Di HP, pilih mode transfer file (**File Transfer / MTP**).
3. Salin (Copy) folder `termux` ini dari komputer ke folder **Download** di penyimpanan internal HP kamu.

*(Alternatif: Kompres folder `termux` menjadi `.zip`, kirim via Dokumen WhatsApp ke nomor sendiri atau upload ke Google Drive, lalu unduh dan ekstrak di HP).*

---

## 4. Langkah Menjalankan Bot di Termux (Sekali Klik)

Buka aplikasi **Termux** di HP kamu, lalu ikuti langkah berikut:

### Langkah A: Berikan Izin Penyimpanan
Ketik perintah ini di Termux lalu tekan Enter:
```bash
termux-setup-storage
```
*(Akan muncul popup izin akses file di layar HP, pilih **Izinkan / Allow**).*

### Langkah B: Salin Folder Bot ke Direktori Kerja Termux
Ketik perintah berikut:
```bash
cp -r /sdcard/Download/termux ~/wa-bot-termux
cd ~/wa-bot-termux
chmod +x *.sh
```

### Langkah C: Jalankan Instalasi Otomatis
Cukup jalankan satu perintah ini:
```bash
./install.sh
```
*Script ini akan otomatis menginstal paket Ubuntu PRoot, Chromium Browser, Node.js 20, FFmpeg, yt-dlp, dan dependensi bot WhatsApp. Tunggu hingga proses selesai (sekitar 3–7 menit tergantung kecepatan internet).*

---

## 5. Menjalankan Bot & Scan QR Code

Setelah instalasi selesai, pilih salah satu cara berikut untuk menjalankan bot:

### Pilihan 1: Mode Layar Langsung (Paling Disarankan untuk Pertama Kali)
```bash
./start.sh
```
* **Kelebihan:** Kamu bisa langsung melihat proses, QR code WhatsApp akan muncul di layar Termux.
* **Fitur Anti-Mati:** Script ini memiliki loop otomatis 24 jam. Jika internet sempat terputus, script akan mendeteksi dan menunggu internet kembali, lalu menyalakan bot lagi secara otomatis tanpa perlu kamu ketik ulang!
* **Scan QR Code:** Buka WhatsApp di HP utama kamu -> Perangkat Tertaut (Linked Devices) -> Tautkan Perangkat -> Scan QR Code yang ada di layar Termux.

---

### Pilihan 2: Mode Latar Belakang (PM2 Background)
Jika kamu ingin bot berjalan di latar belakang tanpa harus membiarkan jendela Termux terbuka:
```bash
./start-pm2.sh
```

* Untuk melihat tampilan log & scan QR Code kapan saja:
  ```bash
  ./logs.sh
  ```
* Untuk melihat status apakah bot sedang berjalan:
  ```bash
  proot-distro login ubuntu -- pm2 status
  ```
* Untuk menghentikan bot:
  ```bash
  ./stop.sh
  ```

---

## 6. Perintah Tambahan yang Berguna

1. **Memperbarui yt-dlp ke versi terbaru:**
   Jika suatu saat Instagram/TikTok/YouTube mengubah sistem mereka dan unduhan gagal, cukup jalankan:
   ```bash
   ./update-ytdlp.sh
   ```
2. **Jika HP sempat mati/reboot:**
   Tinggal buka Termux lagi dan ketik:
   ```bash
   cd ~/wa-bot-termux
   ./start.sh
   ```
   *(Sesi login tersimpan otomatis di `.wwebjs_auth`, jadi kamu tidak perlu scan QR lagi).*
