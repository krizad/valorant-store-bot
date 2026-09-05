<div align="center">

# 🎯 ValorantStoreCheck

**An advanced, modern VALORANT Daily Store & Inventory Discord Bot.**  
*Featuring high-resolution 2x2 Canvas storefront banners, modern SSID Cookie & Web Portal authentication (bypassing Cloudflare Turnstile), multi-account switching, daily skin alerts, and cloud/shared-hosting keep-alive resiliency.*

[![Node.js](https://img.shields.io/badge/Node.js-18%20%7C%2020%20%7C%2022-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14.16+-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=flat-square)](https://www.gnu.org/licenses/gpl-3.0)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

[Features](#-key-features) • [Attribution](#-upstream-project--original-attribution) • [3rd-Party APIs](#-third-party-apis--credits) • [Quick Start](#-installation--quick-start) • [Configuration](#-configuration--environment-variables) • [Commands](#-slash-commands-reference) • [FAQ](#-security--faq)

---

</div>

## 🌟 Key Features

**ValorantStoreCheck** allows Discord users and gaming communities to inspect their daily VALORANT store offerings, accessory stores, featured weapon bundles, and Night Market without launching the VALORANT game client.

### ✨ What makes this version special?
- 🖼️ **2x2 Visual Canvas Banner**: Automatically composites the 4 daily shop skins into a clean, high-resolution graphic card with weapon renders, rarity color borders, and VP prices using `@napi-rs/canvas`.
- 🔐 **Modern SSID & Web Login Portal**: Overcomes Riot's Cloudflare Turnstile & hCaptcha challenges. Users can authenticate in 1 click via our responsive Web Auth Portal (`/auth/login`) with an auto-extract bookmarklet, or paste their `ssid` cookie directly in Discord.
- 🔄 **Multi-Account Switching**: Save up to 5–10 accounts per Discord user (`/account` and `/accounts`) and switch between them instantly.
- ⏰ **Cloud & Server Anti-Sleep**: Integrated Express keep-alive HTTP server (`GET /health`), keeping the bot online 24/7 on Railway, Render, VPS, or cloud hosts.
- 🪙 **Kingdom Credits & Outlaw Support**: Full support for `/accessoryshop` (Kingdom Credits), the Outlaw sniper rifle, and updated weapon classes.
- 🔔 **Intelligent Daily Skin Alerts**: Get pinged the exact moment your dream skin appears in your daily shop (`/alert`).

---

## 🍴 Upstream Project & Original Attribution

**ValorantStoreCheck** is an independent, heavily modified and modernized project maintained by **[KriZad](https://github.com/krizad)**, originally derived from the open-source bot **[SkinPeek](https://github.com/giorgi-o/SkinPeek)** created by **[giorgi-o (Giorgio)](https://github.com/giorgi-o)**.

- **Maintainer & Enhancements:** [KriZad](https://github.com/krizad)
- **Original Upstream Repository:** [SkinPeek on GitHub](https://github.com/giorgi-o/SkinPeek)
- **Original Creator:** [giorgi-o (Giorgio)](https://github.com/giorgi-o)
- **License:** [GNU General Public License v3.0 (GPL-3.0)](LICENSE)
- **Legal Notice:** Detailed copyright and modification tracking in [NOTICE](NOTICE)

### Key Improvements & Enhancements in ValorantStoreCheck
1. **Cloudflare Challenge Bypass & Web Auth Portal:** Traditional username/password logins frequently fail due to Cloudflare Turnstile/hCaptcha on `auth.riotgames.com`. We introduced a session store, one-time auth tokens, and a web login portal with an extraction bookmarklet.
2. **Native Skia Canvas Rendering:** Integrated `@napi-rs/canvas` to render beautiful storefront composite images instead of multiple cluttered text embeds.
3. **Embedded HTTP Server & Health Monitoring:** Added an embedded Express HTTP server (`GET /health`) for UptimeRobot monitoring, external pings, and process health checks.
4. **HenrikDev Profile Integration:** Seamlessly integrated `/profile` using Henrik-3's API to display live MMR, competitive tier, and player card.

---

## 🔌 Third-Party APIs & Credits

ValorantStoreCheck relies on several outstanding third-party APIs, community documentation projects, and libraries:

| API / Service | Author / Maintainer | Reference Links | Usage in Bot |
| :--- | :--- | :--- | :--- |
| **Valorant-API** | **[Valorant-API.com](https://valorant-api.com/)** | • [Website](https://valorant-api.com/)<br>• [API Docs / Dashboard](https://dash.valorant-api.com/)<br>• [GitHub Org](https://github.com/Valorant-API)<br>• [Discord Support](https://discord.com/invite/9V5MWgD) | Fetches weapon skins, skin chromas/levels, bundles, weapon tiers, buddies, sprays, cards, titles, missions, and currency icons. |
| **Unofficial Valorant API** | **[Henrik-3 (HenrikDev)](https://github.com/Henrik-3)** | • [API Portal](https://api.henrikdev.xyz/)<br>• [API Key Dashboard](https://api.henrikdev.xyz/dashboard/)<br>• [GitHub](https://github.com/Henrik-3/unofficial-valorant-api)<br>• [npm Package](https://www.npmjs.com/package/unofficial-valorant-api) | Powers `/profile` to retrieve player rank, MMR history, competitive tiers, and account details. |
| **VALORANT Client API Docs** | **[techchrism](https://github.com/techchrism)** | • [Online Documentation](https://valapidocs.techchrism.me/)<br>• [GitHub](https://github.com/techchrism/valorant-api-docs) | Complete specification and documentation for unofficial Riot Games Client PVP and Storefront endpoints. |
| **Riot Games Client APIs** | **Riot Games** *(Unofficial Client)* | • [Riot Developer Portal](https://developer.riotgames.com/)<br>• [Client Endpoint Docs](https://valapidocs.techchrism.me/) | Riot Sign-On (RSO), token entitlements, daily storefront offers (`/store/v3/storefront`), wallet balances, and user inventory. |
| **Discord.js** | **[discord.js team](https://github.com/discordjs)** | • [Documentation](https://discord.js.org/)<br>• [GitHub](https://github.com/discordjs/discord.js)<br>• [npm Package](https://www.npmjs.com/package/discord.js) | Discord Gateway client library, slash command interactions, buttons, modals, and embeds. |
| **@napi-rs/canvas** | **[Brooooooklyn (napi-rs)](https://github.com/Brooooooklyn)** | • [GitHub](https://github.com/Brooooooklyn/canvas)<br>• [npm Package](https://www.npmjs.com/package/@napi-rs/canvas) | High-performance Skia canvas rendering engine for fast storefront graphic generation. |

### Community Inspirations & Contributors
- **[teoobarca (Hamper)](https://github.com/teoobarca)**: Author of [Valorant-item-shop-discord-bot](https://github.com/teoobarca/Valorant-item-shop-discord-bot), the original inspiration for checking Valorant stores via Discord.
- **[muckelba](https://github.com/muckelba)**: Author of the Battlepass XP calculation logic.
- **[sanjaybaskaran01](https://github.com/sanjaybaskaran01)**: Creator of Valorina, inspiration for embed styling.
- **[warriorzz](https://github.com/warriorzz)**: Initial Docker setup contributor.

---

## 🚀 Installation & Quick Start

You can run ValorantStoreCheck on **Local PC**, **VPS / Dedicated Server**, or **Docker**.

### Prerequisites
1. **Node.js** v18.0.0 or newer (v20 LTS or v22 LTS recommended).
2. A **Discord Bot Application**:
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications).
   - Click **New Application** and give it a name.
   - Go to the **Bot** tab, click **Add Bot**, and copy the **Bot Token**.
   - Under **Privileged Gateway Intents**, enable **Message Content Intent** (if using prefix commands).
   - Go to **OAuth2 -> URL Generator**, select `bot` and `applications.commands` scopes.
   - Select permissions: `Send Messages`, `Embed Links`, `Attach Files`, `Use External Emojis`, `Create Public Threads`.
   - Use the generated link to invite the bot to your Discord server.

---

### Option 1: Standard Local / VPS Setup

```bash
# 1. Clone this repository
git clone https://github.com/krizad/valorant-store-bot.git
cd valorant-store-bot

# 2. Install dependencies
npm install

# 3. Setup configuration (.env)
cp .env.example .env
# Edit .env and paste your DISCORD_TOKEN and CLIENT_ID

# 4. Download latest Valorant assets (currencies, icons)
npm run update:assets

# 5. Start the bot
npm start
```

---

### Option 2: Docker Quick Start (Pre-built Image - Recommended)

Run the pre-built image directly from GitHub Container Registry (`ghcr.io/krizad/valorant-store-bot:latest`) without cloning the repository or compiling anything:

#### Method A: Standalone `docker run`
```bash
# 1. Create a directory and setup environment
mkdir -p valorant-bot/data && cd valorant-bot
curl -sO https://raw.githubusercontent.com/krizad/valorant-store-bot/master/.env.example
cp .env.example .env
# Edit .env and enter your DISCORD_TOKEN and CLIENT_ID

# 2. Pull and start the container
docker run -d \
  --name valorant_store_bot \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/usr/app/data \
  --env-file .env \
  ghcr.io/krizad/valorant-store-bot:latest

# 3. View live logs
docker logs -f valorant_store_bot
```

#### Method B: Standalone `docker-compose.yml`
Create a `docker-compose.yml` file:
```yaml
version: '3.8'

services:
  bot:
    image: ghcr.io/krizad/valorant-store-bot:latest
    container_name: valorant_store_bot
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:3000"
    env_file:
      - .env
    volumes:
      - ./data:/usr/app/data
```
Run:
```bash
docker compose up -d
docker compose logs -f
```

---

### Option 3: Build from Source with Docker Compose

For developers who cloned this repository and want to build custom container images locally:

```bash
# 1. Clone repository
git clone https://github.com/krizad/valorant-store-bot.git
cd valorant-store-bot

# 2. Setup environment
cp .env.example .env
# Fill in DISCORD_TOKEN and CLIENT_ID in .env

# 3. Build container directly from current source code and launch
docker compose up -d --build
# or using npm script:
# npm run docker:up

# 4. View live logs
docker compose logs -f
# or: npm run docker:logs

# Optional: Live development mode (mounts local code directly without rebuilding)
docker compose -f docker-compose.dev.yml up -d
```

---

## ⚙️ Configuration & Environment Variables

The bot uses a dual configuration system: environment variables (`.env`) for deployment credentials and `config.json` for fine-grained bot behavior.

### Environment Variables (`.env`)
```bash
# Discord Credentials (REQUIRED)
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here

# Web Server & Keep-Alive
PORT=3000
NODE_ENV=production
PUBLIC_URL=http://localhost:3000

# Valorant Defaults
DEFAULT_REGION=ap

# Optional: HenrikDev Token for /profile (https://api.henrikdev.xyz/dashboard/)
HDEV_TOKEN=
```

### Key Parameters in `config.json`
| Parameter | Default | Description |
| :--- | :--- | :--- |
| `ownerId` | `""` | Discord User ID of the bot owner (authorized for `!deploy` commands). |
| `useStoreBanner` | `false` | When `true`, uses the Canvas 2x2 banner generator in `/shop`. |
| `maxAccountsPerUser` | `5` | Maximum number of linked Riot accounts per Discord user. |
| `useShopQueue` | `true` | Throttles concurrent shop requests to prevent Riot 429 rate limits. |
| `refreshSkins` | `"10 0 0 * * *"` | Cron schedule to automatically refresh skin cache from Valorant-API. |
| `checkGameVersion` | `"*/15 * * * *"` | Cron schedule to poll for new Valorant game updates. |

---

## 🎮 Slash Commands Reference

### User Commands
| Command | Description |
| :--- | :--- |
| `/shop [user]` | Displays the daily 4-skin storefront (with optional 2x2 Canvas banner). |
| `/accessoryshop [user]` | Displays weekly Accessory Store offers (Kingdom Credits). |
| `/bundles` | Lists all currently active featured weapon bundles. |
| `/bundle [bundle]` | Inspects the contents, prices, and weapon previews for a specific bundle. |
| `/nightmarket` | Views your current Night Market discount cards (when active in-game). |
| `/balance` | Checks your current Valorant Points (VP), Radianite (RP), and Kingdom Credits (KC). |
| `/alert [skin]` | Sets an alert to notify you when a specific skin appears in your daily shop. |
| `/alerts` | Lists, manages, and removes your active skin alerts. |
| `/testalerts` | Tests bot notification permissions and message delivery in the current channel. |
| `/login [ssid]` | Securely logs in using a Riot session `ssid` cookie or opens the Web Auth Portal. |
| `/cookies [cookies]` | Alternative login using the raw Riot cookie header string. |
| `/account [account]` | Switches the active account (supports up to 5–10 accounts). |
| `/accounts` | Displays all linked Riot accounts for your Discord profile. |
| `/collection [weapon]`| Inspects your owned skin collection for a weapon (including Outlaw). |
| `/battlepass` | Displays battlepass tier progress and XP completion calculator. |
| `/stats [skin]` | Displays historical store appearance statistics for weapon skins. |
| `/valstatus` | Checks server operational status across Riot regions. |
| `/profile [user]` | Displays competitive rank, MMR, and player card (requires `HDEV_TOKEN`). |
| `/update` | Refreshes your Riot ID and region stored in the bot. |
| `/settings` | Toggles privacy settings (such as hiding your username from embeds). |
| `/logout [account]` | Logs out of a specific or active account. |
| `/forget [account]` | Permanently deletes account data and cached tokens from the bot. |
| `/info` | Displays bot status, uptime, server count, and shard information. |
| `/help` | Shows an interactive guide to all commands and features. |

### Admin Prefix Commands
*Requires author ID to match `ownerId` in configuration.*
- `@Bot !deploy guild` — Deploys slash commands instantly to the current server.
- `@Bot !deploy global` — Deploys slash commands globally across all Discord servers.
- `@Bot !undeploy [guild|global]` — Removes deployed application commands.
- `@Bot !config read` — Displays current configuration settings (with secrets redacted).
- `@Bot !config reload` — Reloads `config.json` settings from disk without restarting.
- `@Bot !clearcache` — Clears cached storefronts and refetches skin catalogs.
- `@Bot !forcealerts` — Manually triggers the daily skin alert check routine.

---

## 🔒 Security & FAQ

### Can I get banned for using this bot?
**No.** ValorantStoreCheck only reads data from Riot's standard storefront and inventory endpoints that the VALORANT game client itself calls. It does not modify game memory, inject files, or interact with active game matches in any way.

### How does login authentication work?
Riot Games requires Cloudflare Turnstile verification on username/password endpoints, which automated bots cannot complete. Instead, ValorantStoreCheck uses the **Riot Session `ssid` Cookie**:
1. You log in to the official Riot website ([playvalorant.com](https://playvalorant.com/)) in your normal browser.
2. The bot generates a 10-minute temporary auth token and opens a secure Web Portal (`/auth/login`).
3. You use our 1-click helper bookmarklet to send the `ssid` cookie to the bot.
4. The bot exchanges this cookie directly with `auth.riotgames.com` to receive short-lived access tokens.

### Are my credentials safe?
- Your passwords are **never** required.
- User data, tokens, and cookies are stored **locally** inside `data/users/` on your bot host and are strictly excluded from git tracking.
- Tokens are only ever transmitted directly between your bot instance and official Riot Games endpoints. No third-party servers ever receive your data.

---

## 🛠️ Diagnostics & Troubleshooting

If you encounter issues during installation or deployment, run the diagnostic script:

```bash
# Run the built-in system check
npm run diag
# or: node diag.js
```

This verifies:
- File and directory integrity
- Read/write permissions for the `data/` directory
- Node.js version and native Skia canvas bindings
- Environment variables and Discord gateway token validity

---

## 📄 License & Acknowledgements

- **License:** Distributed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).
- **Author & Maintainer:** [KriZad](https://github.com/krizad).
- **Attribution & Notice:** Derived from [SkinPeek](https://github.com/giorgi-o/SkinPeek) by [giorgi-o (Giorgio)](https://github.com/giorgi-o). See [NOTICE](NOTICE) for detailed attribution and change history.
- **Trademarks:** Game assets and trademarks belong to **© Riot Games, Inc.** VALORANT and Riot Games are trademarks or registered trademarks of Riot Games, Inc. This project is an independent community project and is not affiliated with or endorsed by Riot Games.
