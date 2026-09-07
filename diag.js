import 'dotenv/config';
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
    ['views/login.html', 'Web Portal login template'],
    ['languages/en-GB.json', 'i18n language catalog'],
    ['assets/vp.png', 'VP currency icon asset'],
    ['assets/valorant-store-helper.zip', 'Extension download package'],
    ['_passenger.cjs', 'Plesk Passenger loader'],
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

// 3. Environment & Configuration Check
log('----------------------------------------------------------------');
log('Environment & Configuration:');
let configJson = null;
if (fs.existsSync(path.resolve('config.json'))) {
    try {
        configJson = JSON.parse(fs.readFileSync(path.resolve('config.json'), 'utf8'));
    } catch (_) {}
}

for (const k of ['DISCORD_TOKEN', 'CLIENT_ID', 'PORT', 'NODE_ENV', 'PUBLIC_URL', 'HDEV_TOKEN', 'DEFAULT_REGION', 'DATABASE_TYPE', 'SQLITE_PATH']) {
    let v = process.env[k];
    const isSecret = ['DISCORD_TOKEN', 'HDEV_TOKEN'].includes(k);
    let source = 'env';

    if (!v && configJson) {
        if (k === 'DISCORD_TOKEN' && configJson.token && configJson.token !== 'token goes here') {
            v = configJson.token;
            source = 'config.json';
        } else if (k === 'PUBLIC_URL' && configJson.publicUrl) {
            v = configJson.publicUrl;
            source = 'config.json';
        } else if (k === 'DEFAULT_REGION' && configJson.region) {
            v = configJson.region;
            source = 'config.json';
        } else if (k === 'DATABASE_TYPE' && configJson.databaseType) {
            v = configJson.databaseType;
            source = 'config.json';
        } else if (k === 'SQLITE_PATH' && configJson.sqlitePath) {
            v = configJson.sqlitePath;
            source = 'config.json';
        }
    }

    let display = 'MISSING';
    if (v) {
        const valStr = isSecret ? `${v.slice(0, 4)}...${v.slice(-4)}` : `${v}`;
        display = `SET via ${source} (${valStr})`;
    } else if (k === 'PUBLIC_URL') {
        display = 'NOT SET (will fallback to auto-detect or localhost:3000)';
    }

    const critical = k === 'DISCORD_TOKEN';
    if (critical && !v) {
        allOk = false;
        log(`[FAIL] ${k.padEnd(24)} : MISSING (Required in .env or config.json)`);
    } else {
        log(`[INFO] ${k.padEnd(24)} : ${display}`);
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
    'unofficial-valorant-api',
    'better-sqlite3'
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

// Test better-sqlite3 initialization and schema
try {
    const { getDatabase } = await import('./services/database.js');
    const testDbPath = path.join(dataDir, '.test_diag.sqlite');
    const db = getDatabase(testDbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    if (tables.includes('users') && tables.includes('shop_cache')) {
        log(`[PASS] SQLite engine & schema verification     : OK (users, shop_cache tables verified)`);
    } else {
        allOk = false;
        log(`[FAIL] SQLite engine & schema verification     : Missing tables (${tables.join(', ')})`);
    }
    db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
} catch (err) {
    allOk = false;
    log(`[FAIL] SQLite engine & schema verification     : ${err.message}`);
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
