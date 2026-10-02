// Admin prefix commands (e.g. "@Bot !deploy guild") — gated by config.ownerId
import { AttachmentBuilder } from "discord.js";
import { spawn } from "child_process";
import * as fs from "fs";
import path from "node:path";
import config, { loadConfig, saveConfig } from "../misc/config.js";
import { fetchChannel } from "../misc/util.js";
import { localError, localLog } from "../misc/logger.js";
import { sendShardMessage } from "../misc/shardMessage.js";
import { isSqliteEnabled, dbClearAllShopCache } from "../services/database.js";
import { clearCache, fetchData } from "../valorant/cache.js";
import { checkAlerts, alertsPerChannelPerGuild } from "./alerts.js";
import { ownerMessageEmbed } from "./embed.js";
import { commands } from "./commands.js";
import { destroyTasks, scheduleTasks } from "./tasks.js";
import { client } from "./bot.js";

export const handleAdminMessage = async (message) => {
    try {
        let isAdmin = false;
        if (!config.ownerId) isAdmin = true;
        else for (const id of config.ownerId.split(/, ?/)) {
            if (message.author.id === id || message.guildId === id) {
                isAdmin = true;
                break;
            }

            if (message.member && message.member.roles.resolve(id)) {
                isAdmin = true;
                break;
            }
        }
        if (!isAdmin) return;

        const content = message.content.replace(new RegExp(`<@!?${client.user.id}> ?`), ""); // remove @bot mention
        if (!content.startsWith('!')) return;
        // redact secret values from admin command logs (they get sent to log files/channels)
        console.log(`${message.author.tag} sent admin command ${content.replace(/^(!config\s+(?:token|githubToken|HDevToken|DISCORD_TOKEN)\s+).+$/i, "$1[REDACTED]")}`);

        if (content === "!deploy guild") {
            if (!message.guild) return;

            console.log("Deploying commands in guild...");

            await message.guild.commands.set(commands).then(() => console.log(`Commands deployed in guild ${message.guild.name}!`));

            await message.reply("Deployed in guild!");
        } else if (content === "!deploy global") {
            console.log("Deploying commands...");

            await client.application.commands.set(commands).then(() => console.log("Commands deployed globally!"));

            await message.reply("Deployed globally!");
        } else if (content.startsWith("!undeploy")) {
            console.log("Undeploying commands...");

            if (content === "!undeploy guild") {
                if (!message.guild) return;
                await message.guild.commands.set([]).then(() => console.log(`Commands undeployed in guild ${message.guild.name}!`));
                await message.reply("Undeployed in guild!");
            }
            else if (content === "!undeploy global" || !message.guild) {
                await client.application.commands.set([]).then(() => console.log("Commands undeployed globally!"));
                await message.reply("Undeployed globally!");
            }
            else {
                await client.application.commands.set([]).then(() => console.log("Commands undeployed globally!"));

                const guild = client.guilds.cache.get(message.guild.id);
                await guild.commands.set([]).then(() => console.log(`Commands undeployed in guild ${message.guild.name}!`));

                await message.reply("Undeployed in guild and globally!");
            }
        } else if (content.startsWith("!config")) {
            const splits = content.split(' ');
            if (splits[1] === "reload") {
                const oldToken = config.token;

                destroyTasks();
                saveConfig();
                scheduleTasks();

                if (client.shard) sendShardMessage({ type: "configReload" });

                let s = "Successfully reloaded the config!";
                if (config.token !== oldToken)
                    s += "\nI noticed you changed the token. You'll have to restart the bot for that to happen."
                await message.reply(s);
            } else if (splits[1] === "load") {
                const oldToken = config.token;

                loadConfig();
                destroyTasks();
                scheduleTasks();

                if (client.shard) sendShardMessage({ type: "configReload" });

                let s = "Successfully reloaded the config from disk!";
                if (config.token !== oldToken)
                    s += "\nI noticed you changed the token. You'll have to restart the bot for that to happen."
                await message.reply(s);
            } else if (splits[1] === "read") {
                const s = "Here is the config.json the bot currently has loaded:```json\n" + JSON.stringify({
                    ...config,
                    token: "[redacted]",
                    "githubToken": config.githubToken ? "[redacted]" : config.githubToken,
                    "HDevToken": config.HDevToken ? "[redacted]" : config.HDevToken
                }, null, 2) + "```";
                await message.reply(s);
            } else if (splits[1] === "clearcache") {
                await message.channel.send("Deleting all files in data/shopCache...");
                if (isSqliteEnabled()) {
                    dbClearAllShopCache();
                }
                if (fs.existsSync("data/shopCache")) {
                    fs.rmSync("data/shopCache", { force: true, recursive: true });
                    fs.mkdirSync("data/shopCache");
                }

                // delete skins.json and reset skin cache
                await message.channel.send("Deleting skins.json and resetting skin cache...");
                fs.rmSync("data/skins.json", { force: true });
                clearCache();
                await fetchData();

                await message.reply("Successfully cleared shop and skin cache!");
            } else {
                const target = splits[1];
                const value = splits.slice(2).join(' ');

                const configType = typeof config[target];
                switch (configType) {
                    case 'string':
                    case 'undefined':
                        config[target] = value;
                        break;
                    case 'number':
                        config[target] = parseFloat(value);
                        break;
                    case 'boolean':
                        config[target] = value.toLowerCase().startsWith('t');
                        break;
                    default:
                        return await message.reply("[Error] I don't know what type the config is in, so I can't convert it!");
                }

                let s;
                if (typeof config[target] === 'string') s = `Set the config value \`${target}\` to \`"${config[target]}"\`!`;
                else s = `Set the config value \`${target}\` to \`${config[target]}\`!`;
                s += "\nDon't forget to `!config reload` to apply your changes!";
                if (configType === 'undefined') s += "\n**Note:** That config option wasn't there before! Are you sure that's not a typo?"
                await message.reply(s);
            }
        } else if (content.startsWith("!message ")) {
            const messageContent = content.substring(9);
            const messageEmbed = ownerMessageEmbed(messageContent, message.author);

            const guilds = await alertsPerChannelPerGuild();

            await message.reply(`Sending message to ${Object.keys(guilds).length} guilds with alerts set up...`);

            for (const guildId in guilds) {
                const guild = client.guilds.cache.get(guildId);
                if (!guild) continue;

                try {
                    const alertsPerChannel = guilds[guildId];
                    let channelWithMostAlerts = [null, 0];
                    for (const channelId in alertsPerChannel) {
                        if (alertsPerChannel[channelId] > channelWithMostAlerts[1]) {
                            channelWithMostAlerts = [channelId, alertsPerChannel[channelId]];
                        }
                    }
                    if (channelWithMostAlerts[0] === null) continue;

                    const channel = await fetchChannel(channelWithMostAlerts[0]);
                    if (!channel) continue;

                    console.log(`Channel with most alerts: #${channel.name} (${channelWithMostAlerts[1]} alerts)`);
                    await channel.send({
                        embeds: [messageEmbed]
                    });
                } catch (e) {
                    if (e.code === 50013 || e.code === 50001) {
                        console.error(`Don't have perms to send !message to ${guild.name}!`)
                    } else {
                        console.error(`Error while sending !message to guild ${guild.name}!`);
                        console.error(e);
                    }
                }
            }

            await message.reply(`Finished sending the message!`);
        } else if (content.startsWith("!status")) {
            config.status = content.substring(8, 8 + 1023);
            saveConfig();
            await message.reply("Set the status to `" + config.status + "`!");
        } else if (content === "!forcealerts") {
            if (!client.shard || client.shard.ids.includes(0)) {
                await checkAlerts();
                await message.reply("Checked alerts!");
            }
            else {
                await sendShardMessage({ type: "checkAlerts" });
                await message.reply("Told shard 0 to start checking alerts!");
            }
        } else if (content.startsWith("!logs")) {
            const logDir = config.logDir || "data/logs";
            const combinedLogPath = path.join(logDir, "bot.log");
            if (!fs.existsSync(combinedLogPath)) {
                await message.reply("No log file found at `" + combinedLogPath + "` yet.");
                return;
            }

            if (content.includes("file")) {
                const attachment = new AttachmentBuilder(combinedLogPath, { name: "bot.log" });
                await message.reply({ content: "📄 Here is the latest log file:", files: [attachment] });
                return;
            }

            try {
                const fileContent = fs.readFileSync(combinedLogPath, "utf-8");
                const lines = fileContent.trim().split("\n");
                const recent = lines.slice(-15).join("\n");
                const sanitized = recent.length > 1900 ? recent.slice(-1900) : recent;
                await message.reply("```log\n" + sanitized + "\n```");
            } catch (e) {
                await message.reply("Failed reading log file: " + e.message);
            }
        } else if (content === "!stop skinpeek" || content === "!stop bot" || content === "!stop valorantstorecheck") {
            return client.destroy();
        } else if (content === "!update") {
            console.log("Starting git pull...")
            await message.reply("Starting `git pull`... (note that this will only work if you `git clone`d the repo, not if you downloaded a zip)");

            const git = spawn("git", ["pull"]);
            git.stdout.pipe(process.stdout);
            git.stderr.pipe(process.stderr);

            // store stdout in string
            let stdout = "";
            git.stdout.on('data', (data) => stdout += data);


            git.on('close', async (code) => {
                await message.reply('```\n' + stdout + '\n```');

                if (code !== 0) {
                    localError(`git pull failed with exit code ${code}!`);
                    await message.channel.send("`git pull` failed! Check the console for more info.");
                    return;
                }

                if (stdout === "Already up to date.\n") {
                    localLog("Bot is already up to date!");
                    await message.channel.send("Bot is already up to date!");
                }
                else {
                    localLog("Git pull succeded! Stopping the bot...");
                    await message.channel.send("`git pull` succeded! Stopping the bot...");

                    await sendShardMessage({ type: "processExit" });

                    client.destroy();
                    client.destroyed = true;

                    process.exit(0);
                }
            });
        }
    } catch (e) {
        console.error("Error while processing message!");
        console.error(e);
    }
}
