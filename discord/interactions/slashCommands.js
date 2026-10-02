// slash command handlers — one case per command (mirrors discord/commands.js definitions)
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import { client } from "../bot.js";
import config, { resolvePublicUrl } from "../../misc/config.js";
import { createLoginSession } from "../../misc/sessionStore.js";
import { s, l } from "../../misc/languages.js";
import {
    canSendMessages,
    defer,
    fetchChannel,
    fetchMaintenances,
    isRiotRedirectUrl,
    removeAlertActionRow,
    skinNameAndEmoji
} from "../../misc/util.js";
import { getOverallStats, getStatsFor } from "../../misc/stats.js";
import { authUser, getUser, getUserList, getRegion, getUserInfo } from "../../valorant/auth.js";
import { getBalance } from "../../valorant/shop.js";
import { searchSkin, searchBundle } from "../../valorant/cache.js";
import { queueCookiesLogin, queueRedirectUrlLogin, waitForAuthQueueResponse } from "../../valorant/authQueue.js";
import { renderBattlepassProgress } from "../../valorant/battlepass.js";
import {
    deleteUser,
    deleteWholeUser,
    findTargetAccountIndex,
    getNumberOfAccounts,
    readUserJson,
    switchAccount,
    saveUser
} from "../../valorant/accountSwitcher.js";
import { renderCollection } from "../../valorant/inventory.js";
import { getAccountInfo } from "../../valorant/profile.js";
import { fetchBundles, fetchNightMarket, fetchShop } from "../../valorant/shopManager.js";
import { addAlert, alertExists, fetchAlerts, testAlerts } from "../alerts.js";
import { RadEmoji, VPEmoji, KCEmoji } from "../emoji.js";
import {
    accountsListEmbed,
    alertTestResponse,
    allStatsEmbed,
    authFailureMessage,
    basicEmbed,
    botInfoEmbed,
    helpEmbed,
    renderBundle,
    renderProfile,
    secondaryEmbed,
    skinChosenEmbed,
    statsForSkinEmbed,
    VAL_COLOR_1,
    valMaintenancesEmbeds
} from "../embed.js";
import { getSetting, handleSettingsSetCommand, handleSettingsViewCommand } from "../../misc/settings.js";
import { handleError } from "./handleError.js";

