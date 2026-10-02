// dropdown (string select menu) interaction handlers
import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { s, l } from "../../misc/languages.js";
import { getSkin, getBundle } from "../../valorant/cache.js";
import { getStatsFor } from "../../misc/stats.js";
import { alertExists, addAlert } from "../alerts.js";
import { skinNameAndEmoji, removeAlertActionRow, fetchChannel, fetch } from "../../misc/util.js";
import { handleSettingDropdown } from "../../misc/settings.js";
import { VPEmoji } from "../emoji.js";
import { basicEmbed, skinChosenEmbed, renderBundle, statsForSkinEmbed } from "../embed.js";
import { handleError } from "./handleError.js";

export const handleSelectMenuInteraction = async (interaction, valorantUser) => {
        try {
            console.log(`${interaction.user.tag} selected an option from the dropdown with id ${interaction.customId}`);
            let selectType = interaction.customId;
            if (interaction.values[0].startsWith("levels") || interaction.values[0].startsWith("chromas")) selectType = "get-level-video"
            switch (selectType) {
                case "skin-select": {
                    const originalUserId = interaction.message.interactionMetadata?.user?.id || interaction.message.interaction?.user?.id;
                    if (originalUserId && originalUserId !== interaction.user.id) {
                        return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.NOT_UR_MESSAGE_ALERT)],
                            ephemeral: true
                        });
                    }

                    const chosenSkin = interaction.values[0].substr(5);
                    const skin = await getSkin(chosenSkin);

                    const otherAlert = alertExists(interaction.user.id, chosenSkin);
                    if (otherAlert) return await interaction.reply({
                        embeds: [basicEmbed(s(interaction).error.DUPLICATE_ALERT.f({ s: await skinNameAndEmoji(skin, interaction.channel, interaction), c: otherAlert.channel_id }))],
                        components: [removeAlertActionRow(interaction.user.id, otherAlert.uuid, s(interaction).info.REMOVE_ALERT_BUTTON)],
                        ephemeral: true
                    });

                    addAlert(interaction.user.id, {
                        id: interaction.user.id,
                        uuid: chosenSkin,
                        channel_id: interaction.channelId
                    });

                    await interaction.update({
                        embeds: [await skinChosenEmbed(interaction, skin)],
                        components: [removeAlertActionRow(interaction.user.id, chosenSkin, s(interaction).info.REMOVE_ALERT_BUTTON)]
                    });

                    break;
                }
                case "skin-select-stats": {
                    const originalUserId = interaction.message.interactionMetadata?.user?.id || interaction.message.interaction?.user?.id;
                    if (originalUserId && originalUserId !== interaction.user.id) {
                        return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.NOT_UR_MESSAGE_STATS)],
                            ephemeral: true
                        });
                    }

                    const chosenSkin = interaction.values[0].substr(5);
                    const skin = await getSkin(chosenSkin);
                    const stats = getStatsFor(chosenSkin);

                    await interaction.update({
                        embeds: [await statsForSkinEmbed(skin, stats, interaction)],
                        components: []
                    });

                    break;
                }
                case "bundle-select": {
                    const originalUserId = interaction.message.interactionMetadata?.user?.id || interaction.message.interaction?.user?.id;
                    if (originalUserId && originalUserId !== interaction.user.id) {
                        return await interaction.reply({
                            embeds: [basicEmbed(s(interaction).error.NOT_UR_MESSAGE_BUNDLE)],
                            ephemeral: true
                        });
                    }

                    const chosenBundle = interaction.values[0].substring(7);
                    const bundle = await getBundle(chosenBundle);

                    const channel = interaction.channel || await fetchChannel(interaction.channelId);
                    const emoji = await VPEmoji(interaction, channel);
                    const message = await renderBundle(bundle, interaction, emoji);

                    await interaction.update(message);

                    break;
                }
                case "set-setting": {
                    await handleSettingDropdown(interaction);
                    break;
                }
                case "select-skin-with-level": {
                    let skinUuid = interaction.values[0];
                    let skin = await getSkin(skinUuid);
                    const levelSelector = new StringSelectMenuBuilder()
                        .setCustomId(`select-skin-level`)
                        .setPlaceholder(s(interaction).info.SELECT_LEVEL_OF_SKIN)

                    if(!skin){
                        const req = await fetch(`https://valorant-api.com/v1/weapons/skins/${skinUuid}?language=all`);
                        skin = JSON.parse(req.body).data;
                        skinUuid = skin.levels[0].uuid;
                    }

                    for (let i = 0; i < skin.levels.length; i++) {
                        const level = skin.levels[i];
                        if (level.streamedVideo) {
                            let skinName = l(level.displayName, interaction);
                            if (skinName.length > 100) skinName = skinName.slice(0, 96) + " ...";
                            levelSelector.addOptions(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(`${skinName}`)
                                    .setValue(`levels/${level.uuid}/${skinUuid}`))
                        }
                    }

                    for (let i = 1; i < skin.chromas.length; i++) { // this change skips the default version of the skin because it is the same as level 1 (may work incorrectly, let me know if so)
                        const chromas = skin.chromas[i]
                        let chromaName = l(chromas.displayName, interaction);
                        if (chromaName.length > 100) chromaName = chromaName.slice(0, 96) + " ...";
                        levelSelector.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${chromaName}`)
                                .setValue(`chromas/${chromas.uuid}/${skinUuid}`))
                    }

                    // a select menu with zero options is rejected by the Discord API
                    if (levelSelector.options.length === 0) {
                        return await interaction.reply({
                            content: "This skin has no video previews",
                            ephemeral: true
                        });
                    }

                    await interaction.reply({ components: [new ActionRowBuilder().addComponents(levelSelector)], ephemeral: true })
                    break;
                }
                case "get-level-video": {
                    const [type, uuid, skinUuid] = interaction.values[0].split('/');
                    const rawSkin = await getSkin(skinUuid);
                    const skinItem = rawSkin?.[type]?.find(x => x.uuid === uuid);
                    if (!skinItem) {
                        return await interaction.reply({
                            content: "❌ ไม่พบข้อมูลพรีวิวของสกินนี้",
                            ephemeral: true
                        });
                    }
                    const name = l(skinItem.displayName, interaction) || "Skin Preview";

                    if (skinItem.streamedVideo) {
                        await interaction.reply({
                            content: `🎬 **${name}**\n${skinItem.streamedVideo}`,
                            ephemeral: true
                        });
                    } else if (skinItem.displayIcon) {
                        const embed = basicEmbed(`🖼️ **${name}**`);
                        embed.image = { url: skinItem.displayIcon };
                        await interaction.reply({
                            embeds: [embed],
                            ephemeral: true
                        });
                    } else {
                        await interaction.reply({
                            content: `**${name}**`,
                            ephemeral: true
                        });
                    }
                    break;
                }
            }
        } catch (e) {
            await handleError(e, interaction);
        }
}
