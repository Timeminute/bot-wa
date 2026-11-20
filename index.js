cat << 'EOF' > index.js
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { execFile, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const termuxBinDir = '/data/data/com.termux/files/usr/bin';

let ffmpegPath = null;
try {
    const staticFfmpeg = require('ffmpeg-static');
    if (staticFfmpeg && fs.existsSync(staticFfmpeg)) {
        ffmpegPath = staticFfmpeg;
    }
} catch {}

if (!ffmpegPath) {
    const systemFfmpegCandidates = [
        path.join(termuxBinDir, 'ffmpeg'),
        '/usr/bin/ffmpeg',
        '/usr/local/bin/ffmpeg'
    ];
    const foundFfmpeg = systemFfmpegCandidates.find((p) => fs.existsSync(p));
    ffmpegPath = foundFfmpeg || 'ffmpeg';
}

// Prioritaskan path Chromium Termux Android murni terlebih dahulu
const browserCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    path.join(termuxBinDir, 'chromium-browser'),
    path.join(termuxBinDir, 'chromium'),
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

let executablePath = browserCandidates.find((p) => p && fs.existsSync(p));

if (!executablePath) {
    try {
        const whichBrowser = execSync('which chromium-browser || which chromium || which google-chrome-stable || which google-chrome || which chrome', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
        if (whichBrowser && fs.existsSync(whichBrowser)) {
            executablePath = whichBrowser;
        }
    } catch {}
}

if (!executablePath) {
    console.error('Error: Browser Chromium maupun Google Chrome tidak ditemukan.');
    console.error('Jalankan di Termux: pkg install x11-repo -y && pkg install chromium -y');
    process.exit(1);
}

console.log(`[Bot WA] Menggunakan browser: ${executablePath}`);

const winGetYtDlp = path.join(
    process.env.LOCALAPPDATA || '',
    'Microsoft',
    'WinGet',
    'Links',
    'yt-dlp.exe'
);
const ytDlpCandidates = [
    winGetYtDlp,
    path.join(termuxBinDir, 'yt-dlp'),
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp'
];
const ytDlpPath = ytDlpCandidates.find((p) => p && fs.existsSync(p)) || 'yt-dlp';

const tempDir = path.join(__dirname, 'temp_downloads');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

for (const file of fs.readdirSync(tempDir)) {
    try {
        fs.unlinkSync(path.join(tempDir, file));
    } catch {}
}

// Bersihkan lock file Chromium (SingletonLock) yang tertinggal jika proses sebelumnya terhenti
const authDir = path.join(__dirname, '.wwebjs_auth');
if (fs.existsSync(authDir)) {
    const cleanLocks = (dir) => {
        try {
            for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
                const fullPath = path.join(dir, item.name);
                if (item.isDirectory()) {
                    cleanLocks(fullPath);
                } else if (item.name.startsWith('Singleton')) {
                    fs.unlinkSync(fullPath);
                }
            }
        } catch {}
    };
    cleanLocks(authDir);
}

const pendingYoutubeChoices = new Map();
const CHOICE_TIMEOUT_MS = 2 * 60 * 1000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

const isTermux = Boolean(process.env.TERMUX_VERSION) || fs.existsSync(termuxBinDir);

const puppeteerArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--metrics-recording-only',
    '--mute-audio',
    // Flag khusus Linux/Termux Android (Chromium 133+)
    ...(process.platform === 'linux' || isTermux
        ? [
            '--no-zygote',
            '--disable-dbus',
            '--disable-crash-reporter',
            '--disable-features=VizDisplayCompositor,UseOzonePlatform'
        ]
        : [])
];

const client = new Client({
    authStrategy: new LocalAuth(),
    ffmpegPath: ffmpegPath,
    puppeteer: {
        headless: true,
        pipe: false,
        timeout: 120000,
        protocolTimeout: 120000,
        dumpio: false,
        executablePath: executablePath,
        args: puppeteerArgs
    }
});

client.on('qr', (qr) => {
    console.log('Scan QR Code ini menggunakan WhatsApp di HP Anda:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Bot WA (All-in-One Downloader: IG, TikTok, FB, X, Threads, YouTube & Stiker) aktif!');
});

function isSafePublicUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) return false;

        const hostname = parsed.hostname.toLowerCase();
        if (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '::1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
        ) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

function getCleanHostname(rawUrl) {
    try {
        return new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
        return '';
    }
}

function isYoutubeUrl(rawUrl) {
    const h = getCleanHostname(rawUrl);
    return h === 'youtube.com' || h === 'm.youtube.com' || h === 'music.youtube.com' || h === 'youtu.be';
}

function isInstagramUrl(rawUrl) {
    const h = getCleanHostname(rawUrl);
    return h === 'instagram.com' || h === 'instagr.am';
}

function isTikTokUrl(rawUrl) {
    const h = getCleanHostname(rawUrl);
    return h === 'tiktok.com' || h.endsWith('.tiktok.com');
}

