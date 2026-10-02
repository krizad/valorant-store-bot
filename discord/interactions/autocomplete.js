// autocomplete interactions (/alert, /stats, /bundle, /account, /logout, /forget)
import { searchSkin, searchBundle } from "../../valorant/cache.js";
import { readUserJson } from "../../valorant/accountSwitcher.js";
import config from "../../misc/config.js";
import { DEFAULT_VALORANT_LANG, discToValLang, s } from "../../misc/languages.js";
import fuzzysort from "fuzzysort";

export const handleAutocompleteInteraction = async (interaction) => {
        try {
            // console.log("Received autocomplete interaction from " + interaction.user.tag);
            if (interaction.commandName === "alert" || interaction.commandName === "stats") {
                const focusedValue = interaction.options.getFocused();
                const searchResults = await searchSkin(focusedValue, interaction.locale, 5);

                await interaction.respond(searchResults.map(result => ({
                    name: result.obj.names[discToValLang[interaction.locale] || DEFAULT_VALORANT_LANG],
                    value: result.obj.names[DEFAULT_VALORANT_LANG],
                })));
            } else if (interaction.commandName === "bundle") {

                const focusedValue = interaction.options.getFocused();
                const searchResults = await searchBundle(focusedValue, interaction.locale, 5);

                await interaction.respond(searchResults.map(result => ({
                    name: result.obj.names[discToValLang[interaction.locale] || DEFAULT_VALORANT_LANG],
                    value: result.obj.names[DEFAULT_VALORANT_LANG],
                })));
            } else if (interaction.commandName === "account" || interaction.commandName === "forget" || interaction.commandName === "logout") {
                const focusedValue = interaction.options.getFocused();

                const userJson = readUserJson(interaction.user.id);
                if (!userJson) return await interaction.respond([]);

                const values = [];
                for (const [index, account] of Object.entries(userJson.accounts)) {
                    const username = account.username || s(interaction).info.NO_USERNAME;
                    if (values.find(a => a.name === username)) continue;

                    values.push({
                        name: username,
                        value: (parseInt(index) + 1).toString()
                    });
                }

                const filteredValues = fuzzysort.go(focusedValue, values, {
                    key: "name",
                    threshold: -1000,
                    limit: config.maxAccountsPerUser <= 10 ? config.maxAccountsPerUser : 10,
                    all: true
                });

                await interaction.respond(filteredValues.map(value => value.obj));
            }
        } catch (e) {
            console.error(e);
            // await handleError(e, interaction); // unknown interaction happens quite often
        }
}
