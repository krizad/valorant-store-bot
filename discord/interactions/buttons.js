// button interactions + the gotopage modal submission opened by them
import {
    ActionRowBuilder,
    ButtonStyle,
    MessageFlags,
    MessageFlagsBitField,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import { client } from "../bot.js";
import { s, l } from "../../misc/languages.js";
import { authFailureMessage, basicEmbed } from "../embed.js";
import { getSkin } from "../../valorant/cache.js";
import { getUser } from "../../valorant/auth.js";
import { getSetting } from "../../misc/settings.js";
import { calcLength, canSendMessages, fetchChannel, removeAlertActionRow, skinNameAndEmoji } from "../../misc/util.js";
import { WeaponTypeUuid } from "../../misc/weaponTypes.js";
import { filteredAlertsForUser, removeAlert } from "../alerts.js";
import { fetchAlerts } from "../alerts.js";
import { VPEmoji } from "../emoji.js";
import { retryFailedOperation } from "../authManager.js";
import { getOverallStats } from "../../misc/stats.js";
import {
    alertsPageEmbed,
    allStatsEmbed,
    renderBundle,
    skinCollectionPageEmbed,
    skinCollectionSingleEmbed,
    collectionOfWeaponEmbed,
    renderCompetitiveMatchHistory,
    switchAccountButtons
} from "../embed.js";
import { getLoadout, getSkins } from "../../valorant/inventory.js";
import { switchAccount } from "../../valorant/accountSwitcher.js";
import { renderBattlepassProgress } from "../../valorant/battlepass.js";
import { fetchNightMarket, fetchShop } from "../../valorant/shopManager.js";
import { fetchMatchHistory, getAccountInfo } from "../../valorant/profile.js";
import { renderCollection } from "../../valorant/inventory.js";
import { handleError } from "./handleError.js";

export const handleButtonInteraction = async (interaction, valorantUser) => {
        try {
            console.log(`${interaction.user.tag} clicked ${interaction.component.customId}`);
            if (interaction.customId === "open-login-modal") {
                const modal = new ModalBuilder()
                    .setCustomId("login-ssid-modal")
                    .setTitle(s(interaction).modal.LOGIN_SSID_TITLE);

                const ssidInput = new TextInputBuilder()
                    .setCustomId("ssid-input")
                    .setLabel(s(interaction).modal.LOGIN_SSID_LABEL)
                    .setPlaceholder(s(interaction).modal.LOGIN_SSID_PLACEHOLDER)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(ssidInput));
                return await interaction.showModal(modal);
            }
            if (interaction.customId.startsWith("removealert/")) {
                const [, uuid, id] = interaction.customId.split('/');

                if (id !== interaction.user.id) return await interaction.reply({
                    embeds: [basicEmbed(s(interaction).error.NOT_UR_ALERT)],
                    ephemeral: true
                });

                const success = removeAlert(id, uuid);
                if (success) {
                    const skin = await getSkin(uuid);

                    const channel = interaction.channel || await fetchChannel(interaction.channelId);
                    await interaction.reply({
                        embeds: [basicEmbed(s(interaction).info.ALERT_REMOVED.f({ s: await skinNameAndEmoji(skin, channel, interaction) }))],
                        ephemeral: true
                    });

                    if (interaction.message.flags.has(MessageFlagsBitField.Flags.Ephemeral)) return; // message is ephemeral

                    const commandName = interaction.message.interactionMetadata?.name || interaction.message.interaction?.commandName;
                    if (commandName === "alert") { // if the message is the response to /alert
                        await interaction.message.delete().catch(() => { });
                    } else { // the message is an automatic alert
                        const actionRow = removeAlertActionRow(interaction.user.id, uuid, s(interaction).info.REMOVE_ALERT_BUTTON);
                        actionRow.components[0].setDisabled(true).setLabel("Removed");

                        await interaction.update({ components: [actionRow] }).catch(() => { });
                    }
                } else {
                    await interaction.reply({ embeds: [basicEmbed(s(interaction).error.GHOST_ALERT)], ephemeral: true });
                }
            } else if (interaction.customId.startsWith("retry_auth")) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const [, operationIndex] = interaction.customId.split('/');
                await retryFailedOperation(interaction, parseInt(operationIndex));
            } else if (interaction.customId.startsWith("changealertspage")) {
                const [, id, pageIndex] = interaction.customId.split('/');

                if (id !== interaction.user.id) return await interaction.reply({
                    embeds: [basicEmbed(s(interaction).error.NOT_UR_ALERT)],
                    ephemeral: true
                });

                const emojiString = await VPEmoji(interaction);
                await interaction.update(await alertsPageEmbed(interaction, await filteredAlertsForUser(interaction), parseInt(pageIndex), emojiString));
            } else if (interaction.customId.startsWith("changestatspage")) {
                const [, id, pageIndex] = interaction.customId.split('/');

                if (id !== interaction.user.id) return await interaction.reply({
                    embeds: [basicEmbed(s(interaction).error.NOT_UR_MESSAGE_STATS)],
                    ephemeral: true
                });

                await interaction.update(await allStatsEmbed(interaction, await getOverallStats(), parseInt(pageIndex)));
            } else if (interaction.customId.startsWith("clpage")) {
                const [, id, pageIndex] = interaction.customId.split('/');

                let user;
                if (id !== interaction.user.id) user = getUser(id);
                else user = valorantUser;

                const loadoutResponse = await getLoadout(user);
                if (!loadoutResponse.success) return await interaction.reply(authFailureMessage(interaction, loadoutResponse, s(interaction).error.AUTH_ERROR_COLLECTION, id !== interaction.user.id));

                await interaction.update(await skinCollectionPageEmbed(interaction, id, user, loadoutResponse, parseInt(pageIndex)));
            } else if (interaction.customId.startsWith("clswitch")) {
                const [, switchTo, id] = interaction.customId.split('/');
                const switchToPage = switchTo === "p";

                let user;
                if (id !== interaction.user.id) user = getUser(id);
                else user = valorantUser;

                const loadoutResponse = await getLoadout(user);
                if (!loadoutResponse.success) return await interaction.reply(authFailureMessage(interaction, loadoutResponse, s(interaction).error.AUTH_ERROR_COLLECTION, id !== interaction.user.id));

                if (switchToPage) await interaction.update(await skinCollectionPageEmbed(interaction, id, user, loadoutResponse));
                else await interaction.update(await skinCollectionSingleEmbed(interaction, id, user, loadoutResponse));
            } else if (interaction.customId.startsWith("clwpage")) {
                const [, weaponTypeIndex, id, pageIndex] = interaction.customId.split('/');
                const weaponType = Object.values(WeaponTypeUuid)[parseInt(weaponTypeIndex)];

                let user;
                if (id !== interaction.user.id) user = getUser(id);
                else user = valorantUser;

                const skinsResponse = await getSkins(user);
                if (!skinsResponse.success) return await interaction.reply(authFailureMessage(interaction, skinsResponse, s(interaction).error.AUTH_ERROR_COLLECTION, id !== interaction.user.id));

                await interaction.update(await collectionOfWeaponEmbed(interaction, id, user, weaponType, skinsResponse.skins, parseInt(pageIndex)));
            } else if (interaction.customId.startsWith("clwswitch")) {
                const [, weaponTypeIndex, switchTo, id] = interaction.customId.split('/');
                const weaponType = Object.values(WeaponTypeUuid)[parseInt(weaponTypeIndex)];
                const switchToPage = switchTo === "p";

                let user;
                if (id !== interaction.user.id) user = getUser(id);
                else user = valorantUser;

                const skinsResponse = await getSkins(user);
                if (!skinsResponse.success) return await interaction.reply(authFailureMessage(interaction, skinsResponse, s(interaction).error.AUTH_ERROR_COLLECTION, id !== interaction.user.id));

                await interaction.update(await collectionOfWeaponEmbed(interaction, id, user, weaponType, skinsResponse.skins));
            } else if (interaction.customId.startsWith("viewbundle")) {
                const [, id, uuid] = interaction.customId.split('/');

                if (id !== interaction.user.id) return await interaction.reply({
                    embeds: [basicEmbed(s(interaction).error.NOT_UR_MESSAGE_BUNDLE)],
                    ephemeral: true
                });

                const bundle = await getBundle(uuid);
                const emoji = await VPEmoji(interaction);
                await interaction.update({
                    components: [],
                    ...await renderBundle(bundle, interaction, emoji),
                });
            } else if (interaction.customId.startsWith("account")) {

                const [, customId, id, accountIndex] = interaction.customId.split('/');

                if (id !== interaction.user.id && !getSetting(id, "othersCanUseAccountButtons")) return await interaction.reply({
                    embeds: [basicEmbed(s(interaction).error.NOT_UR_MESSAGE_GENERIC)],
                    ephemeral: true
                });

                if (!canSendMessages(interaction.channel)) return await interaction.reply({
                    embeds: [basicEmbed(s(interaction).error.GENERIC_NO_PERMS)]
                });

                const channel = await client.channels.fetch(interaction.channelId);
                const message = await channel.messages.fetch(interaction.message.id);
                if (!message.components) message.components = switchAccountButtons(interaction, customId, true);

                for (const actionRow of message.components) {
                    for (const component of actionRow.components) {
                        if (component.data.custom_id === interaction.customId) {
                            component.data.label = `${s(interaction).info.LOADING}`;
                            component.data.style = ButtonStyle.Primary;
                            component.data.disabled = true;
                            component.data.emoji = { name: '⏳' };
                        }
                    }
                }

                await interaction.update({
                    embeds: message.embeds,
                    components: message.components
                });
                if (accountIndex !== "accessory" && accountIndex !== "daily" && accountIndex !== "c") {
                    const success = switchAccount(id, parseInt(accountIndex));
                    if (!success) return await interaction.followUp({
                        embeds: [basicEmbed(s(interaction).error.ACCOUNT_NOT_FOUND)],
                        ephemeral: true
                    });
                }

                let newMessage;
                switch (customId) {
                    case "shop": newMessage = await fetchShop(interaction, getUser(id), id, "daily"); break;
                    case "accessoryshop": newMessage = await fetchShop(interaction, getUser(id), id, "accessory"); break;
                    case "nm": newMessage = await fetchNightMarket(interaction, getUser(id)); break;
                    case "bp": newMessage = await renderBattlepassProgress(interaction, id); break;
                    case "alerts": newMessage = await fetchAlerts(interaction); break;
                    case "cl": newMessage = await renderCollection(interaction, id); break;
                    case "profile": newMessage = await renderProfile(interaction, await getAccountInfo(getUser(id)), id); break;
                    case "comphistory": newMessage = await renderCompetitiveMatchHistory(interaction, await getAccountInfo(getUser(id)),await fetchMatchHistory(interaction, getUser(id), "competitive"), id); break;
                }
                /* else */ if (customId.startsWith("clw")) {
                    let valorantUser = getUser(id);
                    const [, weaponTypeIndex] = interaction.customId.split('/')[1].split('-');
                    const weaponType = Object.values(WeaponTypeUuid)[parseInt(weaponTypeIndex)];
                    newMessage = await collectionOfWeaponEmbed(interaction, id, valorantUser, weaponType, (await getSkins(valorantUser)).skins);
                }

                if (!newMessage.components) newMessage.components = switchAccountButtons(interaction, customId, true, false, id);


                await message.edit(newMessage);
            } else if (interaction.customId.startsWith("gotopage")) {
                let [, pageId, userId, max] = interaction.customId.split('/');
                let weaponTypeIndex
                if(pageId === 'clwpage') [, pageId, weaponTypeIndex, userId, max] = interaction.customId.split('/');

                if (userId !== interaction.user.id){
                    if (pageId === 'changestatspage'){
                        return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.NOT_UR_MESSAGE_STATS)],
                            ephemeral: true
                        });
                    }else if (pageId === 'changealertspage'){
                        return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.NOT_UR_ALERT)],
                            ephemeral: true
                        });
                    }
                }

                const modal = new ModalBuilder()
                    .setCustomId(`gotopage/${pageId}${weaponTypeIndex ? `/${weaponTypeIndex}`: ''}/${userId}/${max}`)
                    .setTitle(s(interaction).modal.PAGE_TITLE);

                const pageInput = new TextInputBuilder()
                    .setMinLength(1)
                    .setMaxLength(calcLength(max))
                    .setPlaceholder(s(interaction).modal.PAGE_INPUT_PLACEHOLDER)
                    .setRequired(true)
                    .setCustomId('pageIndex')
                    .setLabel(s(interaction).modal.PAGE_INPUT_LABEL.f({max: max}))
                    .setStyle(TextInputStyle.Short);

                const q1 = new ActionRowBuilder().addComponents(pageInput);
                modal.addComponents(q1);
                await interaction.showModal(modal);
            }
        } catch (e) {
            await handleError(e, interaction);
        }
}

