import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import config from "../misc/config.js";

let dbInstance = null;

/**
 * Checks if the SQLite database engine is enabled in configuration.
 * @returns {boolean}
 */
export function isSqliteEnabled() {
    return (config.databaseType || "").toLowerCase() === "sqlite";
}

/**
 * Returns the singleton Database instance, initializing connection and schema if needed.
 * @param {string} [customPath] - Optional override path for testing/migrations
 * @returns {Database.Database}
 */
export function getDatabase(customPath = null) {
    if (dbInstance && !customPath) return dbInstance;

    const dbPath = customPath || config.sqlitePath || "data/database.sqlite";
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");

    initSchema(db);

    if (!customPath) {
        dbInstance = db;
    }

    return db;
}

/**
 * Creates required tables and indexes if they do not exist.
 * @param {Database.Database} db
 */
function initSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            created_at INTEGER,
            updated_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS shop_cache (
            puuid TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            updated_at INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_shop_cache_expires ON shop_cache (expires_at);
    `);
}

// ---------------------------------------------------------------------------
// User Operations
// ---------------------------------------------------------------------------

/**
 * Reads a user JSON structure by Discord ID.
 * @param {string} id - Discord user ID
 * @returns {object|null} Parsed user object or null if not found
 */
export function dbReadUser(id) {
    const db = getDatabase();
    const row = db.prepare("SELECT data FROM users WHERE id = ?").get(String(id));
    if (!row) return null;
    try {
        return JSON.parse(row.data);
    } catch (e) {
        console.error(`[SQLite] Failed to parse JSON for user ${id}:`, e);
        return null;
    }
}

/**
 * Upserts a user JSON structure by Discord ID.
 * @param {string} id - Discord user ID
 * @param {object} json - User data object
 */
export function dbSaveUser(id, json) {
    const db = getDatabase();
    const now = Date.now();
    const stmt = db.prepare(`
        INSERT INTO users (id, data, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            data = excluded.data,
            updated_at = excluded.updated_at
    `);
    stmt.run(String(id), JSON.stringify(json, null, 2), now, now);
}

/**
 * Deletes a user record by Discord ID.
 * @param {string} id - Discord user ID
 */
export function dbDeleteUser(id) {
    const db = getDatabase();
    db.prepare("DELETE FROM users WHERE id = ?").run(String(id));
}

/**
 * Retrieves all registered Discord user IDs.
 * @returns {string[]} Array of Discord user IDs
 */
export function dbListUserIds() {
    const db = getDatabase();
    const rows = db.prepare("SELECT id FROM users").all();
    return rows.map(r => r.id);
}

/**
 * Returns the total count of registered users in SQLite.
 * @returns {number}
 */
export function dbGetUserCount() {
    const db = getDatabase();
    const row = db.prepare("SELECT COUNT(*) as count FROM users").get();
    return row ? row.count : 0;
}

// ---------------------------------------------------------------------------
// Shop Cache Operations
// ---------------------------------------------------------------------------

/**
 * Retrieves cached shop data for a Valorant PUUID.
 * Automatically purges expired cache entries.
 * @param {string} puuid - Valorant account PUUID
 * @returns {object|null} Shop cache object or null if not found / expired
 */
export function dbGetShopCache(puuid) {
    const db = getDatabase();
    const row = db.prepare("SELECT data, expires_at FROM shop_cache WHERE puuid = ?").get(String(puuid));
    if (!row) return null;

    if (Date.now() / 1000 > row.expires_at) {
        db.prepare("DELETE FROM shop_cache WHERE puuid = ?").run(String(puuid));
        return null;
    }

    try {
        return JSON.parse(row.data);
    } catch (e) {
        console.error(`[SQLite] Failed to parse shop cache JSON for PUUID ${puuid}:`, e);
        return null;
    }
}

/**
 * Saves or updates shop cache for a Valorant PUUID.
 * @param {string} puuid - Valorant account PUUID
 * @param {object} shopCache - Cached shop payload
 * @param {number} expiresAt - Expiration UNIX timestamp in seconds
 */
export function dbSaveShopCache(puuid, shopCache, expiresAt) {
    const db = getDatabase();
    const now = Date.now();
    const stmt = db.prepare(`
        INSERT INTO shop_cache (puuid, data, expires_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(puuid) DO UPDATE SET
            data = excluded.data,
            expires_at = excluded.expires_at,
            updated_at = excluded.updated_at
    `);
    stmt.run(String(puuid), JSON.stringify(shopCache, null, 2), Math.floor(expiresAt), now);
}

/**
 * Deletes shop cache for a specific PUUID.
 * @param {string} puuid - Valorant account PUUID
 */
export function dbDeleteShopCache(puuid) {
    const db = getDatabase();
    db.prepare("DELETE FROM shop_cache WHERE puuid = ?").run(String(puuid));
}

/**
 * Deletes all shop cache records from SQLite.
 */
export function dbClearAllShopCache() {
    const db = getDatabase();
    db.prepare("DELETE FROM shop_cache").run();
}

// ---------------------------------------------------------------------------
// Auto-Migration on First Run
// ---------------------------------------------------------------------------

/**
 * Automatically migrates existing data/users/*.json and data/shopCache/*.json into SQLite
 * if SQLite is enabled and the SQLite database is currently empty.
 */
export function autoMigrateIfEmpty() {
    if (!isSqliteEnabled()) return;

    try {
        const userCount = dbGetUserCount();
        if (userCount > 0) return; // Database already contains data

        const usersDir = "data/users";
        if (!fs.existsSync(usersDir)) return;

        const files = fs.readdirSync(usersDir).filter(f => /^\d+\.json$/.test(f));
        if (files.length === 0) return;

        console.log(`[Database] SQLite users table is empty. Auto-migrating ${files.length} user(s) from ${usersDir}...`);
        const db = getDatabase();
        const insertUser = db.prepare(`
            INSERT INTO users (id, data, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
        `);

        const migrateUsers = db.transaction((userFiles) => {
            let migrated = 0;
            const now = Date.now();
            for (const file of userFiles) {
                const id = file.replace(".json", "");
                try {
                    const content = fs.readFileSync(path.join(usersDir, file), "utf-8");
                    JSON.parse(content); // Validate JSON format
                    insertUser.run(id, content, now, now);
                    migrated++;
                } catch (err) {
                    console.error(`[Database] Failed to migrate user file ${file}:`, err.message);
                }
            }
            return migrated;
        });

        const totalMigrated = migrateUsers(files);
        console.log(`[Database] Successfully auto-migrated ${totalMigrated}/${files.length} user(s) into SQLite!`);

        // Migrate shopCache as well if exists
        const shopCacheDir = "data/shopCache";
        if (fs.existsSync(shopCacheDir)) {
            const cacheFiles = fs.readdirSync(shopCacheDir).filter(f => f.endsWith(".json"));
            if (cacheFiles.length > 0) {
                const insertCache = db.prepare(`
                    INSERT INTO shop_cache (puuid, data, expires_at, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(puuid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at, updated_at = excluded.updated_at
                `);

                const migrateCache = db.transaction((cFiles) => {
                    let cMigrated = 0;
                    const now = Date.now();
                    for (const cFile of cFiles) {
                        const puuid = cFile.replace(".json", "");
                        try {
                            const raw = fs.readFileSync(path.join(shopCacheDir, cFile), "utf-8");
                            const parsed = JSON.parse(raw);
                            const expires = parsed.offers?.expires || Math.floor(now / 1000) + 86400;
                            if (Date.now() / 1000 <= expires) {
                                insertCache.run(puuid, raw, expires, now);
                                cMigrated++;
                            }
                        } catch (_) {}
                    }
                    return cMigrated;
                });

                const totalCacheMigrated = migrateCache(cacheFiles);
                console.log(`[Database] Auto-migrated ${totalCacheMigrated} active shop cache entries into SQLite.`);
            }
        }
    } catch (e) {
        console.error("[Database] Auto-migration error:", e);
    }
}
