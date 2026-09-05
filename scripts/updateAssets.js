import "dotenv/config";
import fs from "node:fs";
import { loadConfig } from "../misc/config.js";
import { fetchData, getValorantVersion } from "../valorant/cache.js";

async function main() {
    console.log("==================================================");
    console.log(" 🚀 Updating VALORANT Assets from valorant-api.com");
    console.log("==================================================");

    // 1. Ensure config and directories
    loadConfig();
    if (!fs.existsSync("assets")) fs.mkdirSync("assets", { recursive: true });
    if (!fs.existsSync("data")) fs.mkdirSync("data", { recursive: true });

    // 2. Query Version
    const versionData = await getValorantVersion();
    console.log(`\n📌 Game Version: ${versionData.version} (${versionData.branch})`);
    console.log(`📌 Manifest ID: ${versionData.manifestId}`);
    console.log(`📌 Riot Client: ${versionData.riotClientVersion}\n`);

    // 3. Update Currency Icons
    console.log("📦 Downloading latest currency icons...");
    const currencies = [
        { name: "VP", url: "https://media.valorant-api.com/currencies/85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741/largeicon.png", dest: "assets/vp.png" },
        { name: "Radianite", url: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png", dest: "assets/rad.png" },
        { name: "Kingdom Credits", url: "https://media.valorant-api.com/currencies/85ca954a-41f2-ce94-9b45-8ca3dd39a00d/displayicon.png", dest: "assets/kc.png" }
    ];

    for (const c of currencies) {
        try {
            const res = await fetch(c.url);
            if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer());
                fs.writeFileSync(c.dest, buf);
                console.log(`   ✓ ${c.name} (${buf.length} bytes) -> ${c.dest}`);
            } else {
                console.warn(`   ⚠️ Failed to download ${c.name}: HTTP ${res.status}`);
            }
        } catch (e) {
            console.warn(`   ⚠️ Error downloading ${c.name}:`, e.message);
        }
    }

    // 4. Fetch all catalog assets from valorant-api.com
    console.log("\n📦 Fetching catalogue data (weapons, skins, bundles, etc.)...");
    await fetchData(null, true);

    // 5. Read back summary from data/skins.json
    try {
        const skinsFile = "data/skins.json";
        if (fs.existsSync(skinsFile)) {
            const raw = JSON.parse(fs.readFileSync(skinsFile, "utf-8"));
            console.log("\n==================================================");
            console.log(" ✨ Assets Update Summary");
            console.log("==================================================");
            console.log(` - Weapons:       ${Object.keys(raw.weapons || {}).length}`);
            console.log(` - Weapon Skins:  ${Object.keys(raw.skins || {}).filter(k => k !== "version").length}`);
            console.log(` - Bundles:       ${Object.keys(raw.bundles || {}).filter(k => k !== "version").length}`);
            console.log(` - Content Tiers: ${Object.keys(raw.rarities || {}).filter(k => k !== "version").length}`);
            console.log(` - Gun Buddies:   ${Object.keys(raw.buddies || {}).filter(k => k !== "version").length}`);
            console.log(` - Player Cards:  ${Object.keys(raw.cards || {}).filter(k => k !== "version").length}`);
            console.log(` - Sprays:        ${Object.keys(raw.sprays || {}).filter(k => k !== "version").length}`);
            console.log(` - Player Titles: ${Object.keys(raw.titles || {}).filter(k => k !== "version").length}`);
            if (raw.battlepass) {
                console.log(` - Battlepass:    Active until ${raw.battlepass.end || "N/A"} (${raw.battlepass.chapters?.length || 0} chapters)`);
            }
            console.log(` - Output File:   ${skinsFile} (${(fs.statSync(skinsFile).size / (1024 * 1024)).toFixed(2)} MB)`);
            console.log("==================================================");
            console.log(" ✅ All VALORANT assets are successfully updated!\n");
        }
    } catch (e) {
        console.error("Error generating summary:", e);
    }
}

main().catch(err => {
    console.error("Failed to update assets:", err);
    process.exit(1);
});
