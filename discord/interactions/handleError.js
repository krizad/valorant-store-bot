// shared error responder for interaction handlers
import { basicEmbed } from "../embed.js";
import { s } from "../../misc/languages.js";

export const handleError = async (e, interaction) => {
    const message = s(interaction).error.GENERIC_ERROR.f({ e: e.message });
    try {
        const embed = basicEmbed(message);
        if (interaction.deferred) await interaction.followUp({ embeds: [embed], ephemeral: true });
        else await interaction.reply({ embeds: [embed], ephemeral: true });
        console.error(e);
    } catch (e2) {
        console.error("There was a problem while trying to handle an error!\nHere's the original error:");
        console.error(e);
        console.error("\nAnd here's the error while trying to handle it:");
        console.error(e2);
    }
}