export const handleGotopageModalSubmit = async (interaction, valorantUser) => {
        try {
            if (interaction.customId.startsWith("gotopage")) {
                let [, pageId, userId, max] = interaction.customId.split('/');
                let weaponTypeIndex
                if(pageId === 'clwpage') [, pageId, weaponTypeIndex, userId, max] = interaction.customId.split('/');
                const pageIndex = interaction.fields.getTextInputValue('pageIndex');

                if(isNaN(Number(pageIndex))){
                    return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.NOT_A_NUMBER)],
                        ephemeral: true
                    });
                }else if(Number(pageIndex) > max || Number(pageIndex) <= 0){
                    return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.INVALID_PAGE_NUMBER.f({max: max}))],
                        ephemeral: true
                    });
                }

                switch (pageId) {
                    case "clpage": await clpage(); break;
                    case "clwpage": await clwpage(); break;
                    case "changealertspage": await interaction.update(await alertsPageEmbed(interaction, await filteredAlertsForUser(interaction), parseInt(pageIndex-1), await VPEmoji(interaction))); break;
                    case "changestatspage": await interaction.update(await allStatsEmbed(interaction, await getOverallStats(), parseInt(pageIndex-1)));break;
                }

                async function clpage() {
                    let user;
                    if (userId !== interaction.user.id) user = getUser(userId);
                    else user = valorantUser;

                    const loadoutResponse = await getLoadout(user);
                    if (!loadoutResponse.success) return await interaction.reply(authFailureMessage(interaction, loadoutResponse, s(interaction).error.AUTH_ERROR_COLLECTION, userId !== interaction.user.id));

                    await interaction.update(await skinCollectionPageEmbed(interaction, userId, user, loadoutResponse, parseInt(pageIndex-1)));
                }

                async function clwpage() {
                    const weaponType = Object.values(WeaponTypeUuid)[parseInt(weaponTypeIndex)];

                    let user;
                    if (userId !== interaction.user.id) user = getUser(userId);
                    else user = valorantUser;

                    const skinsResponse = await getSkins(user);
                    if (!skinsResponse.success) return await interaction.reply(authFailureMessage(interaction, skinsResponse, s(interaction).error.AUTH_ERROR_COLLECTION, userId !== interaction.user.id));

                    await interaction.update(await collectionOfWeaponEmbed(interaction, userId, user, weaponType, skinsResponse.skins, parseInt(pageIndex-1)));
                }
            }
        } catch (e) {
            await handleError(e, interaction);
        }
}
