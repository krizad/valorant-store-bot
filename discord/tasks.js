// Cron jobs & recurring task scheduling
import cron from "node-cron";
import config from "../misc/config.js";
import { fetchRiotVersionData } from "../misc/util.js";
import { sendConsoleOutput } from "../misc/logger.js";
import { fetchData } from "../valorant/cache.js";
import { startAuthQueue } from "../valorant/authQueue.js";
import { checkAlerts } from "./alerts.js";

const cronTasks = [];

export const scheduleTasks = () => {
    console.log("Scheduling tasks...");

    // check alerts every day at 00:00:10 GMT
    if (config.refreshSkins) cronTasks.push(cron.schedule(config.refreshSkins, checkAlerts, { timezone: "GMT" }));

    // check for new valorant version every 15mins
    if (config.checkGameVersion) cronTasks.push(cron.schedule(config.checkGameVersion, () => fetchData(null, true)));

    // if login queue is enabled, process an item every 3 seconds
    if (config.useLoginQueue && config.loginQueueInterval) startAuthQueue();

    // if send console to discord channel is enabled, send console output every 10 seconds
    if (config.logToChannel && config.logFrequency) cronTasks.push(cron.schedule(config.logFrequency, sendConsoleOutput));

    // check for a new riot client version (new user agent) every 15mins
    if (config.updateUserAgent) cronTasks.push(cron.schedule(config.updateUserAgent, fetchRiotVersionData));
}

export const destroyTasks = () => {
    console.log("Destroying scheduled tasks...");
    for (const task of cronTasks)
        task.stop();
    cronTasks.length = 0;
}
