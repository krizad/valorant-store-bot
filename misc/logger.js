import config from "./config.js";
import { escapeMarkdown } from "discord.js";
import { client } from "../discord/bot.js";
import { sendShardMessage } from "./shardMessage.js";
import fs from "node:fs";
import path from "node:path";

const messagesToLog = [];

const oldLog = console.log;
const oldWarn = console.warn;
const oldError = console.error;

const shardString = () => (client?.shard ? `[Shard ${client.shard.ids[0]}] ` : "");
export const localLog = (...args) => oldLog(shardString(), ...args);
export const localWarn = (...args) => oldWarn(shardString(), ...args);
export const localError = (...args) => oldError(shardString(), ...args);

const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getLocalTimestamp = (d = new Date()) => {
    const date = getLocalDateString(d);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${date} ${hours}:${minutes}:${seconds}`;
};

const formatArg = (arg) => {
    if (arg instanceof Error) {
        return arg.stack || `${arg.name}: ${arg.message}`;
    }
    if (typeof arg === "object" && arg !== null) {
        try {
            return JSON.stringify(arg, null, 2);
        } catch {
            return String(arg);
        }
    }
    return String(arg);
};

const sanitizeLog = (str) => {
    return str
        .replace(/(Bearer\s+)[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, "$1[REDACTED_JWT]")
        .replace(/(ssid=)[^;\s]+/gi, "$1[REDACTED_SSID]")
        .replace(/("?(?:password|token|HDevToken|DISCORD_TOKEN)"?\s*[:=]\s*)"[^"]+"/gi, '$1"[REDACTED]"');
};

const MAX_COMBINED_LOG_SIZE = 20 * 1024 * 1024; // 20 MB

const writeToFile = (level, ...args) => {
    if (config.logToFile === false) return;

    try {
        const logDir = config.logDir || "data/logs";
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const dateStr = getLocalDateString();
        const dailyFilePath = path.join(logDir, `bot-${dateStr}.log`);
        const combinedFilePath = path.join(logDir, "bot.log");

        const prefix = `[${getLocalTimestamp()}] [${level.padEnd(5)}] ${shardString()}`;
        const content = sanitizeLog(`${prefix}${args.map(formatArg).join(" ")}\n`);

        // Rotate bot.log if it exceeds maximum size
        if (fs.existsSync(combinedFilePath)) {
            try {
                if (fs.statSync(combinedFilePath).size > MAX_COMBINED_LOG_SIZE) {
                    const oldPath = path.join(logDir, "bot.log.old");
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                    fs.renameSync(combinedFilePath, oldPath);
                }
            } catch {
                // Ignore stat/rotation error and continue writing
            }
        }

        fs.appendFile(dailyFilePath, content, "utf-8", (err) => {
            if (err) oldError("Failed writing to daily log file:", err.message);
        });

        fs.appendFile(combinedFilePath, content, "utf-8", (err) => {
            if (err) oldError("Failed writing to combined log file:", err.message);
        });
    } catch (e) {
        oldError("Error in logger writeToFile:", e.message);
    }
};

export const loadLogger = () => {
    const logDir = config.logDir || "data/logs";
    if (config.logToFile !== false && !fs.existsSync(logDir)) {
        try {
            fs.mkdirSync(logDir, { recursive: true });
        } catch {}
    }

    console.log = (...args) => {
        oldLog(shardString(), ...args);
        writeToFile("INFO", ...args);
        if (config.logToChannel) messagesToLog.push(shardString() + escapeMarkdown(args.map(formatArg).join(" ")));
    };

    console.warn = (...args) => {
        oldWarn(shardString(), ...args);
        writeToFile("WARN", ...args);
        if (config.logToChannel) messagesToLog.push("⚠️ " + shardString() + escapeMarkdown(args.map(formatArg).join(" ")));
    };

    console.error = (...args) => {
        oldError(shardString(), ...args);
        writeToFile("ERROR", ...args);
        if (config.logToChannel) {
            messagesToLog.push(
                "> " +
                    shardString() +
                    escapeMarkdown(
                        args
                            .map((e) => (e instanceof Error ? e.stack : formatArg(e)).split("\n").join("\n> " + shardString()))
                            .join(" ")
                    )
            );
        }
    };

    writeToFile("INFO", `Logger loaded. File logging active at: ${path.resolve(logDir)}`);
};

export const addMessagesToLog = (messages) => {
    if (!messages.length) return;

    const channel = client.channels.cache.get(config.logToChannel);
    if (!channel) return;

    messagesToLog.push(...messages);
};

export const sendConsoleOutput = () => {
    try {
        if (!client || client.destroyed || !messagesToLog.length) return;

        const channel = client.channels.cache.get(config.logToChannel);

        if (!channel && client.shard) {
            if (messagesToLog.length > 0) {
                sendShardMessage({
                    type: "logMessages",
                    messages: [...messagesToLog]
                });
            }
        } else if (channel) {
            while (messagesToLog.length) {
                let s = "";
                while (messagesToLog.length && s.length + messagesToLog[0].length < 2000) {
                    s += messagesToLog.shift() + "\n";
                }

                channel.send(s);
            }
        }

        messagesToLog.length = 0;
    } catch (e) {
        localError("Error when trying to send the console output to the channel!");
        localError(e);
    }
};
