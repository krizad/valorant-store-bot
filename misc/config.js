import fs from "fs";

export let config = {};
export default config;

export const loadConfig = (filename="config.json") => {
    let loadedConfig = {};

    try {
        const raw = fs.readFileSync(filename, 'utf-8');
        loadedConfig = JSON.parse(raw);
    } catch(e) {
        if (process.env.DISCORD_TOKEN) {
            loadedConfig = { token: process.env.DISCORD_TOKEN };
        } else {
            try {
                fs.readFileSync(filename + ".example", 'utf-8');
                console.error(`You forgot to rename ${filename}.example to ${filename}! (or set DISCORD_TOKEN in .env)`);
            } catch(e1) {
                console.error(`Could not find ${filename}!`, e);
            }
            return;
        }
    }

    if (process.env.DISCORD_TOKEN && (!loadedConfig.token || loadedConfig.token === "token goes here" || loadedConfig.token === "dummy_token")) {
        loadedConfig.token = process.env.DISCORD_TOKEN;
    }

    if (process.env.HDEV_TOKEN && (!loadedConfig.HDevToken || loadedConfig.HDevToken === "")) {
        loadedConfig.HDevToken = process.env.HDEV_TOKEN;
    }

    if (process.env.PUBLIC_URL && (!loadedConfig.publicUrl || loadedConfig.publicUrl === "")) {
        loadedConfig.publicUrl = process.env.PUBLIC_URL;
    }

    if (process.env.LOG_TO_FILE !== undefined) {
        loadedConfig.logToFile = process.env.LOG_TO_FILE !== "false";
    }

    if (process.env.LOG_DIR && (!loadedConfig.logDir || loadedConfig.logDir === "")) {
        loadedConfig.logDir = process.env.LOG_DIR;
    }

    if(!loadedConfig.token || loadedConfig.token === "token goes here" || loadedConfig.token === "dummy_token")
        return console.error("You forgot to put your bot token in config.json or DISCORD_TOKEN in .env!");

    if(loadedConfig.HDevTokenAlert && (!loadedConfig.HDevToken || loadedConfig.HDevToken === "")){
        console.error("Looks like you didn't put a HDevToken in config.json or HDEV_TOKEN in .env!");
        console.error("The /profile command won't work without one. To get a key, see https://discord.gg/B7AarTMZMK");
        console.error("If you don't want to see this notification again, set HDevTokenAlert to false in config.json");
    }

    // backwards compatibility
    loadedConfig.fetchSkinPrices = loadedConfig.showSkinPrices;
    loadedConfig.fetchSkinRarities = loadedConfig.showSkinRarities;

    // to see what these keys do, check here:
    // https://github.com/giorgi-o/SkinPeek/wiki/SkinPeek-Admin-Guide#the-option-list

    applyConfig(loadedConfig, "token", "token goes here");
    applyConfig(loadedConfig, "HDevToken", "");
    applyConfig(loadedConfig, "HDevTokenAlert", true);
    applyConfig(loadedConfig, "fetchSkinPrices", true);
    applyConfig(loadedConfig, "fetchSkinRarities", true);
    applyConfig(loadedConfig, "useStoreBanner", false);
    applyConfig(loadedConfig, "localiseText", true);
    applyConfig(loadedConfig, "localiseSkinNames", true);
    applyConfig(loadedConfig, "linkItemImage", true);
    applyConfig(loadedConfig, "videoViewerWithSite", false);
    applyConfig(loadedConfig, "imageViewerWithSite", false);
    applyConfig(loadedConfig, "useEmojisFromServer", "");
    applyConfig(loadedConfig, "refreshSkins", "10 0 0 * * *");
    applyConfig(loadedConfig, "checkGameVersion", "*/15 * * * *");
    applyConfig(loadedConfig, "updateUserAgent", "*/15 * * * *");
    applyConfig(loadedConfig, "delayBetweenAlerts", 5 * 1000);
    applyConfig(loadedConfig, "alertsPerPage", 10);
    applyConfig(loadedConfig, "careerCacheExpiration", 10 * 60 * 1000);
    applyConfig(loadedConfig, "emojiCacheExpiration", 10 * 1000);
    applyConfig(loadedConfig, "loadoutCacheExpiration", 10 * 60 * 1000);
    applyConfig(loadedConfig, "useShopCache", true);
    applyConfig(loadedConfig, "useLoginQueue", false);
    applyConfig(loadedConfig, "loginQueueInterval", 3000);
    applyConfig(loadedConfig, "loginQueuePollRate", 2000);
    applyConfig(loadedConfig, "loginRetryTimeout", 10 * 60 * 1000);
    applyConfig(loadedConfig, "authFailureStrikes", 2);
    applyConfig(loadedConfig, "maxAccountsPerUser", 5);
    applyConfig(loadedConfig, "userDataCacheExpiration", 168);
    applyConfig(loadedConfig, "rateLimitBackoff", 60);
    applyConfig(loadedConfig, "rateLimitCap", 10 * 60);
    applyConfig(loadedConfig, "useMultiqueue", false);
    applyConfig(loadedConfig, "storePasswords", false);
    applyConfig(loadedConfig, "trackStoreStats", true);
    applyConfig(loadedConfig, "statsExpirationDays", 14);
    applyConfig(loadedConfig, "statsPerPage", 8);
    applyConfig(loadedConfig, "shardReadyTimeout", 60 * 1000);
    applyConfig(loadedConfig, "autoDeployCommands", true);
    applyConfig(loadedConfig, "ownerId", "");
    applyConfig(loadedConfig, "ownerName", "");
    applyConfig(loadedConfig, "status", "Up and running!");
    applyConfig(loadedConfig, "notice", "");
    applyConfig(loadedConfig, "onlyShowNoticeOnce", true);
    applyConfig(loadedConfig, "maintenanceMode", false);
    applyConfig(loadedConfig, "githubToken", "");
    applyConfig(loadedConfig, "logToChannel", "");
    applyConfig(loadedConfig, "logFrequency", "*/10 * * * * *");
    applyConfig(loadedConfig, "logUrls", false);
    applyConfig(loadedConfig, "logToFile", true);
    applyConfig(loadedConfig, "logDir", "data/logs");
    applyConfig(loadedConfig, "publicUrl", process.env.PUBLIC_URL || "");

    saveConfig(filename, config);

    return config;
}