function isFacebookUrl(rawUrl) {
    const h = getCleanHostname(rawUrl);
    return (
        h === 'facebook.com' ||
        h.endsWith('.facebook.com') ||
        h === 'fb.watch' ||
        h === 'fb.com' ||
        h === 'fb.gg'
    );
}

function isTwitterUrl(rawUrl) {
    const h = getCleanHostname(rawUrl);
    return h === 'x.com' || h === 'twitter.com' || h === 'mobile.twitter.com' || h === 't.co';
}

function isThreadsUrl(rawUrl) {
    const h = getCleanHostname(rawUrl);
    return h === 'threads.net' || h === 'threads.com';
}

function safeUnlink(filePath) {
    if (filePath && fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch {}
    }
}

// Memastikan video berformat MP4 (H.264 + AAC + yuv420p) agar tidak melempar "Error: t" di WhatsApp Web
function ensureWhatsAppCompatibleVideo(inputPath) {
    return new Promise((resolve) => {
        execFile(ffmpegPath, ['-i', inputPath], (err, stdout, stderr) => {
            const info = (stderr || '') + (stdout || '');
            const isH264 = /Video:\s*h264/i.test(info);
            const isYuv420p = /yuv420p/i.test(info);
            const isMp4Ext = inputPath.toLowerCase().endsWith('.mp4');

            if (isH264 && isYuv420p && isMp4Ext) {
                return resolve(inputPath);
            }

            console.log('[FFmpeg] Mengonversi codec video ke H.264 agar kompatibel dengan WhatsApp...');
            const outputPath = path.join(
                tempDir,
                `wa_h264_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`
            );

            const args = [
                '-y',
                '-i', inputPath,
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-crf', '26',
                '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                '-pix_fmt', 'yuv420p',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-movflags', '+faststart',
                outputPath
            ];

            execFile(ffmpegPath, args, { timeout: 120000 }, (convErr) => {
                if (!convErr && fs.existsSync(outputPath)) {
                    safeUnlink(inputPath);
                    resolve(outputPath);
                } else {
                    resolve(inputPath);
                }
            });
        });
    });
}

// Fallback otomatis ke dokumen jika WhatsApp menolak render video/gambar
async function sendMediaSafe(chatId, media, options = {}) {
    try {
        await client.sendMessage(chatId, media, options);
    } catch (err) {
        if (!options.sendMediaAsDocument && !options.sendMediaAsSticker) {
            console.warn('[WA] Pengiriman media standar gagal, mengirim ulang sebagai dokumen...');
            await client.sendMessage(chatId, media, {
                ...options,
                sendMediaAsDocument: true
            });
        } else {
            throw err;
        }
    }
}

async function sendVideoFileFromDisk(chatId, rawFilePath) {
    let finalPath = rawFilePath;
    try {
        finalPath = await ensureWhatsAppCompatibleVideo(rawFilePath);
        const fileSizeMB = fs.statSync(finalPath).size / (1024 * 1024);
        const media = MessageMedia.fromFilePath(finalPath);
        await sendMediaSafe(chatId, media, {
            sendMediaAsDocument: fileSizeMB > 60
        });
    } finally {
        safeUnlink(rawFilePath);
        if (finalPath !== rawFilePath) {
            safeUnlink(finalPath);
        }
    }
}

async function downloadUrlToTempFile(mediaUrl, referer = '', defaultExt = 'mp4') {
    const headers = {
        'User-Agent': USER_AGENT,
        'Accept': '*/*'
    };
    if (referer) headers['Referer'] = referer;

    const res = await fetch(mediaUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(45000),
        headers
    });

    if (!res.ok) {
        throw new Error(`Gagal mengunduh stream media (${res.status})`);
    }

    const filePath = path.join(
        tempDir,
        `stream_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${defaultExt}`
    );
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

async function fetchMediaAsMessageMedia(mediaUrl, referer = 'https://www.instagram.com/') {
    const res = await fetch(mediaUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(30000),
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,video/*,*/*;q=0.8',
            'Referer': referer
        }
    });

    if (!res.ok) {
        throw new Error(`Gagal mengunduh file media (${res.status})`);
    }

    const contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    const arrayBuffer = await res.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    let ext = 'jpg';
    if (contentType.includes('video/mp4')) ext = 'mp4';
    else if (contentType.includes('image/png')) ext = 'png';
    else if (contentType.includes('image/webp')) ext = 'webp';

    return new MessageMedia(contentType, base64Data, `media_${Date.now()}.${ext}`);
}

async function sendExtractedMediaItems(chatId, items, referer, makeSticker = false) {
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`Mengirim media ${i + 1}/${items.length} (${item.type})...`);

        if (item.type === 'video') {
            const tempVideo = await downloadUrlToTempFile(item.url, referer, 'mp4');
            await sendVideoFileFromDisk(chatId, tempVideo);
        } else {
            const media = await fetchMediaAsMessageMedia(item.url, referer);
            await sendMediaSafe(chatId, media, {
                sendMediaAsSticker: makeSticker,
                stickerName: 'Stiker Otomatis',
                stickerAuthor: 'WA Bot'
            });
        }
    }
}

