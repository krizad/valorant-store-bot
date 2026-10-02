// Slash command definitions (pure data) — deployed to Discord by bot.js / adminCommands.js
import { ApplicationCommandOptionType } from "discord.js";
import { WeaponType } from "../misc/weaponTypes.js";
import { settingIsVisible, settingName, settings } from "../misc/settings.js";

const settingsChoices = [];
setTimeout(() => {
    for (const setting of Object.keys(settings).filter(settingIsVisible)) {
        settingsChoices.push({
            name: settingName(setting),
            value: setting
        });
    }
});

export const commands = [
    {
        name: "shop",
        description: "Show your current daily shop!",
        descriptionLocalizations: {
            th: "แสดงร้านค้าประจำวันของคุณ (พร้อมแบนเนอร์รูป 2x2)"
        },
        options: [{
            type: ApplicationCommandOptionType.User,
            name: "user",
            description: "Optional: see the daily shop of someone else!",
            descriptionLocalizations: {
                th: "ตัวเลือกเพิ่มเติม: ดูร้านค้าของเพื่อน"
            },
            required: false
        }]
    },
    {
        name: "accessoryshop",
        description: "Show current weekly Accessory Store offers (Kingdom Credits)!",
        descriptionLocalizations: {
            th: "แสดงร้านค้าอุปกรณ์ประจำสัปดาห์ (Kingdom Credits)"
        },
        options: [{
            type: ApplicationCommandOptionType.User,
            name: "user",
            description: "Optional: see the accessory shop of someone else!",
            descriptionLocalizations: {
                th: "ตัวเลือกเพิ่มเติม: ดูร้านค้าอุปกรณ์ของเพื่อน"
            },
            required: false
        }]
    },
    {
        name: "bundles",
        description: "Show the current featured bundle(s).",
        descriptionLocalizations: {
            th: "แสดงคอลเลคชั่นบันเดิลพิเศษที่กำลังวางขาย"
        }
    },
    {
        name: "bundle",
        description: "Inspect a specific bundle",
        descriptionLocalizations: {
            th: "ตรวจสอบรายละเอียดและราคาของบันเดิลที่ระบุ"
        },
        options: [{
            type: ApplicationCommandOptionType.String,
            name: "bundle",
            description: "The name of the bundle you want to inspect!",
            descriptionLocalizations: {
                th: "ชื่อของบันเดิลที่คุณต้องการตรวจสอบ"
            },
            required: true,
            autocomplete: true
        }]
    },
    {
        name: "nightmarket",
        description: "Show your Night Market if there is one.",
        descriptionLocalizations: {
            th: "แสดงร้านค้าตลาดกลางคืน Night Market ของคุณ"
        }
    },
    {
        name: "balance",
        description: "Show how many VALORANT Points & Radianite you have in your account!",
        descriptionLocalizations: {
            th: "แสดงยอดเงินคงเหลือ (VP, Radianite, Kingdom Credits)"
        }
    },
    {
        name: "alert",
        description: "Set an alert for when a particular skin is in your shop.",
        descriptionLocalizations: {
            th: "ตั้งการแจ้งเตือนเมื่อสกินที่ต้องการเข้ามาในร้านค้า"
        },
        options: [{
            type: ApplicationCommandOptionType.String,
            name: "skin",
            description: "The name of the skin you want to set an alert for",
            descriptionLocalizations: {
                th: "ชื่อสกินที่คุณต้องการให้แจ้งเตือน"
            },
            required: true,
            autocomplete: true
        }]
    },
    {
        name: "alerts",
        description: "Show all your active alerts!",
        descriptionLocalizations: {
            th: "แสดงและจัดการรายการแจ้งเตือนสกินทั้งหมดของคุณ"
        }
    },
    {
        name: "testalerts",
        description: "Make sure alerts are working for your account and in this channel",
        descriptionLocalizations: {
            th: "ทดสอบการส่งแจ้งเตือนและสิทธิ์ของบอทในช่องนี้"
        }
    },
    {
        name: "login",
        description: "Log in securely via Web Portal or Riot SSID cookie (avoids Cloudflare/Captcha)!",
        descriptionLocalizations: {
            th: "เข้าสู่ระบบอย่างปลอดภัยผ่าน Web Portal หรือ SSID Cookie (ข้าม Cloudflare/Captcha)"
        },
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "ssid",
                description: "Optional: Your ssid cookie. If omitted, Web Portal and Modal options appear.",
                descriptionLocalizations: {
                    th: "ตัวเลือกเพิ่มเติม: กรอก ssid cookie (หากเว้นว่าง จะมีปุ่ม Web Portal ให้ล็อกอิน)"
                },
                required: false
            }
        ]
    },
    {
        name: "update",
        description: "Update your username/region in the bot.",
        descriptionLocalizations: {
            th: "อัปเดตชื่อผู้ใช้และภูมิภาคบัญชีในบอท"
        }
    },
    {
        name: "cookies",
        description: "Log in directly with your cookies header (alternative method)",
        descriptionLocalizations: {
            th: "เข้าสู่ระบบด้วย Riot Cookie โดยตรง"
        },
        options: [{
            type: ApplicationCommandOptionType.String,
            name: "cookies",
            description: "Your auth.riotgames.com cookie header",
            descriptionLocalizations: {
                th: "ค่า Header Cookie จาก auth.riotgames.com"
            },
            required: true
        }]
    },
    {
        name: "settings",
        description: "Change your settings with the bot, or view your current settings",
        descriptionLocalizations: {
            th: "เปลี่ยนหรือดูการตั้งค่าของคุณกับบอท"
        },
        options: [{
            name: "view",
            description: "See your current settings",
            descriptionLocalizations: {
                th: "ดูการตั้งค่าปัจจุบันของคุณ"
            },
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: "set",
            description: "Change one of your settings with the bot",
            descriptionLocalizations: {
                th: "เปลี่ยนการตั้งค่าของคุณในบอท"
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [{
                name: "setting",
                description: "The name of the setting you want to change",
                descriptionLocalizations: {
                    th: "ชื่อของการตั้งค่าที่คุณต้องการเปลี่ยน"
                },
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: settingsChoices
            }]
        }
        ]
    },
    {
        name: "logout",
        description: "Delete your credentials from the bot, but keep your alerts..",
        descriptionLocalizations: {
            th: "ออกจากระบบโดยยังคงเก็บการแจ้งเตือนสกินไว้"
        },
        options: [{
            type: ApplicationCommandOptionType.String,
            name: "account",
            description: "The account you want to logout from. Leave blank to logout of your current account.",
            descriptionLocalizations: {
                th: "บัญชีที่ต้องการออกจากระบบ (เว้นว่างไว้เพื่อออกจากบัญชีปัจจุบัน)"
            },
            required: false,
            autocomplete: true
        }]
    },
    {
        name: "forget",
        description: "Forget and permanently delete your account from the bot.",
        descriptionLocalizations: {
            th: "ลบบัญชีและข้อมูลทั้งหมดออกจากบอทอย่างถาวร"
        },
        options: [{
            type: ApplicationCommandOptionType.String,
            name: "account",
            description: "The account you want to forget. Leave blank to forget all accounts.",
            descriptionLocalizations: {
                th: "บัญชีที่ต้องการลบ (เว้นว่างไว้เพื่อลบทุกบัญชี)"
            },
            required: false,
            autocomplete: true
        }]
    },
    {
        name: "collection",
        description: "Show off your skin collection!",
        descriptionLocalizations: {
            th: "ดูคอลเลคชั่นสกินปืนทั้งหมดในบัญชีของคุณ"
        },
        options: [{
            type: ApplicationCommandOptionType.String,
            name: "weapon",
            description: "Optional: see all your skins for a specific weapon",
            descriptionLocalizations: {
                th: "ตัวเลือกเพิ่มเติม: ดูเฉพาะสกินของอาวุธที่ระบุ"
            },
            required: false,
            choices: Object.values(WeaponType).map(weaponName => ({
                name: weaponName,
                value: weaponName,
            })),
        },
        {
            type: ApplicationCommandOptionType.User,
            name: "user",
            description: "Optional: see someone else's collection!",
            descriptionLocalizations: {
                th: "ตัวเลือกเพิ่มเติม: ดูคอลเลคชั่นของเพื่อน"
            },
            required: false
        }]
    },
    {
        name: "battlepass",
        description: "Calculate battlepass progression.",
        descriptionLocalizations: {
            th: "คำนวณและตรวจสอบความคืบหน้าแบทเทิลพาส"
        },
        options: [{
            type: ApplicationCommandOptionType.Integer,
            name: "maxlevel",
            description: "Enter the level you want to reach",
            descriptionLocalizations: {
                th: "เลเวลแบทเทิลพาสเป้าหมายที่ต้องการคำนวณ"
            },
            required: false,
            minValue: 2,
            maxValue: 55
        }]
    },
    {
        name: "stats",
        description: "See the stats for a skin",
        descriptionLocalizations: {
            th: "ดูสถิติความถี่ที่สกินเคยปรากฏในร้านค้า"
        },
        options: [{
            type: ApplicationCommandOptionType.String,
            name: "skin",
            description: "The name of the skin you want to see the stats of",
            descriptionLocalizations: {
                th: "ชื่อสกินที่ต้องการดูสถิติ"
            },
            required: false,
            autocomplete: true
        }]
    },
    {
        name: "account",
        description: "Switch the Valorant account you are currently using",
        descriptionLocalizations: {
            th: "สลับบัญชี Valorant ที่กำลังใช้งานในบอท"
        },
        options: [{
            type: ApplicationCommandOptionType.String,
            name: "account",
            description: "The account you want to switch to",
            descriptionLocalizations: {
                th: "บัญชีที่ต้องการสลับไปใช้งาน"
            },
            required: true,
            autocomplete: true
        }]
    },
    {
        name: "accounts",
        description: "Show all of your Valorant accounts",
        descriptionLocalizations: {
            th: "แสดงรายชื่อบัญชี Valorant ทั้งหมดที่คุณผูกไว้"
        }
    },
    {
        name: "valstatus",
        description: "Check the status of your account's VALORANT servers",
        descriptionLocalizations: {
            th: "ตรวจสอบสถานะการทำงานของเซิร์ฟเวอร์ Valorant"
        }
    },
    {
        name: "info",
        description: "Show information about the bot",
        descriptionLocalizations: {
            th: "แสดงข้อมูลและสถิติเกี่ยวกับบอท"
        }
    },
    {
        name: "profile",
        description: "Check your VALORANT profile",
        descriptionLocalizations: {
            th: "ตรวจสอบโปรไฟล์และแรงค์ VALORANT ของคุณ"
        },
        options: [{
            type: ApplicationCommandOptionType.User,
            name: "user",
            description: "Optional: see someone else's profile!",
            descriptionLocalizations: {
                th: "ตัวเลือกเพิ่มเติม: ดูโปรไฟล์ของเพื่อน"
            },
            required: false
        }]
    },
    {
        name: "help",
        description: "Show a complete guide to all bot commands and features.",
        descriptionLocalizations: {
            th: "แสดงคู่มือและรายการคำสั่งทั้งหมดของบอท"
        }
    }
];
