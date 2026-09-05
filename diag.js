import fs from 'node:fs';
import path from 'node:path';

let allOk = true;

function log(...args) {
    console.log(...args);
}

log('================================================================');
log('              Valorant Store Bot Diagnostic Tool                ');
log('================================================================');
log('CWD:', process.cwd());
log('Node version:', process.version);
log('Platform:', process.platform, process.arch);

// 1. File and Directory Integrity Checks
const checks = [
    ['SkinPeek.js', 'Startup entry file'],
    ['discord/bot.js', 'Discord Gateway bot handler'],
    ['discord/embed.js', 'Discord embed layout builder'],
    ['valorant/auth.js', 'Valorant authentication engine'],
    ['valorant/shop.js', 'Valorant storefront fetcher'],
    ['services/canvasBanner.js', 'Canvas 2x2 storefront generator'],
    ['misc/keepAliveServer.js', 'Express HTTP keep-alive server'],
    ['languages/en-GB.json', 'i18n language catalog'],
    ['assets/vp.png', 'VP currency icon asset'],
    ['package.json', 'Package manifest']
];

for (const [rel, label] of checks) {
    const p = path.resolve(rel);
    const ok = fs.existsSync(p);
    if (!ok) allOk = false;
    let type = 'MISSING';
    if (ok) {
        try {
            const stat = fs.lstatSync(p);
            if (stat.isSymbolicLink()) {
                type = 'SYMLINK';
            } else if (stat.isDirectory()) {
                type = 'DIR';
            } else {
                type = 'FILE';
            }
        } catch (e) {
            type = 'ERROR: ' + e.message;
        }
    }
    log(`${ok ? '[PASS]' : '[FAIL]'} ${label.padEnd(35)} : ${rel} (${type})`);
}

// 2. Data directory and write permissions
const dataDir = path.resolve('data');
if (!fs.existsSync(dataDir)) {
    try {
        fs.mkdirSync(dataDir, { recursive: true });
        log('[PASS] Runtime data/ directory              : created successfully');
    } catch (err) {
        allOk = false;
        log('[FAIL] Runtime data/ directory              : failed to create (' + err.message + ')');
    }
} else {
    try {
        const testFile = path.join(dataDir, '.perm_test_' + Date.now());
        fs.writeFileSync(testFile, 'ok');
        fs.unlinkSync(testFile);
        log('[PASS] Runtime data/ directory              : writable');
    } catch (err) {
        allOk = false;
        log('[FAIL] Runtime data/ directory              : NOT WRITABLE (' + err.message + ')');
    }
}

// 3. Environment Variables Check
log('----------------------------------------------------------------');
log('Environment Variables:');
for (const k of ['DISCORD_TOKEN', 'CLIENT_ID', 'PORT', 'NODE_ENV', 'PUBLIC_URL', 'HDEV_TOKEN', 'DEFAULT_REGION']) {
    const v = process.env[k];
    const isSecret = ['DISCORD_TOKEN', 'HDEV_TOKEN'].includes(k);
    let display = 'MISSING';
    if (v) {
        display = isSecret ? `SET (${v.slice(0, 4)}...${v.slice(-4)})` : `SET (${v})`;
    }
    const critical = k === 'DISCORD_TOKEN';
    if (critical && !v && !fs.existsSync(path.resolve('config.json'))) {
        allOk = false;
        log(`[FAIL] env ${k.padEnd(20)} : ${display} (Required if config.json not present)`);
    } else {
        log(`[INFO] env ${k.padEnd(20)} : ${display}`);
    }
}

// 4. Critical Dependencies and Native Modules
log('----------------------------------------------------------------');
log('Module Import & Native Addon Tests:');

const modules = [
    'discord.js',
    'express',
    'axios',
    'dotenv',
    'node-cron',
    'fuzzysort',
    'unofficial-valorant-api'
];

for (const mod of modules) {
    try {
        await import(mod);
        log(`[PASS] import '${mod}'`);
    } catch (err) {
        allOk = false;
        log(`[FAIL] import '${mod}': ${err.message}`);
    }
}

// Test @napi-rs/canvas native Skia initialization
try {
    const canvasModule = await import('@napi-rs/canvas');
    const { createCanvas } = canvasModule;
    const testCanvas = createCanvas(100, 100);
    const ctx = testCanvas.getContext('2d');
    ctx.fillStyle = '#ff4655';
    ctx.fillRect(0, 0, 100, 100);
    const buf = testCanvas.toBuffer('image/png');
    if (buf && buf.length > 0) {
        log(`[PASS] @napi-rs/canvas native rendering     : OK (${buf.length} bytes PNG generated)`);
    } else {
        allOk = false;
        log('[FAIL] @napi-rs/canvas native rendering     : Empty buffer returned');
    }
} catch (err) {
    allOk = false;
    log(`[FAIL] @napi-rs/canvas native rendering     : ${err.message}`);
}

log('================================================================');
if (allOk) {
    log('               === ALL DIAGNOSTIC CHECKS PASSED ===             ');
    log('================================================================');
    process.exit(0);
} else {
    log('               === SOME DIAGNOSTIC CHECKS FAILED ===            ');
    log('================================================================');
    process.exit(1);
}
