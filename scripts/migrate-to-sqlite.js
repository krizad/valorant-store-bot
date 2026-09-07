#!/usr/bin/env node

/**
 * Migration Script: Flat JSON files -> SQLite Database
 * Usage:
 *   node scripts/migrate-to-sqlite.js [--dry-run] [--db=data/database.sqlite]
 *   npm run migrate:sqlite
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDatabase } from "../services/database.js";
import { loadConfig } from "../misc/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const dbArg = args.find(a => a.startsWith("--db="));

const config = loadConfig() || {};
const dbPath = dbArg ? path.resolve(ROOT_DIR, dbArg.split("=")[1]) : path.resolve(ROOT_DIR, config.sqlitePath || "data/database.sqlite");
const usersDir = path.resolve(ROOT_DIR, "data/users");
const shopCacheDir = path.resolve(ROOT_DIR, "data/shopCache");

console.log("================================================================");
console.log(" 🔄  Valorant Store Bot: JSON to SQLite Migration Tool");
console.log("================================================================");
console.log(`📁 Source Users      : ${usersDir}`);
console.log(`📁 Source Shop Cache : ${shopCacheDir}`);
console.log(`💾 Target SQLite DB  : ${dbPath}`);
console.log(`⚙️  Mode              : ${isDryRun ? "DRY RUN (No data written)" : "LIVE MIGRATION"}`);
console.log("----------------------------------------------------------------");

// 1. Scan User Files
let userFiles = [];
if (fs.existsSync(usersDir)) {
    userFiles = fs.readdirSync(usersDir).filter(f => /^\d+\.json$/.test(f));
}
console.log(`Found ${userFiles.length} user file(s) in data/users/`);

// 2. Scan Shop Cache Files
let cacheFiles = [];
if (fs.existsSync(shopCacheDir)) {
    cacheFiles = fs.readdirSync(shopCacheDir).filter(f => f.endsWith(".json"));
}
console.log(`Found ${cacheFiles.length} shop cache file(s) in data/shopCache/`);

if (userFiles.length === 0 && cacheFiles.length === 0) {
    console.log("\n⚠️  No user or cache data found to migrate.");
    process.exit(0);
}

if (isDryRun) {
    console.log("\n[DRY RUN] Simulation complete. No database changes were applied.");
    console.log(`[DRY RUN] Would migrate: ${userFiles.length} user(s), ${cacheFiles.length} shop cache item(s).`);
    process.exit(0);
}

// 3. Perform Live Migration
console.log("\n🚀 Starting migration...");
const db = getDatabase(dbPath);

// Migrate Users
const insertUser = db.prepare(`
    INSERT INTO users (id, data, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
`);

let usersMigrated = 0;
let usersFailed = 0;
const now = Date.now();

const migrateUsersTx = db.transaction((files) => {
    for (const file of files) {
        const id = file.replace(".json", "");
        try {
            const filePath = path.join(usersDir, file);
            const content = fs.readFileSync(filePath, "utf-8");
            JSON.parse(content); // Ensure valid JSON
            insertUser.run(id, content, now, now);
            usersMigrated++;
        } catch (err) {
            console.error(`  ❌ Failed to migrate user ${file}: ${err.message}`);
            usersFailed++;
        }
    }
});

migrateUsersTx(userFiles);
console.log(`✅ Users: ${usersMigrated} migrated successfully (${usersFailed} failed).`);

// Migrate Shop Cache
const insertCache = db.prepare(`
    INSERT INTO shop_cache (puuid, data, expires_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(puuid) DO UPDATE SET
        data = excluded.data,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
`);

let cacheMigrated = 0;
let cacheSkipped = 0;
let cacheFailed = 0;

const migrateCacheTx = db.transaction((files) => {
    for (const file of files) {
        const puuid = file.replace(".json", "");
        try {
            const filePath = path.join(shopCacheDir, file);
            const content = fs.readFileSync(filePath, "utf-8");
            const parsed = JSON.parse(content);
            const expires = parsed.offers?.expires || Math.floor(now / 1000) + 86400;

            if (Date.now() / 1000 > expires) {
                cacheSkipped++; // Expired
                continue;
            }

            insertCache.run(puuid, content, expires, now);
            cacheMigrated++;
        } catch (err) {
            console.error(`  ❌ Failed to migrate shop cache ${file}: ${err.message}`);
            cacheFailed++;
        }
    }
});

migrateCacheTx(cacheFiles);
console.log(`✅ Shop Cache: ${cacheMigrated} active offers migrated (${cacheSkipped} expired skipped, ${cacheFailed} failed).`);

console.log("----------------------------------------------------------------");
console.log("🎉 Migration completed successfully!");
console.log(`To use SQLite, ensure your .env or config.json has:`);
console.log(`  DATABASE_TYPE=sqlite`);
console.log(`  SQLITE_PATH=${path.relative(ROOT_DIR, dbPath)}`);
console.log("================================================================");