export const saveConfig = (filename="config.json", configToSave) => {
    fs.writeFileSync(filename, JSON.stringify(configToSave || config, null, 2));
}

const applyConfig = (loadedConfig, name, defaultValue) => {
    if(loadedConfig[name] === undefined) config[name] = defaultValue;
    else config[name] = loadedConfig[name];
}

/**
 * Resolves, cleans, and validates the public URL for the Web Authentication Portal.
 * Guaranteed to return a valid URL string starting with http:// or https://.
 * @param {import("express").Request|null} req - Optional Express request for auto-detecting host
 * @returns {string} Fully qualified valid URL
 */
export function resolvePublicUrl(req = null) {
    let raw = (process.env.PUBLIC_URL || config.publicUrl || "").trim();
    if (raw) {
        if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
            raw = `https://${raw}`;
        }
        raw = raw.replace(/\/+$/, "");
        try {
            const parsed = new URL(raw);
            return parsed.origin + (parsed.pathname !== "/" ? parsed.pathname : "");
        } catch (e) {
            console.warn(`[Config] Invalid PUBLIC_URL provided: "${raw}". Falling back.`);
        }
    }

    if (req && typeof req.get === "function") {
        const host = req.get("host");
        if (host) {
            const proto = req.get("x-forwarded-proto") || req.protocol || "http";
            return `${proto}://${host}`;
        }
    }

    const portNum = Number.parseInt(process.env.PORT, 10);
    if (!Number.isNaN(portNum) && portNum > 0 && portNum < 65536) {
        return `http://localhost:${portNum}`;
    }
    return "http://localhost:3000";
}
