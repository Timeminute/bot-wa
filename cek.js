const fs = require('fs');
const path = require('path');

let puppeteer;
try {
    puppeteer = require('puppeteer');
} catch (e) {
    try {
        puppeteer = require('whatsapp-web.js/node_modules/puppeteer');
    } catch (e2) {
        console.error('Gagal memuat modul puppeteer:', e.message);
        process.exit(1);
    }
}

async function test() {
    console.log('========================================');
    console.log('   DIAGNOSIS CHROMIUM & PUPPETEER');
    console.log('========================================');
    console.log('[1/4] Mencari file executable Chromium...');
    
    const candidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
    ];
    const execPath = candidates.find(p => p && fs.existsSync(p));
    console.log('Path Chromium:', execPath || 'TIDAK DITEMUKAN');

    if (!execPath) {
        console.error('ERROR: Chromium tidak ditemukan di sistem!');
        process.exit(1);
    }

    console.log('[2/4] Mencoba meluncurkan browser Chromium via Puppeteer...');
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            pipe: true,
            dumpio: true,
            timeout: 60000,
            executablePath: execPath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-extensions',
                '--disable-features=NetworkService,NetworkServiceInProcess'
            ]
        });

        console.log('[3/4] Browser berhasil terbuka! Membuka halaman uji coba...');
        const page = await browser.newPage();
        await page.goto('https://example.com', { waitUntil: 'networkidle2', timeout: 30000 });
        const title = await page.title();
        console.log('[4/4] HASIL: Berhasil memuat halaman dengan judul -> "' + title + '"');
        
        await browser.close();
        console.log('');
        console.log('KESIMPULAN: Chromium & Puppeteer berfungsi NORMAL di Termux PRoot!');
        console.log('========================================');
    } catch (err) {
        console.error('');
        console.error('KESIMPULAN: Chromium GAGAL diluncurkan.');
        console.error('Detail Error:', err);
        console.log('========================================');
        process.exit(1);
    }
}

test();
