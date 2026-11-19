const fs = require('fs');

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

async function tryConfig(execPath, cfg) {
    process.stdout.write(`[*] Menguji: ${cfg.name} ... `);

    const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions'
    ];

    if (cfg.singleProcess) {
        args.push('--single-process', '--no-zygote');
    }

    try {
        const browser = await puppeteer.launch({
            headless: cfg.headless,
            pipe: cfg.pipe,
            timeout: 20000,
            executablePath: execPath,
            args: args
        });

        const page = await browser.newPage();
        await page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
        const title = await page.title();
        await browser.close();

        console.log(`\x1b[32mBERHASIL!\x1b[0m (Judul: "${title}")`);
        return true;
    } catch (err) {
        console.log(`\x1b[31mGAGAL\x1b[0m (${err.message.split('\n')[0]})`);
        return false;
    }
}

async function test() {
    console.log('========================================');
    console.log('   PENGUJIAN KOMBINASI PUPPETEER');
    console.log('========================================');
    
    const candidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
    ];
    const execPath = candidates.find(p => p && fs.existsSync(p));

    if (!execPath || !puppeteer) {
        console.error('Chromium atau Puppeteer tidak siap.');
        process.exit(1);
    }

    const configs = [
        { name: 'Headless True + SingleProcess (Pipe)', headless: true, pipe: true, singleProcess: true },
        { name: 'Headless True + SingleProcess (WS)', headless: true, pipe: false, singleProcess: true },
        { name: 'Headless Shell + SingleProcess (Pipe)', headless: 'shell', pipe: true, singleProcess: true },
        { name: 'Headless Shell + SingleProcess (WS)', headless: 'shell', pipe: false, singleProcess: true },
        { name: 'Headless Shell (Multi-process, Pipe)', headless: 'shell', pipe: true, singleProcess: false },
        { name: 'Headless Shell (Multi-process, WS)', headless: 'shell', pipe: false, singleProcess: false }
    ];

    let successConfig = null;

    for (const cfg of configs) {
        const ok = await tryConfig(execPath, cfg);
        if (ok && !successConfig) {
            successConfig = cfg;
        }
    }

    console.log('\n========================================');
    if (successConfig) {
        console.log('\x1b[32mHASIL: Ditemukan konfigurasi yang BERHASIL!\x1b[0m');
        console.log(`Gunakan: ${successConfig.name}`);
        console.log(JSON.stringify(successConfig, null, 2));
    } else {
        console.log('\x1b[31mHASIL: Semua kombinasi gagal.\x1b[0m');
    }
    console.log('========================================');
}

test();