function extractJsonStringLiteral(text, keyName) {
    const keyIdx = text.indexOf(`"${keyName}"`);
    if (keyIdx === -1) return null;

    const colonIdx = text.indexOf(':', keyIdx + keyName.length + 2);
    if (colonIdx === -1) return null;

    const startQuote = text.indexOf('"', colonIdx + 1);
    if (startQuote === -1) return null;

    let i = startQuote + 1;
    while (i < text.length) {
        const ch = text[i];
        if (ch === '\\') {
            i += 2;
            continue;
        }
        if (ch === '"') {
            const rawLiteral = text.slice(startQuote, i + 1);
            return JSON.parse(rawLiteral);
        }
        i++;
    }
    return null;
}

function extractBalancedJsonObject(text, startSearchIdx) {
    const firstBrace = text.indexOf('{', startSearchIdx);
    if (firstBrace === -1) return null;

    let depth = 0;
    let inString = false;
    let i = firstBrace;

    while (i < text.length) {
        const ch = text[i];
        if (inString) {
            if (ch === '\\') {
                i += 2;
                continue;
            }
            if (ch === '"') {
                inString = false;
            }
        } else {
            if (ch === '"') {
                inString = true;
            } else if (ch === '{') {
                depth++;
            } else if (ch === '}') {
                depth--;
                if (depth === 0) {
                    return text.slice(firstBrace, i + 1);
                }
            }
        }
        i++;
    }
    return null;
}

function parseInstagramShortcodeMedia(media) {
    if (!media) return [];
    const results = [];

    const extractNode = (node) => {
        if (!node) return;
        const videoUrl =
            node.video_url ||
            (Array.isArray(node.video_versions) && node.video_versions[0]?.url) ||
            (Array.isArray(node.video_resources) && node.video_resources[0]?.src);

        if ((node.is_video || node.media_type === 2) && videoUrl) {
            results.push({ type: 'video', url: videoUrl });
            return;
        }

        const resources = node.display_resources;
        const highResImg =
            node.display_url ||
            (Array.isArray(resources) && resources.length > 0
                ? resources[resources.length - 1].src
                : null) ||
            (Array.isArray(node.image_versions2?.candidates) && node.image_versions2.candidates[0]?.url) ||
            node.thumbnail_src;

        if (highResImg) {
            results.push({ type: 'image', url: highResImg });
        }
    };

    const sidecarEdges = media.edge_sidecar_to_children?.edges;
    if (Array.isArray(sidecarEdges) && sidecarEdges.length > 0) {
        for (const edge of sidecarEdges) {
            extractNode(edge?.node || edge);
        }
    } else if (Array.isArray(media.carousel_media) && media.carousel_media.length > 0) {
        for (const item of media.carousel_media) {
            extractNode(item);
        }
    } else {
        extractNode(media);
    }

    return results;
}

function parseEmbedHtmlForMedia(html) {
    const addIdx = html.indexOf('__additionalDataLoaded');
    if (addIdx !== -1) {
        const jsonStr = extractBalancedJsonObject(html, addIdx);
        if (jsonStr) {
            try {
                const parsed = JSON.parse(jsonStr);
                const media = parsed?.shortcode_media || parsed?.gql_data?.shortcode_media || parsed;
                const items = parseInstagramShortcodeMedia(media);
                if (items.length > 0) return items;
            } catch {}
        }
    }

    try {
        const unescapedContext = extractJsonStringLiteral(html, 'contextJSON');
        if (unescapedContext) {
            const contextData = JSON.parse(unescapedContext);
            const shortcodeMedia =
                contextData?.gql_data?.shortcode_media ||
                contextData?.gql_data?.xdt_shortcode_media ||
                contextData?.shortcode_media;
            const items = parseInstagramShortcodeMedia(shortcodeMedia);
            if (items.length > 0) return items;
        }
    } catch {}

    return [];
}

