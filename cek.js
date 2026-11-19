const fs = require('fs');
const path = require('path');

let puppeteer = null;
const possiblePaths = [
    'puppeteer',
    './node_modules/puppeteer',
    './node_modules/whatsapp-web.js/node_modules/puppeteer',
    '/root/wa-bot/node_modules/puppeteer',
    '/root/wa-bot/node_modules/whatsapp-web.js/node_modules/puppeteer'
];

for (const p of possiblePaths) {
    try {
        puppeteer = require(p);
        if (puppeteer) break;
    } catch {}
}

if (!puppeteer) {
    try {
        const wweb = require('whatsapp-web.js');
        // fallback
    } catch {}
}

async function tryLaunch(execPath, usePipe) {
    console.log(`\n--> Menjalankan Puppeteer (pipe: ${usePipe})...`);
    try {
        const browser = await puppeteer.launch({
            headless: true,
            pipe: usePipe,
            dumpio: true,
            timeout: 30000,
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

        console.log(`[+] SUKSES: Browser berhasil diluncurkan (pipe: ${usePipe})!`);
        console.log('[+] Membuka halaman https://example.com...');
        const page = await browser.newPage();
        await page.goto('https://example.com', { waitUntil: 'networkidle2', timeout: 30000 });
        const title = await page.title();
        console.log(`[+] SUKSES: Halaman berhasil dibuka! Judul -> "${title}"`);
        await browser.close();
        console.log(`[+] Browser ditutup dengan normal.`);
        return true;
    } catch (err) {
        console.error(`[-] GAGAL (pipe: ${usePipe}):`, err.message || err);
        return false;
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

    if (!puppeteer) {
        console.error('ERROR: Modul puppeteer tidak ditemukan di node_modules!');
        process.exit(1);
    }

    console.log('[2/4] Menjalankan tes koneksi browser...');
    // Tes 1: pipe: true
    const pipeOk = await tryLaunch(execPath, true);
    
    // Tes 2: pipe: false (WebSocket)
    const wsOk = await tryLaunch(execPath, false);

    console.log('\n========================================');
    console.log('HASIL DIAGNOSIS:');
    console.log(`- Mode Pipe:      ${pipeOk ? 'BERHASIL' : 'GAGAL'}`);
    console.log(`- Mode WebSocket: ${wsOk ? 'BERHASIL' : 'GAGAL'}`);
    console.log('========================================');

    if (pipeOk || wsOk) {
        console.log('Chromium siap digunakan untuk WhatsApp Web!');
    } else {
        console.error('Kedua mode gagal. Periksa log detail di atas.');
        process.exit(1);
    }
}

test();
