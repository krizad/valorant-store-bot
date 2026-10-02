// modal submit handlers (the gotopage modal is opened & handled in components.js)
import { getUser } from "../../valorant/auth.js";
import { queueCookiesLogin, queueRedirectUrlLogin, waitForAuthQueueResponse } from "../../valorant/authQueue.js";
import { basicEmbed } from "../embed.js";
import { s } from "../../misc/languages.js";
import { defer, isRiotRedirectUrl } from "../../misc/util.js";

export const handleModalSubmit = async (interaction, valorantUser) => {
    if (interaction.customId === "login-ssid-modal") {
        await defer(interaction, true);
        let input = interaction.fields.getTextInputValue("ssid-input")?.trim() || "";
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
            console.log(`${interaction.user.tag} logged in as ${user.username} using SSID modal`);
            embed = basicEmbed(s(interaction).info.LOGGED_IN.f({ u: user.username }));
        } else {
            console.log(`${interaction.user.tag} SSID modal login failed`);
            embed = basicEmbed(s(interaction).error.INVALID_COOKIES);
        }

        return await interaction.followUp({
            embeds: [embed],
            ephemeral: true
        });
    }
}
