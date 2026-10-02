// Bot core: client setup, startup tasks, and interaction routing.
// Command definitions live in commands.js, cron jobs in tasks.js, admin prefix
// commands in adminCommands.js, and interaction handlers in interactions/.
import {
    Client,
    GatewayIntentBits,
    ActivityType,
    Events
} from "discord.js";
import config from "../misc/config.js";
import { getUser } from "../valorant/auth.js";
import { fetchData } from "../valorant/cache.js";
import { fetchRiotVersionData, initProxyManager, getProxyManager } from "../misc/util.js";
import { s } from "../misc/languages.js";
import { areAllShardsReady } from "../misc/shardMessage.js";
import { registerInteractionLocale } from "../misc/settings.js";
import { commands } from "./commands.js";
import { scheduleTasks } from "./tasks.js";
import { handleAdminMessage } from "./adminCommands.js";
import { handleModalSubmit } from "./interactions/modals.js";
import { handleCommandInteraction } from "./interactions/slashCommands.js";
import { handleSelectMenuInteraction } from "./interactions/selectMenus.js";
import { handleButtonInteraction, handleGotopageModalSubmit } from "./interactions/buttons.js";
import { handleAutocompleteInteraction } from "./interactions/autocomplete.js";

export const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildEmojisAndStickers],
    partials: ["CHANNEL"], // required to receive DMs
    //shards: "auto" // uncomment this to use internal sharding instead of sharding.js
});

client.on(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    if (!config.ownerId) {
        console.warn("[Config] ownerId is not set — EVERYONE can run admin prefix commands (!config, !deploy, !stop, ...)!");
        console.warn("[Config] Set ownerId in config.json to your Discord user ID to lock them down.");
    }

    console.log("Loading skins...");
    fetchData().then(() => console.log("Skins loaded!")).catch(e => console.error("Failed to load skins:", e));
    fetchRiotVersionData().then(() => console.log("Fetched latest Riot user-agent!")).catch(e => console.error("Failed to fetch Riot version:", e));
    initProxyManager().then(() => {
        if (getProxyManager().enabled) {
            console.log(`Proxy manager loaded ${getProxyManager().allProxies.length} proxies!`);
            // getProxyManager().loadForHostname("auth.riotgames.com").then(() => console.log("Loaded proxies for auth.riotgames.com!"));
        }
    });

    scheduleTasks();

    await client.user.setActivity("your store!", { type: ActivityType.Watching });

    // deploy commands if different
    if (config.autoDeployCommands && (!client.shard || client.shard.ids[0] === 0)) {
        const currentCommands = await client.application.commands.fetch();

        let shouldDeploy = currentCommands.size !== commands.length;
        if (!shouldDeploy) for (const command of commands) {
            try {
                const correspondingCommand = currentCommands.find(c => c.equals(command));
                if (!correspondingCommand) shouldDeploy = true;
            } catch (e) {
                shouldDeploy = true;
            }
            if (shouldDeploy) break;
        }

        if (shouldDeploy) {
            console.log("Slash commands are different! Deploying the new ones globally...");
            await client.application.commands.set(commands);
            console.log("Slash commands deployed!");
        }
    }

    // tell sharding manager that we're ready (workaround in case of shard respawn)
    if (client.shard) client.shard.send("shardReady");
});

client.on("messageCreate", async (message) => {
    await handleAdminMessage(message);
});

client.on("interactionCreate", async (interaction) => {

    let maintenanceMessage;
    if (config.maintenanceMode) maintenanceMessage = config.status || "The bot is currently under maintenance! Please be patient.";
    else if (!areAllShardsReady()) maintenanceMessage = s(interaction).info.SHARDS_LOADING;
    if (maintenanceMessage) {
        if (interaction.isAutocomplete()) return await interaction.respond([{ name: maintenanceMessage, value: maintenanceMessage }]);
        return await interaction.reply({ content: maintenanceMessage, ephemeral: true });
    }

    registerInteractionLocale(interaction);

    const valorantUser = getUser(interaction.user.id);

    if (interaction.isModalSubmit()) {
        // the gotopage modal (opened by buttons) has its own handler
        if (interaction.customId.startsWith("gotopage")) return await handleGotopageModalSubmit(interaction, valorantUser);
        return await handleModalSubmit(interaction, valorantUser);
    }
    if (interaction.isCommand()) return await handleCommandInteraction(interaction, valorantUser);
    if (interaction.isStringSelectMenu()) return await handleSelectMenuInteraction(interaction, valorantUser);
    if (interaction.isButton()) return await handleButtonInteraction(interaction, valorantUser);
    if (interaction.isAutocomplete()) return await handleAutocompleteInteraction(interaction);
});

// don't crash the bot, no matter what!
process.on("uncaughtException", (err) => {
    console.error("Uncaught exception!");
    console.error(err.stack || err);
});

export const startBot = () => {
    console.log("Logging in...");
    client.login(config.token);
}
