import "dotenv/config";
import {loadConfig} from "./misc/config.js";
import {startBot, client} from "./discord/bot.js";
import {loadLogger} from "./misc/logger.js";
import {transferUserDataFromOldUsersJson} from "./valorant/auth.js";
import {startKeepAliveServer} from "./misc/keepAliveServer.js";

/* Valorant Daily Store Discord Bot
 * Enhanced with HTTP Keep-Alive & Web Authentication Portal
 */

// 1. Start HTTP Keep-Alive server immediately for health monitoring / uptime pings
const HTTP_PORT = process.env.PORT || 3000;
startKeepAliveServer(HTTP_PORT, () => ({
    isReady: client?.isReady?.() || false,
    ping: client?.ws?.ping ?? -1,
    tag: client?.user?.tag || null
}));

// 2. Load configuration & start Discord client
const config = loadConfig();
if(config) {
    loadLogger();
    transferUserDataFromOldUsersJson();
    startBot();
}

// 3. Connection Resiliency & Gateway Auto-Reconnect
if (client) {
    client.on("shardDisconnect", (event, id) => {
        console.warn(`[Discord Gateway] Shard ${id} disconnected (Code: ${event.code}). Auto-reconnecting...`);
    });

    client.on("shardReconnecting", (id) => {
        console.log(`[Discord Gateway] Shard ${id} reconnecting...`);
    });

    client.on("shardError", (error, id) => {
        console.error(`[Discord Gateway] Shard ${id} error:`, error.message);
    });
}

// 4. Global safety net against unhandled process crashes on shared hosting
process.on("unhandledRejection", (reason) => {
    console.error("[Process] Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("[Process] Uncaught Exception:", err);
});