async function extractInstagramMedia(rawUrl) {
    let targetUrl = rawUrl;
    if (/\/share\//i.test(rawUrl)) {
        try {
            const redirRes = await fetch(rawUrl, {
                redirect: 'follow',
                signal: AbortSignal.timeout(15000),
                headers: { 'User-Agent': USER_AGENT }
            });
            targetUrl = redirRes.url;
            if (redirRes.body) await redirRes.body.cancel();
        } catch {}
    }

    const match = targetUrl.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
    if (!match) return [];
    const shortcode = match[1];

    try {
        const variables = JSON.stringify({
            shortcode: shortcode,
            child_comment_count: 3,
            fetch_comment_count: 40,
            parent_comment_count: 24,
            has_threaded_comments: true
        });
        const gqlGetUrl = `https://www.instagram.com/graphql/query/?hl=en&query_hash=9f8827793ef34641b2fb195d4d41151c&variables=${encodeURIComponent(variables)}`;

        const gqlGetRes = await fetch(gqlGetUrl, {
            signal: AbortSignal.timeout(15000),
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': '*/*',
                'X-IG-App-ID': '936619743392459',
                'X-ASBD-ID': '198387',
                'X-IG-WWW-Claim': '0',
                'Origin': 'https://www.instagram.com',
                'Referer': `https://www.instagram.com/p/${shortcode}/`
            }
        });

        if (gqlGetRes.ok) {
            const json = await gqlGetRes.json();
            const media = json?.data?.shortcode_media || json?.data?.xdt_shortcode_media;
            const items = parseInstagramShortcodeMedia(media);
            if (items.length > 0) {
                console.log(`[IG] Berhasil mengekstrak ${items.length} slide via GraphQL.`);
                return items;
            }
        }
    } catch {}

    for (const suffix of ['embed/', 'embed/captioned/']) {
        try {
            const embedUrl = `https://www.instagram.com/p/${shortcode}/${suffix}`;
            const embedRes = await fetch(embedUrl, {
                signal: AbortSignal.timeout(15000),
                headers: { 'User-Agent': USER_AGENT }
            });

            if (embedRes.ok) {
                const html = await embedRes.text();
                const items = parseEmbedHtmlForMedia(html);
                if (items.length > 0) {
                    console.log(`[IG] Berhasil mengekstrak ${items.length} slide via Embed.`);
                    return items;
                }
            }
        } catch {}
    }

    if (client.pupBrowser) {
        let page = null;
        try {
            page = await client.pupBrowser.newPage();
            await page.setUserAgent(USER_AGENT);
            await page.goto(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            const htmlContent = await page.content();
            const scriptItems = parseEmbedHtmlForMedia(htmlContent);
            if (scriptItems.length > 0) {
                console.log(`[IG] Berhasil mengekstrak ${scriptItems.length} slide via Puppeteer Script.`);
                return scriptItems;
            }

            const collected = [];
            const seenUrls = new Set();

            for (let step = 0; step < 25; step++) {
                const currentSlideMedia = await page.evaluate(() => {
                    const found = [];
                    document.querySelectorAll('.Embed video, .EmbedSidecar video, video').forEach((v) => {
                        if (v.src && v.src.startsWith('http')) found.push({ type: 'video', url: v.src });
                    });
                    document.querySelectorAll('img.EmbeddedMediaImage, .EmbedSidecar img').forEach((img) => {
                        let bestUrl = img.src;
                        if (img.srcset) {
                            const candidates = img.srcset
                                .split(',')
                                .map((s) => s.trim().split(/\s+/)[0])
                                .filter(Boolean);
                            if (candidates.length > 0) bestUrl = candidates[candidates.length - 1];
                        }
                        if (bestUrl && bestUrl.startsWith('http') && !bestUrl.includes('s150x150')) {
                            found.push({ type: 'image', url: bestUrl });
                        }
                    });
                    return found;
                });

                for (const item of currentSlideMedia) {
                    if (!seenUrls.has(item.url)) {
                        seenUrls.add(item.url);
                        collected.push(item);
                    }
                }

                const clickedNext = await page.evaluate(() => {
                    const selectors = [
                        'a.coreSpriteRightChevron',
                        'button.coreSpriteRightChevron',
                        '.coreSpriteRightChevron',
                        'button[aria-label="Next"]',
                        'button[aria-label="Berikutnya"]',
                        '.RightChevron'
                    ];
                    for (const sel of selectors) {
                        const btn = document.querySelector(sel);
                        if (btn && btn.offsetParent !== null) {
                            btn.click();
                            return true;
                        }
                    }
                    return false;
                });

                if (!clickedNext) break;
                await new Promise((r) => setTimeout(r, 550));
            }

            if (collected.length > 0) return collected;
        } catch (err) {
            console.warn('[IG] Puppeteer fallback gagal:', err.message);
        } finally {
            if (page) await page.close().catch(() => {});
        }
    }

    return [];
}

async function extractTikTokMedia(rawUrl) {
    try {
        const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(rawUrl)}&hd=1`;
        const res = await fetch(apiUrl, {
            signal: AbortSignal.timeout(20000),
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json'
            }
        });

        if (res.ok) {
            const json = await res.json();
            const data = json?.data;
            if (data) {
                if (Array.isArray(data.images) && data.images.length > 0) {
                    console.log(`[TikTok] Mendeteksi ${data.images.length} slide foto.`);
                    return data.images.map((imgUrl) => ({ type: 'image', url: imgUrl }));
                }

                // Prioritaskan stream H.264 play agar ringan & kompatibel
                const videoUrl = data.play || data.hdplay || data.wmplay;
                if (videoUrl) {
                    const fullVideoUrl = videoUrl.startsWith('http')
                        ? videoUrl
                        : `https://www.tikwm.com${videoUrl}`;
                    console.log('[TikTok] Berhasil mendapatkan stream video via TikWM.');
                    return [{ type: 'video', url: fullVideoUrl }];
                }
            }
        }
    } catch (err) {
        console.warn('[TikTok] TikWM API dilewati, beralih ke yt-dlp:', err.message);
    }
    return [];
}

async function extractTwitterMedia(rawUrl) {
    let targetUrl = rawUrl;
    if (getCleanHostname(rawUrl) === 't.co') {
        try {
            const redir = await fetch(rawUrl, {
                redirect: 'follow',
                signal: AbortSignal.timeout(15000),
                headers: { 'User-Agent': USER_AGENT }
            });
            targetUrl = redir.url;
            if (redir.body) await redir.body.cancel();
        } catch {}
    }

    const match = targetUrl.match(/(?:twitter\.com|x\.com)\/(?:[^/]+)\/status\/(\d+)/i);
    if (!match) return [];
    const statusId = match[1];

    try {
        const res = await fetch(`https://api.fxtwitter.com/status/${statusId}`, {
            signal: AbortSignal.timeout(15000),
            headers: { 'User-Agent': USER_AGENT }
        });
        if (res.ok) {
            const json = await res.json();
            const allMedia = json?.tweet?.media?.all;
            if (Array.isArray(allMedia) && allMedia.length > 0) {
                console.log(`[X/Twitter] Menemukan ${allMedia.length} media via FxTwitter.`);
                return allMedia.map((m) => ({
                    type: m.type === 'video' || m.type === 'gif' ? 'video' : 'image',
                    url: m.url
                }));
            }
        }
    } catch {}

    try {
        const res = await fetch(`https://api.vxtwitter.com/Twitter/status/${statusId}`, {
            signal: AbortSignal.timeout(15000),
            headers: { 'User-Agent': USER_AGENT }
        });
        if (res.ok) {
            const json = await res.json();
            const extMedia = json?.media_extended;
            if (Array.isArray(extMedia) && extMedia.length > 0) {
                console.log(`[X/Twitter] Menemukan ${extMedia.length} media via VxTwitter.`);
                return extMedia.map((m) => ({
                    type: m.type === 'video' || m.type === 'gif' ? 'video' : 'image',
                    url: m.url
                }));
            }
        }
    } catch {}

    return [];
}

async function extractThreadsMedia(rawUrl) {
    const match = rawUrl.match(/threads\.(?:net|com)\/(?:@[^/]+\/post|t)\/([A-Za-z0-9_-]+)/i);
    const shortcode = match ? match[1] : null;

    if (shortcode) {
        try {
            const embedUrl = `https://www.threads.net/@_/post/${shortcode}/embed/`;
            const res = await fetch(embedUrl, {
                signal: AbortSignal.timeout(15000),
                headers: { 'User-Agent': USER_AGENT }
            });

            if (res.ok) {
                const html = await res.text();
                const items = [];
                const seen = new Set();

                const videoMatches = html.matchAll(/<source[^>]+src=["']([^"']+)["']/gi);
                for (const m of videoMatches) {
                    const vUrl = m[1].replace(/&amp;/g, '&');
                    if (!seen.has(vUrl)) {
                        seen.add(vUrl);
                        items.push({ type: 'video', url: vUrl });
                    }
                }

                const imgMatches = html.matchAll(/<img[^>]+class=["'][^"']*SingleInnerMedia[^"']*["'][^>]+src=["']([^"']+)["']/gi);
                for (const m of imgMatches) {
                    const iUrl = m[1].replace(/&amp;/g, '&');
                    if (!seen.has(iUrl)) {
                        seen.add(iUrl);
                        items.push({ type: 'image', url: iUrl });
                    }
                }

                if (items.length > 0) {
                    console.log(`[Threads] Menemukan ${items.length} media via Embed.`);
                    return items;
                }
            }
        } catch {}
    }

    if (client.pupBrowser) {
        let page = null;
        try {
            page = await client.pupBrowser.newPage();
            await page.setUserAgent(USER_AGENT);
            const target = shortcode
                ? `https://www.threads.net/@_/post/${shortcode}/embed/`
                : rawUrl;

            await page.goto(target, { waitUntil: 'networkidle2', timeout: 30000 });

            const items = await page.evaluate(() => {
                const found = [];
                const seen = new Set();

                document.querySelectorAll('video, video source').forEach((el) => {
                    const src = el.src || el.getAttribute('src');
                    if (src && src.startsWith('http') && !seen.has(src)) {
                        seen.add(src);
                        found.push({ type: 'video', url: src });
                    }
                });

                document.querySelectorAll('picture img, .MediaContainer img, .SingleInnerMediaContainer img, article img').forEach((img) => {
                    if (img.width > 120 || !img.width) {
                        const src = img.src;
                        if (
                            src &&
                            src.startsWith('http') &&
                            !src.includes('s150x150') &&
                            !src.includes('ProfilePic') &&
                            !seen.has(src)
                        ) {
                            seen.add(src);
                            found.push({ type: 'image', url: src });
                        }
                    }
                });

                return found;
            });

            if (items.length > 0) {
                console.log(`[Threads] Menemukan ${items.length} media via Puppeteer.`);
                return items;
            }
        } catch (err) {
            console.warn('[Threads] Puppeteer fallback gagal:', err.message);
        } finally {
            if (page) await page.close().catch(() => {});
        }
    }

    return [];
}

async function extractFacebookMediaWithPuppeteer(rawUrl) {
    if (!client.pupBrowser) return { resolvedUrl: rawUrl, items: [] };

    let page = null;
    try {
        page = await client.pupBrowser.newPage();
        await page.setUserAgent(USER_AGENT);
        await page.goto(rawUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        const resolvedUrl = page.url();
        const html = await page.content();
        const items = [];

        const hdMatch =
            html.match(/"browser_native_hd_url"\s*:\s*"([^"]+)"/) ||
            html.match(/"playable_url_quality_hd"\s*:\s*"([^"]+)"/);
        const sdMatch =
            html.match(/"browser_native_sd_url"\s*:\s*"([^"]+)"/) ||
            html.match(/"playable_url"\s*:\s*"([^"]+)"/);

        const rawVideoJsonUrl = hdMatch?.[1] || sdMatch?.[1];
        if (rawVideoJsonUrl) {
            const cleanVideoUrl = JSON.parse(`"${rawVideoJsonUrl}"`);
            if (cleanVideoUrl.startsWith('http')) {
                items.push({ type: 'video', url: cleanVideoUrl });
                return { resolvedUrl, items };
            }
        }

        const domMedia = await page.evaluate(() => {
            const found = [];
            const seen = new Set();

            document.querySelectorAll('video').forEach((v) => {
                if (v.src && v.src.startsWith('http') && !seen.has(v.src)) {
                    seen.add(v.src);
                    found.push({ type: 'video', url: v.src });
                }
            });

            if (found.length === 0) {
                document.querySelectorAll('img[src*="scontent"]').forEach((img) => {
                    if ((img.naturalWidth >= 250 || img.width >= 250) && !seen.has(img.src)) {
                        seen.add(img.src);
                        found.push({ type: 'image', url: img.src });
                    }
                });
            }
            return found;
        });

        return { resolvedUrl, items: domMedia };
    } catch (err) {
        console.warn('[FB] Puppeteer ekstraktor gagal:', err.message);
        return { resolvedUrl: rawUrl, items: [] };
    } finally {
        if (page) await page.close().catch(() => {});
    }
}

async function inspectUrlSafe(url) {
    try {
        const res = await fetch(url, {
            redirect: 'follow',
            signal: AbortSignal.timeout(15000),
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
        });

        if (!res.ok) return { type: 'unknown', directUrl: url, ogImageUrl: null };
        if (!isSafePublicUrl(res.url)) {
            if (res.body) await res.body.cancel();
            return { type: 'unknown', directUrl: url, ogImageUrl: null };
        }

        const contentType = (res.headers.get('content-type') || '').toLowerCase();

        if (contentType.startsWith('image/')) {
            if (res.body) await res.body.cancel();
            return { type: 'image', directUrl: res.url };
        }

        if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
            if (res.body) await res.body.cancel();
            return { type: 'direct_file', directUrl: res.url, contentType };
        }

        const html = await res.text();
        const ogMatch =
            html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);

        let ogImageUrl = ogMatch ? ogMatch[1].replace(/&amp;/g, '&') : null;
        if (ogImageUrl && ogImageUrl.startsWith('/')) {
            ogImageUrl = new URL(ogImageUrl, res.url).href;
        }

        return { type: 'webpage', directUrl: res.url, ogImageUrl };
    } catch {
        return { type: 'unknown', directUrl: url, ogImageUrl: null };
    }
}

function runYtDlpProcess(url, mode, allowPlaylist, extraArgs = []) {
    return new Promise((resolve, reject) => {
        const fileId = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const outputTemplate = path.join(tempDir, `${fileId}_%(autonumber)s.%(ext)s`);

        const videoFormat =
            'bestvideo[vcodec^=avc1][height<=720]+bestaudio[ext=m4a]/' +
            'best[vcodec^=avc1][ext=mp4][height<=720]/' +
            'best[ext=mp4][filesize<95M]/' +
            'bestvideo[height<=720]+bestaudio/' +
            'best';

        const playlistFlag = allowPlaylist ? '--yes-playlist' : '--no-playlist';

        const commonFlags = [
            '--js-runtimes', 'node',
            '--remote-components', 'ejs:github',
            '--ffmpeg-location', ffmpegPath,
            playlistFlag,
            '--max-filesize', '100M',
            ...extraArgs,
            '-o', outputTemplate,
            url
        ];

        const args = mode === 'audio'
            ? [
                '-f', 'bestaudio/best',
                '-x',
                '--audio-format', 'mp3',
                '--audio-quality', '0',
                ...commonFlags
            ]
            : [
                '-f', videoFormat,
                '-S', 'vcodec:h264,res:720,acodec:m4a',
                '--merge-output-format', 'mp4',
                ...commonFlags
            ];

        const nodeDir = path.dirname(process.execPath);
        const envWithNode = {
            ...process.env,
            PATH: `${nodeDir}${path.delimiter}${process.env.PATH || ''}`
        };

        execFile(
            ytDlpPath,
            args,
            { maxBuffer: 1024 * 1024 * 100, timeout: 150000, env: envWithNode },
            (error, stdout, stderr) => {
                const downloadedFiles = fs
                    .readdirSync(tempDir)
                    .filter((file) => file.startsWith(fileId))
                    .sort()
                    .map((file) => path.join(tempDir, file));

                if (downloadedFiles.length === 0) {
                    return reject(new Error(stderr || (error ? error.message : 'File hasil unduhan tidak ditemukan.')));
                }

                resolve(downloadedFiles);
            }
        );
    });
}

async function downloadWithYtDlp(url, mode = 'video', allowPlaylist = false) {
    try {
        return await runYtDlpProcess(url, mode, allowPlaylist);
    } catch (firstErr) {
        if (isYoutubeUrl(url)) {
            console.warn('[YouTube] Percobaan pertama gagal, mencoba ulang dengan player_client alternatif...');
            return await runYtDlpProcess(url, mode, allowPlaylist, [
                '--extractor-args', 'youtube:player_client=android_vr,tv,mweb'
            ]);
        }
        throw firstErr;
    }
}

async function downloadAndSendViaYtDlp(chatId, url, mode = 'video', allowPlaylist = true) {
    const filePaths = await downloadWithYtDlp(url, mode, allowPlaylist);
    try {
        for (const filePath of filePaths) {
            if (mode === 'audio') {
                const media = MessageMedia.fromFilePath(filePath);
                await sendMediaSafe(chatId, media, { sendMediaAsDocument: true });
                safeUnlink(filePath);
            } else {
                await sendVideoFileFromDisk(chatId, filePath);
            }
        }
    } finally {
        for (const filePath of filePaths) {
            safeUnlink(filePath);
        }
    }
}

function setYoutubeSession(chatId, url) {
    const existing = pendingYoutubeChoices.get(chatId);
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
        pendingYoutubeChoices.delete(chatId);
    }, CHOICE_TIMEOUT_MS);

    pendingYoutubeChoices.set(chatId, { url, timer });
}

function clearYoutubeSession(chatId) {
    const existing = pendingYoutubeChoices.get(chatId);
    if (existing) {
        clearTimeout(existing.timer);
        pendingYoutubeChoices.delete(chatId);
    }
}

client.on('message', async (msg) => {
    if (msg.from === 'status@broadcast') return;

    const text = (msg.body || '').trim();

    try {
        if (pendingYoutubeChoices.has(msg.from)) {
            const normalized = text.toLowerCase();

            if (normalized === 'batal' || normalized === 'cancel' || normalized === '0') {
                clearYoutubeSession(msg.from);
                await msg.reply('Unduhan YouTube dibatalkan.');
                return;
            }

            const isVideoChoice = normalized === '1' || normalized === 'video';
            const isMusicChoice =
                normalized === '2' ||
                normalized === 'music' ||
                normalized === 'musik' ||
                normalized === 'mp3' ||
                normalized === 'audio';

            if (isVideoChoice || isMusicChoice) {
                const session = pendingYoutubeChoices.get(msg.from);
                clearYoutubeSession(msg.from);
                const mode = isMusicChoice ? 'audio' : 'video';

                await msg.react('⏳');
                await downloadAndSendViaYtDlp(msg.from, session.url, mode, false);
                await msg.react('✅');
                return;
            }
        }

        if (msg.hasMedia) {
            const media = await msg.downloadMedia();
            if (!media) return;

            const isImage = media.mimetype.startsWith('image/');
            const isVideoOrGif = media.mimetype.startsWith('video/');

            if (isImage || isVideoOrGif) {
                const jenis = isVideoOrGif ? 'video/GIF' : 'gambar';
                console.log(`Memproses stiker ${jenis} dari ${msg.from}...`);

                await client.sendMessage(msg.from, media, {
                    sendMediaAsSticker: true,
                    stickerName: 'Stiker Otomatis',
                    stickerAuthor: 'WA Bot'
                });
                return;
            }
        }

        const urlMatch = text.match(/https?:\/\/[^\s"'<>]+/i);
        if (urlMatch) {
            const url = urlMatch[0];

            if (!isSafePublicUrl(url)) {
                throw new Error('URL tidak valid.');
            }

            if (isYoutubeUrl(url)) {
                setYoutubeSession(msg.from, url);
                await msg.reply(
                    'Link YouTube terdeteksi. Pilih format unduhan dengan membalas:\n\n' +
                    '*1* atau *video* (Unduh Video MP4)\n' +
                    '*2* atau *music* (Unduh Audio MP3)\n\n' +
                    '_(Ketik *0* untuk batal, berlaku 2 menit)_'
                );
                return;
            }

            const makeSticker = /\bstiker\b/i.test(text);
            console.log(`Mendeteksi link dari ${msg.from}: ${url}`);
            await msg.react('⏳');

            if (isInstagramUrl(url)) {
                const igItems = await extractInstagramMedia(url);
                if (igItems.length > 0) {
                    await sendExtractedMediaItems(msg.from, igItems, 'https://www.instagram.com/', makeSticker);
                    await msg.react('✅');
                    return;
                }
            }

            if (isTikTokUrl(url)) {
                const ttItems = await extractTikTokMedia(url);
                if (ttItems.length > 0) {
                    await sendExtractedMediaItems(msg.from, ttItems, 'https://www.tiktok.com/', makeSticker);
                    await msg.react('✅');
                    return;
                }
                await downloadAndSendViaYtDlp(msg.from, url, 'video', true);
                await msg.react('✅');
                return;
            }

            if (isTwitterUrl(url)) {
                const xItems = await extractTwitterMedia(url);
                if (xItems.length > 0) {
                    await sendExtractedMediaItems(msg.from, xItems, 'https://x.com/', makeSticker);
                    await msg.react('✅');
                    return;
                }
                await downloadAndSendViaYtDlp(msg.from, url, 'video', true);
                await msg.react('✅');
                return;
            }

            if (isThreadsUrl(url)) {
                const threadsItems = await extractThreadsMedia(url);
                if (threadsItems.length > 0) {
                    await sendExtractedMediaItems(msg.from, threadsItems, 'https://www.threads.net/', makeSticker);
                    await msg.react('✅');
                    return;
                }
            }

            if (isFacebookUrl(url)) {
                try {
                    await downloadAndSendViaYtDlp(msg.from, url, 'video', true);
                    await msg.react('✅');
                    return;
                } catch {
                    console.log('[FB] Mencoba mengekstrak link share/post Facebook via Puppeteer...');
                    const fbData = await extractFacebookMediaWithPuppeteer(url);
                    if (fbData.items.length > 0) {
                        await sendExtractedMediaItems(msg.from, fbData.items, 'https://www.facebook.com/', makeSticker);
                        await msg.react('✅');
                        return;
                    }
                    if (fbData.resolvedUrl && fbData.resolvedUrl !== url) {
                        await downloadAndSendViaYtDlp(msg.from, fbData.resolvedUrl, 'video', true);
                        await msg.react('✅');
                        return;
                    }
                    throw new Error('Media Facebook tidak ditemukan atau bersifat privat.');
                }
            }

            const info = await inspectUrlSafe(url);

            if (info.type === 'image') {
                const media = await fetchMediaAsMessageMedia(info.directUrl, url);
                await sendMediaSafe(msg.from, media, {
                    sendMediaAsSticker: makeSticker,
                    stickerName: 'Stiker Otomatis',
                    stickerAuthor: 'WA Bot'
                });
                await msg.react('✅');
                return;
            }

            if (info.type === 'direct_file') {
                const media = await MessageMedia.fromUrl(info.directUrl, { unsafeMime: true });
                const sendAsDoc = !media.mimetype.startsWith('video/');
                await sendMediaSafe(msg.from, media, {
                    sendMediaAsDocument: sendAsDoc
                });
                await msg.react('✅');
                return;
            }

            try {
                await downloadAndSendViaYtDlp(msg.from, info.directUrl || url, 'video', true);
                await msg.react('✅');
            } catch (ytError) {
                if (info.ogImageUrl) {
                    const media = await fetchMediaAsMessageMedia(info.ogImageUrl, url);
                    await sendMediaSafe(msg.from, media, {
                        sendMediaAsSticker: makeSticker,
                        stickerName: 'Stiker Otomatis',
                        stickerAuthor: 'WA Bot'
                    });
                    await msg.react('✅');
                } else {
                    throw ytError;
                }
            }
        }
    } catch (error) {
        console.error('Terjadi kesalahan:', error.message || error);
        await msg.react('❌');
        await msg.reply('Gagal mengunduh media. Pastikan link bersifat publik, valid, dan bukan akun private.');
    }
});

process.on('uncaughtException', (err) => {
    console.error('[Bot WA] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Bot WA] Unhandled Rejection:', reason);
});

client.on('disconnected', (reason) => {
    console.log('[Bot WA] Terputus dari WhatsApp Web:', reason);
    process.exit(1);
});

client.initialize().catch((err) => {
    console.error('[Bot WA] Gagal menginisialisasi WhatsApp Web:', err);
    process.exit(1);
});
EOF