export const handleCommandInteraction = async (interaction, valorantUser) => {
    try {
        console.log(`${interaction.user.tag} used /${interaction.commandName}`);
        switch (interaction.commandName) {
                case "shop": {
                    let targetUser = interaction.user;
                    let targetValorantUser = valorantUser;

                    const otherUser = interaction.options.getUser("user");
                    if (otherUser && otherUser.id !== interaction.user.id) {
                        const otherValorantUser = getUser(otherUser.id);
                        if (!otherValorantUser) return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED_OTHER)]
                        });

                        if (!getSetting(otherUser.id, "othersCanViewShop")) return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.OTHER_SHOP_DISABLED.f({ u: `<@${otherUser.id}>` }))]
                        });

                        targetUser = otherUser;
                        targetValorantUser = otherValorantUser;
                    }
                    else if (!valorantUser) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });

                    await defer(interaction);

                    const message = await fetchShop(interaction, targetValorantUser, targetUser.id);
                    await interaction.followUp(message);

                    console.log(`Sent ${targetUser.tag}'s shop!`); // also logged if maintenance/login failed

                    break;
                }
                case "accessoryshop": {
                    let targetUser = interaction.user;
                    let targetValorantUser = valorantUser;

                    const otherUser = interaction.options.getUser("user");
                    if (otherUser && otherUser.id !== interaction.user.id) {
                        const otherValorantUser = getUser(otherUser.id);
                        if (!otherValorantUser) return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED_OTHER)]
                        });

                        if (!getSetting(otherUser.id, "othersCanViewShop")) return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.OTHER_SHOP_DISABLED.f({ u: `<@${otherUser.id}>` }))]
                        });

                        targetUser = otherUser;
                        targetValorantUser = otherValorantUser;
                    }
                    else if (!valorantUser) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });

                    await defer(interaction);

                    const message = await fetchShop(interaction, targetValorantUser, targetUser.id, "accessory");
                    await interaction.followUp(message);

                    console.log(`Sent ${targetUser.tag}'s accessory shop!`);

                    break;
                }
                case "bundles": {
                    if (!valorantUser) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });

                    await defer(interaction);

                    const message = await fetchBundles(interaction);
                    await interaction.followUp(message);

                    console.log(`Sent ${interaction.user.tag}'s bundle(s)!`);

                    break;
                }
                case "bundle": {
                    await defer(interaction);

                    const searchQuery = interaction.options.get("bundle").value.replace(/collection/i, "").replace(/bundle/i, "");
                    const searchResults = await searchBundle(searchQuery, interaction.locale, 25);

                    const channel = interaction.channel || await fetchChannel(interaction.channelId);
                    const emoji = await VPEmoji(interaction, channel);

                    // if the name matches exactly, and there is only one with that name
                    const nameMatchesExactly = (interaction) => searchResults.filter(r => l(r.obj.names, interaction).toLowerCase() === searchQuery.toLowerCase()).length === 1;

                    if (searchResults.length === 0) {
                        return await interaction.followUp({
                            embeds: [basicEmbed(s(interaction).error.BUNDLE_NOT_FOUND)],
                            ephemeral: true
                        });
                    } else if (searchResults.length === 1 || nameMatchesExactly(interaction) || nameMatchesExactly()) { // check both localized and english
                        const bundle = searchResults[0].obj;
                        const message = await renderBundle(bundle, interaction, emoji)

                        return await interaction.followUp(message);
                    } else {
                        const row = new ActionRowBuilder();

                        const options = searchResults.map(result => {
                            return {
                                label: l(result.obj.names, interaction),
                                value: `bundle-${result.obj.uuid}`
                            }
                        });

                        // some bundles have the same name (e.g. Magepunk)
                        const nameCount = {};
                        for (const option of options) {
                            if (option.label in nameCount) nameCount[option.label]++;
                            else nameCount[option.label] = 1;
                        }

                        for (let i = options.length - 1; i >= 0; i--) {
                            const occurrence = nameCount[options[i].label]--;
                            if (occurrence > 1) options[i].label += " " + occurrence;
                        }

                        row.addComponents(new StringSelectMenuBuilder().setCustomId("bundle-select").setPlaceholder(s(interaction).info.BUNDLE_CHOICE_PLACEHOLDER).addOptions(options));

                        await interaction.followUp({
                            embeds: [secondaryEmbed(s(interaction).info.BUNDLE_CHOICE)],
                            components: [row]
                        });
                    }

                    break;
                }
                case "nightmarket": {
                    if (!valorantUser) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });

                    await defer(interaction);

                    const message = await fetchNightMarket(interaction, valorantUser);
                    await interaction.followUp(message);

                    console.log(`Sent ${interaction.user.tag}'s night market!`);

                    break;
                }
                case "balance": {
                    if (!valorantUser) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });

                    await defer(interaction);

                    const channel = interaction.channel || await fetchChannel(interaction.channelId);
                    const VPEmojiPromise = VPEmoji(interaction, channel);
                    const RadEmojiPromise = RadEmoji(interaction, channel);
                    const KCEmojiPromise = KCEmoji(interaction, channel);

                    const balance = await getBalance(interaction.user.id);

                    if (!balance.success) return await interaction.followUp(authFailureMessage(interaction, balance, "**Could not fetch your balance**, most likely you got logged out. Try logging in again."));

                    const theVPEmoji = await VPEmojiPromise;
                    const theRadEmoji = await RadEmojiPromise || "";
                    const theKCEmoji = await KCEmojiPromise || "";

                    await interaction.followUp({
                        embeds: [{ // move this to embed.js?
                            title: s(interaction).info.WALLET_HEADER.f({ u: valorantUser.username }, interaction),
                            color: VAL_COLOR_1,
                            fields: [
                                { name: s(interaction).info.VPOINTS, value: `${theVPEmoji} ${balance.vp}`, inline: true },
                                { name: s(interaction).info.RADIANITE, value: `${theRadEmoji} ${balance.rad}`, inline: true },
                                { name: s(interaction).info.KCREDIT, value: `${theKCEmoji} ${balance.kc}`, inline: true }
                            ]
                        }]
                    });
                    console.log(`Sent ${interaction.user.tag}'s balance!`);

                    break;
                }
                case "alert": {
                    if (!valorantUser) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });

                    const channel = interaction.channel || await fetchChannel(interaction.channelId);
                    if (!canSendMessages(channel)) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.ALERT_NO_PERMS)]
                    });

                    await defer(interaction);

                    const auth = await authUser(interaction.user.id);
                    if (!auth.success) return await interaction.followUp(authFailureMessage(interaction, auth, s(interaction).error.AUTH_ERROR_ALERTS));

                    const searchQuery = interaction.options.get("skin").value
                    const searchResults = await searchSkin(searchQuery, interaction.locale, 25);

                    // filter out results for which the user already has an alert set up
                    const filteredResults = [];
                    for (const result of searchResults) {
                        const otherAlert = alertExists(interaction.user.id, result.obj.uuid);
                        if (!otherAlert) filteredResults.push(result);
                    }

                    if (filteredResults.length === 0) {
                        if (searchResults.length === 0) return await interaction.editReply({
                            embeds: [basicEmbed(s(interaction).error.SKIN_NOT_FOUND)]
                        });

                        const skin = searchResults[0].obj;
                        const otherAlert = alertExists(interaction.user.id, skin.uuid);
                        return await interaction.editReply({
                            embeds: [basicEmbed(s(interaction).error.DUPLICATE_ALERT.f({ s: await skinNameAndEmoji(skin, interaction.channel, interaction), c: otherAlert.channel_id }))],
                            components: [removeAlertActionRow(interaction.user.id, skin.uuid, s(interaction).info.REMOVE_ALERT_BUTTON)],
                        });
                    } else if (filteredResults.length === 1 ||
                        l(filteredResults[0].obj.names, interaction.locale).toLowerCase() === searchQuery.toLowerCase() ||
                        l(filteredResults[0].obj.names).toLowerCase() === searchQuery.toLowerCase()) {
                        const skin = filteredResults[0].obj;

                        addAlert(interaction.user.id, {
                            uuid: skin.uuid,
                            channel_id: interaction.channelId
                        });

                        return await interaction.editReply({
                            embeds: [await skinChosenEmbed(interaction, skin)],
                            components: [removeAlertActionRow(interaction.user.id, skin.uuid, s(interaction).info.REMOVE_ALERT_BUTTON)],
                        });
                    } else {
                        const row = new ActionRowBuilder();
                        const options = filteredResults.splice(0, 25).map(result => {
                            return {
                                label: l(result.obj.names, interaction),
                                value: `skin-${result.obj.uuid}`
                            }
                        });
                        row.addComponents(new StringSelectMenuBuilder().setCustomId("skin-select").setPlaceholder(s(interaction).info.ALERT_CHOICE_PLACEHOLDER).addOptions(options));

                        await interaction.editReply({
                            embeds: [secondaryEmbed(s(interaction).info.ALERT_CHOICE)],
                            components: [row]
                        });
                    }

                    break;
                }
                case "alerts": {
                    if (!valorantUser) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });

                    await defer(interaction);

                    const message = await fetchAlerts(interaction);
                    await interaction.followUp(message);

                    break;
                }
                case "update": {
                    if (!valorantUser) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true,
                    });

                    await defer(interaction, true);

                    const id = interaction.user.id;
                    const authSuccess = await authUser(id);
                    if (!authSuccess.success) return await interaction.followUp(authFailureMessage(interaction, authSuccess, s(interaction).error.AUTH_ERROR_GENERIC));

                    let user = getUser(id);
                    if (!user) return await interaction.followUp({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });
                    console.log(`Refreshing username & region for ${user.username}...`);

                    const [userInfo, region] = await Promise.all([
                        getUserInfo(user),
                        getRegion(user)
                    ]);

                    user.username = userInfo.username;
                    user.region = region;
                    user.lastFetchedData = Date.now();
                    saveUser(user);

                    await interaction.followUp({
                        embeds: [basicEmbed(s(interaction).info.ACCOUNT_UPDATED.f({ u: user.username }, interaction))],
                        ephemeral: true
                    });
                    break;
                }
                case "testalerts": {
                    if (!valorantUser) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });

                    await defer(interaction);

                    const auth = await authUser(interaction.user.id);
                    if (!auth.success) return await interaction.followUp(authFailureMessage(interaction, auth, s(interaction).error.AUTH_ERROR_ALERTS));

                    const success = await testAlerts(interaction);

                    await alertTestResponse(interaction, success);

                    break;
                }
                case "login": {
                    const json = readUserJson(interaction.user.id);
                    if (json && json.accounts.length >= config.maxAccountsPerUser) {
                        return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.TOO_MANY_ACCOUNTS.f({ n: config.maxAccountsPerUser }))],
                            ephemeral: true
                        });
                    }

                    const ssidOption = interaction.options.get("ssid")?.value;
                    if (ssidOption) {
                        await defer(interaction, true);
                        let input = ssidOption.trim();
                        if (!input) {
                            return await interaction.followUp({
                                embeds: [basicEmbed(s(interaction).error.INVALID_COOKIES)],
                                ephemeral: true
                            });
                        }

                        let success;
                        if (isRiotRedirectUrl(input)) {
                            success = await queueRedirectUrlLogin(interaction.user.id, input);
                        } else {
                            if (!input.includes("=")) input = `ssid=${input}`;
                            success = await queueCookiesLogin(interaction.user.id, input);
                        }
                        if (success?.inQueue) success = await waitForAuthQueueResponse(success);

                        const user = getUser(interaction.user.id);
                        let embed;
                        if (success?.success && user) {
                            console.log(`${interaction.user.tag} logged in as ${user.username} using SSID option`);
                            embed = basicEmbed(s(interaction).info.LOGGED_IN.f({ u: user.username }));
                        } else {
                            console.log(`${interaction.user.tag} SSID login failed`);
                            embed = basicEmbed(s(interaction).error.INVALID_COOKIES);
                        }

                        return await interaction.followUp({
                            embeds: [embed],
                            ephemeral: true
                        });
                    }

                    // Generate one-time session for Web Portal login
                    const userLocale = getSetting(interaction.user.id, "locale") || interaction.locale || "en";
                    const portalLang = userLocale.toLowerCase().startsWith("th") ? "th" : "en";
                    const session = createLoginSession(interaction.user.id, interaction.user.tag, "", portalLang);
                    const publicUrl = resolvePublicUrl();
                    const portalUrl = `${publicUrl}/auth/login?token=${session.token}${portalLang !== "en" ? `&lang=${portalLang}` : ""}`;

                    const webLoginButton = new ButtonBuilder()
                        .setLabel(s(interaction).info.LOGIN_WEB_BUTTON)
                        .setStyle(ButtonStyle.Link)
                        .setURL(portalUrl);

                    const modalButton = new ButtonBuilder()
                        .setCustomId("open-login-modal")
                        .setLabel(s(interaction).info.LOGIN_MODAL_BUTTON)
                        .setStyle(ButtonStyle.Secondary);

                    const row = new ActionRowBuilder().addComponents(webLoginButton, modalButton);

                    const embed = new EmbedBuilder()
                        .setTitle(s(interaction).info.LOGIN_PORTAL_TITLE)
                        .setDescription(s(interaction).info.LOGIN_PORTAL_DESC.f({ url: portalUrl }, interaction, false))
                        .addFields({
                            name: s(interaction).info.LOGIN_EXTENSION_TITLE,
                            value: s(interaction).info.LOGIN_EXTENSION_DESC
                        })
                        .setColor("#ff4655")
                        .setFooter({ text: s(interaction).info.LOGIN_PORTAL_FOOTER });

                    // a localhost URL would be useless for people clicking the button from
                    // their own devices — warn the admin right in the reply
                    if (/\/\/(localhost|127\.0\.0\.1)/.test(publicUrl)) {
                        embed.addFields({
                            name: "⚠️ PUBLIC_URL is not configured",
                            value: "The button currently points to `localhost` — other users can't open it.\n**Fix:** set `PUBLIC_URL=https://your-domain` in `.env` (or `publicUrl` in `config.json`) and restart the bot."
                        });
                    }

                    return await interaction.reply({
                        embeds: [embed],
                        components: [row],
                        ephemeral: true
                    });
                }
                case "cookies": {
                    await defer(interaction, true);

                    const cookies = interaction.options.get("cookies").value;

                    let success = await queueCookiesLogin(interaction.user.id, cookies);
                    if (success?.inQueue) success = await waitForAuthQueueResponse(success);

                    const user = getUser(interaction.user.id);
                    let embed;
                    if (success?.success && user) {
                        console.log(`${interaction.user.tag} logged in as ${user.username} using cookies`)
                        embed = basicEmbed(s(interaction).info.LOGGED_IN.f({ u: user.username }));
                    } else {
                        console.log(`${interaction.user.tag} cookies login failed`);
                        embed = basicEmbed(s(interaction).error.INVALID_COOKIES);
                    }

                    await interaction.followUp({
                        embeds: [embed],
                        ephemeral: true
                    });

                    break;
                }
                case "logout":
                case "forget": {
                    const accountCount = getNumberOfAccounts(interaction.user.id);
                    if (accountCount === 0) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });

                    const targetAccount = interaction.options.get("account") && interaction.options.get("account").value;
                    if (targetAccount) {
                        const targetIndex = findTargetAccountIndex(interaction.user.id, targetAccount);

                        if (targetIndex === null) return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.ACCOUNT_NOT_FOUND)],
                            ephemeral: true
                        });

                        if (targetIndex > accountCount) return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.ACCOUNT_NUMBER_TOO_HIGH.f({ n: accountCount }))],
                            ephemeral: true
                        });

                        const usernameOfDeleted = deleteUser(interaction.user.id, targetIndex);

                        await interaction.reply({
                            embeds: [basicEmbed(s(interaction).info.SPECIFIC_ACCOUNT_DELETED.f({ n: targetIndex, u: usernameOfDeleted }, interaction))],
                        });
                    } else {
                        deleteWholeUser(interaction.user.id);
                        console.log(`${interaction.user.tag} deleted their account`);

                        await interaction.reply({
                            embeds: [basicEmbed(s(interaction).info.ACCOUNT_DELETED)],
                            ephemeral: true
                        });
                    }
                    break;
                }
                case "collection": {
                    let targetUser = interaction.user;

                    const otherUser = interaction.options.getUser("user");
                    if (otherUser && otherUser.id !== interaction.user.id) {
                        const otherValorantUser = getUser(otherUser.id);
                        if (!otherValorantUser) return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED_OTHER)]
                        });

                        if (!getSetting(otherUser.id, "othersCanViewColl")) return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.OTHER_COLLECTION_DISABLED.f({ u: `<@${otherUser.id}>` }))]
                        });

                        targetUser = otherUser;
                    }
                    else if (!valorantUser) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });

                    await defer(interaction);

                    const weaponName = interaction.options.getString("weapon");
                    const message = await renderCollection(interaction, targetUser.id, weaponName);
                    await interaction.followUp(message);

                    console.log(`Sent ${targetUser.tag}'s collection!`);

                    break;
                }
                case "battlepass": {
                    if (!valorantUser) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });

                    await defer(interaction);

                    const message = await renderBattlepassProgress(interaction);
                    await interaction.followUp(message);

                    console.log(`Sent ${interaction.user.tag}'s battlepass!`);

                    break;
                }
                case "stats": {
                    await defer(interaction);

                    const skinName = (interaction.options.get("skin") || {}).value;

                    if (skinName) {
                        const skins = await searchSkin(skinName, interaction.locale, 25);

                        if (skins.length === 0) {
                            return await interaction.followUp({
                                embeds: [basicEmbed(s(interaction).error.SKIN_NOT_FOUND)]
                            });
                        } else if (skins.length === 1 ||
                            l(skins[0].obj.names, interaction.locale).toLowerCase() === skinName.toLowerCase() ||
                            l(skins[0].obj.names).toLowerCase() === skinName.toLowerCase()) {
                            const skin = skins[0].obj;

                            const stats = getStatsFor(skin.uuid);

                            return await interaction.followUp({
                                embeds: [await statsForSkinEmbed(skin, stats, interaction)]
                            });
                        } else {
                            const row = new ActionRowBuilder();
                            const options = skins.map(result => {
                                return {
                                    label: l(result.obj.names, interaction),
                                    value: `skin-${result.obj.uuid}`
                                }
                            });
                            row.addComponents(new StringSelectMenuBuilder().setCustomId("skin-select-stats").setPlaceholder(s(interaction).info.ALERT_CHOICE_PLACEHOLDER).addOptions(options));

                            await interaction.followUp({
                                embeds: [secondaryEmbed(s(interaction).info.STATS_CHOICE)],
                                components: [row]
                            });
                        }

                    } else {
                        await interaction.followUp(await allStatsEmbed(interaction, getOverallStats()));
                    }

                    break;
                }
                case "account": {
                    const userJson = readUserJson(interaction.user.id);

                    const accountCount = getNumberOfAccounts(interaction.user.id);
                    if (accountCount === 0) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });

                    const targetAccount = interaction.options.get("account").value;
                    const targetIndex = findTargetAccountIndex(interaction.user.id, targetAccount);

                    if (targetIndex === null) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.ACCOUNT_NOT_FOUND)],
                        ephemeral: true
                    });

                    if (targetIndex > accountCount) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.ACCOUNT_NUMBER_TOO_HIGH.f({ n: accountCount }))],
                        ephemeral: true
                    });

                    if (targetIndex === userJson.currentAccount) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).info.ACCOUNT_ALREADY_SELECTED.f({ u: userJson.accounts[targetIndex - 1]?.username || "Current Account" }, interaction, false))],
                        ephemeral: true
                    });

                    const valorantUser = switchAccount(interaction.user.id, targetIndex);

                    await interaction.reply({
                        embeds: [basicEmbed(s(interaction).info.ACCOUNT_SWITCHED.f({ n: targetIndex, u: valorantUser.username }, interaction))],
                        ephemeral: true
                    });
                    break;
                }
                case "accounts": {
                    const userJson = readUserJson(interaction.user.id);
                    if (!userJson) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });

                    await interaction.reply(accountsListEmbed(interaction, userJson));

                    break;
                }
                case "settings": {
                    switch (interaction.options.getSubcommand()) {
                        case "view": return await handleSettingsViewCommand(interaction);
                        case "set": return await handleSettingsSetCommand(interaction);
                    }

                    break;
                }
                case "valstatus": {
                    if (!valorantUser) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });
                    await defer(interaction);

                    const json = await fetchMaintenances(valorantUser.region);
                    await interaction.followUp(valMaintenancesEmbeds(interaction, json));

                    break;
                }
                case "info": {
                    let guildCount, userCount;
                    if (client.shard) {
                        const guildCounts = await client.shard.fetchClientValues('guilds.cache.size');
                        guildCount = guildCounts.reduce((acc, guildCount) => acc + guildCount, 0);

                        const userCounts = await client.shard.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0));
                        userCount = userCounts.reduce((acc, guildCount) => acc + guildCount, 0);
                    } else {
                        guildCount = client.guilds.cache.size;

                        userCount = 0;
                        for (const guild of client.guilds.cache.values())
                            userCount += guild.memberCount;
                    }

                    const registeredUserCount = getUserList().length;

                    await interaction.reply(botInfoEmbed(interaction, client, guildCount, userCount, registeredUserCount, config.ownerName, config.status));

                    break;
                }
                case "profile": {
                    let targetUser = interaction.user;

                    const otherUser = interaction.options.getUser("user");
                    if (otherUser && otherUser.id !== interaction.user.id) {
                        const otherValorantUser = getUser(otherUser.id);
                        if (!otherValorantUser) return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED_OTHER)]
                        });

                        if (!getSetting(otherUser.id, "othersCanViewProfile")) return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.OTHER_PROFILE_DISABLED.f({ u: `<@${otherUser.id}>` }))]
                        });

                        targetUser = otherUser;
                    }
                    else if (!valorantUser) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_REGISTERED)],
                        ephemeral: true
                    });

                    await defer(interaction);
                    const user = getUser(targetUser.id)
                    const message = await renderProfile(interaction, await getAccountInfo(user, interaction), targetUser.id);

                    await interaction.followUp(message);

                    console.log(`Sent ${targetUser.tag}'s profile!`); // also logged if maintenance/login failed

                    break;
                }
                case "help": {
                    await interaction.reply(helpEmbed(interaction));
                    break;
                }
                default: {
                    await interaction.reply(s(interaction).info.UNHANDLED_COMMAND);
                    break;
                }
        }
    } catch (e) {
        await handleError(e, interaction);
    }
}
