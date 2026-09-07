# AGENTS.md

## Repository Overview

**ValorantStoreCheck** (`valorant-store-bot`, based on [SkinPeek](https://github.com/giorgi-o/SkinPeek)) is an advanced Node.js Discord bot designed to interact with Riot Games' VALORANT APIs. It allows Discord users to inspect their daily store offerings, accessory stores, featured bundles, and Night Market without launching the game client. It also supports skin alert notifications, multi-account switching, store appearance statistics, and custom storefront graphic banner generation.

The repository has been customized with enhancements for **Web/Shared Hosting Keep-Alive (Anti-Sleep)**, modern **SSID cookie-based authentication** (bypassing Cloudflare Turnstile / hCaptcha), and high-resolution **Canvas banner rendering**.

---

## Technical Stack & Runtime

- **Runtime:** Node.js (v18+ recommended; utilizes native ES Modules `"type": "module"`)
- **Framework & Libraries:**
  - `discord.js` (v14.16+): Discord Gateway bot client, Slash commands, Modals, Action Rows, Embeds.
  - `@napi-rs/canvas` (v0.1.65+): High-performance native Skia-based canvas for generating store banners.
  - `express` (v4.21+): Embedded keep-alive HTTP server for host health checks and UptimeRobot monitoring.
  - `axios` (v1.7+) & native `fetch`: HTTP client for Riot client authentication and unofficial Valorant APIs.
  - `dotenv` (v16.4+): Environment variable management via `.env`.
  - `node-cron` (v3.0.0): Task scheduler for version checks, skin catalogue updates, and daily alert notifications.
  - `unofficial-valorant-api` & `fuzzysort`: Skin metadata and fuzzy search algorithms.

---

## Directory Structure & Architecture

```
ValorantStoreCheck/
├── SkinPeek.js               # Main process entry point (loads config, HTTP keepalive, bot client)
├── sharding.js               # Discord ShardingManager for high-scale multi-shard deployments
├── package.json              # Project dependencies, scripts, and ESM definition
├── .env.example              # Sample environment variables (DISCORD_TOKEN, PORT, etc.)
├── config.json.example       # Sample bot configuration file
├── Dockerfile                # Container build instructions (Node 18 Alpine)
├── docker-compose.yml        # Docker compose service definition
│
├── discord/                  # Discord bot logic
│   ├── bot.js                # Discord client initialization, slash & prefix command handlers, events
│   ├── embed.js              # Discord embed layout builders and UI responses
│   ├── alerts.js             # Daily store alert scheduler and notification dispatcher
│   ├── authManager.js        # Auth state coordination and queue resolution
│   └── emoji.js              # Custom server emoji uploader & VP/Radianite icon manager
│
├── valorant/                 # Riot Games API & User Session Management
│   ├── auth.js               # User authentication, token refreshing, cookie extraction
│   ├── authQueue.js          # Queue mechanism to throttle concurrent authentication attempts
│   ├── accountSwitcher.js    # Multi-account data storage, profile switching logic
│   ├── shop.js               # Daily store, night market, bundle, and accessory fetchers
│   ├── shopManager.js        # Shop queue coordination to avoid Riot rate-limits
│   ├── cache.js              # Caching for skin definitions, prices, and weapon tiers
│   ├── inventory.js          # User skin collection inspection
│   ├── battlepass.js         # Battlepass progress and tier calculator
│   └── profile.js            # User rank, MMR, and account details
│
├── services/                 # Auxiliary services
│   ├── canvasBanner.js       # 2x2 grid storefront image generator using @napi-rs/canvas
│   └── database.js           # SQLite storage adapter & query manager (better-sqlite3)
│
├── misc/                     # Utilities & configuration helpers
│   ├── config.js             # Config loader with .env fallback and defaults synchronization
│   ├── keepAliveServer.js    # Lightweight Express server (/health endpoint) for keep-alive
│   ├── languages.js          # Internationalization (i18n) and localized text helpers
│   ├── logger.js             # Console, rotating file & Discord channel log dispatcher
│   ├── multiqueue.js         # Generic rate-limiting queue implementation
│   ├── rateLimit.js          # Riot API rate limit backoff and strike tracker
│   ├── settings.js           # User configuration manager (privacy, notifications)
│   ├── shardMessage.js       # Inter-shard communication bridge
│   ├── stats.js              # Store skin frequency and appearance statistics
│   └── util.js               # Shared utility functions (token decoding, cookies parser, etc.)
│
├── languages/                # Translation JSON files for multi-language bot support
├── assets/                   # Static assets (fonts, icons, fallback images)
└── data/                     # Local storage runtime directory (gitignored: users, cache, logs)
```

---

## Key Customizations & Architecture Patterns

### 1. Web Hosting & HTTP Keep-Alive Integration
- **Context:** Cloud and VPS hosting environments shut down idle Node.js processes if they do not receive incoming HTTP traffic.
- **Solution:**
  - `misc/keepAliveServer.js` starts an Express server immediately upon `SkinPeek.js` startup.
  - Endpoints:
    - `GET /`: Returns a status text indicating the bot is running.
    - `GET /health`: Returns JSON with server status, process uptime, memory usage, and ISO timestamp (compatible with UptimeRobot or Cron pings).
  - Gateway resiliency in `SkinPeek.js` logs shard disconnections and auto-reconnects, backed by global `unhandledRejection` and `uncaughtException` listeners.

### 2. Modern Riot Authentication (SSID Cookie & Web Portal)
- **Context:** Riot Games enforces Cloudflare Turnstile and hCaptcha on username/password login endpoints, causing traditional credentials-based login scripts to fail.
- **Solution:**
  - `/login` command in `discord/bot.js` provides:
    1. **Web Portal Link Button:** Generates a 10-minute one-time cryptographic token (`misc/sessionStore.js`) and opens a responsive Valorant-themed SPA portal (`misc/webPortalHtml.js`) on `GET /auth/login?token=...`.
    2. **Direct Modal Button:** For power users wanting to paste the `ssid` cookie directly in Discord without leaving the app.
  - The Web Portal includes:
    - 1-click Riot Login launcher in a new tab.
    - **1-Click Browser Extension (`extension/`):** Manifest V3 extension with 1-click SSID clipboard copy, auto-detection, and direct `/api/auth/submit` sync without touching DevTools (F12). Downloadable directly via `/download/extension`.
    - Drag-and-drop 1-click Helper Bookmarklet to auto-extract and send the Riot session back to the portal.
    - Input area for pasting `ssid` or redirected auth URL.
    - Live authentication status via `POST /api/auth/submit` and `GET /api/auth/status`.
  - Avoids sending plaintext passwords and completely bypasses Cloudflare challenge screens.

### 3. Visual Storefront Banner Rendering (`CanvasBannerService`)
- **Context:** Delivering 4 separate Discord embeds can be visually cluttered and rate-limited.
- **Solution:**
  - `services/canvasBanner.js` compiles the 4 daily offers into a single 1200x720 PNG image (2x2 grid).
  - Cards feature rarity color bars, scaled weapon renders, weapon names, and VP prices.
  - Attached via `discord.js` `AttachmentBuilder` and rendered inside the main store embed in `discord/embed.js`.

### 4. Dual Configuration Strategy (`.env` + `config.json`)
- Configuration is loaded via `misc/config.js`.
- If `config.json` is missing or has default placeholder tokens, the system gracefully falls back to `process.env.DISCORD_TOKEN`.
- Server port defaults to `process.env.PORT || 3000`.

### 5. Dual Storage Engine (Flat JSON vs SQLite Database)
- **Context:** High-concurrency deployments face disk I/O bottlenecks and file-locking race conditions when reading hundreds of user JSON files sequentially for alerts.
- **Solution:**
  - `services/database.js` provides an opt-in, high-performance SQLite engine using `better-sqlite3`.
  - Stores `users` (accounts, settings, alerts) and `shop_cache` (store offers with TTL) with WAL mode enabled.
  - Fully backward compatible with `databaseType: "json"` (default).
  - Automatic migration on startup if SQLite is enabled and empty, plus standalone CLI: `npm run migrate:sqlite`.

---

## Configuration & Environment Variables

### Environment Variables (`.env`)
```bash
# Discord Bot Credentials
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_client_id_here

# Web Server Port & Environment
PORT=3000
NODE_ENV=production
PUBLIC_URL=http://localhost:3000

# Valorant Defaults
DEFAULT_REGION=ap

# Database Storage Option ('json' or 'sqlite')
DATABASE_TYPE=json
SQLITE_PATH=data/database.sqlite
```

### Key Parameters in `config.json`
- `token`: Discord Bot Token (overridden by `DISCORD_TOKEN` if specified).
- `ownerId`: Discord User ID or Guild ID allowed to run admin commands (`!deploy`, `!config`, etc.).
- `databaseType`: Storage backend (`"json"` or `"sqlite"`).
- `sqlitePath`: Path to SQLite database file (default `"data/database.sqlite"`).
- `useShopCache`: Enable caching daily store offers to minimize Riot API calls.
- `useShopQueue` / `useLoginQueue`: Enable queues to avoid Riot API 429 rate limiting.
- `fetchSkinPrices` / `fetchSkinRarities`: Enhance shop data with pricing and tier colors.
- `refreshSkins`: Cron expression to periodically refresh skin definitions from Riot endpoints.
- `checkGameVersion`: Cron expression to poll Valorant client version updates.

---

## Operational Commands

### Discord Slash Commands
| Command | Description |
| :--- | :--- |
| `/shop [user]` | Displays the daily 4-skin store (renders 2x2 canvas banner). |
| `/accessoryshop [user]` | Displays current weekly Accessory Store offers (Kingdom Credits). |
| `/bundles` | Displays currently active featured weapon bundles. |
| `/bundle [bundle]` | Inspects a specific bundle's contents and price. |
| `/nightmarket` | Views current Night Market discounts (when active). |
| `/balance` | Checks Valorant Points (VP), Radianite Points (RP), and Kingdom Credits (KC). |
| `/alert [skin]` | Sets up a notification when a specific skin appears in the shop. |
| `/alerts` | Lists and manages active skin alerts. |
| `/testalerts` | Tests bot message delivery and permissions in current channel. |
| `/login [ssid]` | Securely logs in using a Riot session `ssid` cookie or opens Web Portal modal. |
| `/cookies [cookies]` | Alternative login using full Riot cookie header string. |
| `/settings` | Toggles privacy and bot settings (view / set). |
| `/account [account]` | Switches between saved accounts (supports up to 5-10 accounts). |
| `/accounts` | Lists all linked Riot accounts for the Discord user. |
| `/collection [weapon]`| Inspects owned weapon skins (supports all weapons including Bandit and Outlaw). |
| `/battlepass` | Displays battlepass progress and XP calculator. |
| `/stats [skin]` | Shows appearance frequency statistics for skins in daily stores. |
| `/valstatus` | Checks current Riot Games server status. |
| `/profile [user]` | Displays rank, MMR, and player card (requires `HDEV_TOKEN`). |
| `/update` | Refreshes username and region stored in the bot. |
| `/logout [account]` | Logs out of a specific or current account. |
| `/forget [account]` | Permanently deletes account and cached data from the bot. |
| `/info` | Displays bot status, uptime, server count, and shard info. |
| `/help` | Displays a complete interactive command and feature guide. |

### Admin Prefix Commands
Commands require bot mention (e.g., `@Bot !command`) and require the author ID to match `config.ownerId`.
- `!deploy guild`: Instantly deploys slash commands to the current Discord guild.
- `!deploy global`: Deploys slash commands globally across all guilds.
- `!undeploy [guild|global]`: Clears deployed application commands.
- `!config read`: Dumps loaded configuration (redacting tokens).
- `!config reload`: Reloads and reapplies settings from disk.
- `!clearcache`: Clears `data/shopCache` and `data/skins.json` and refetches skin definitions.
- `!forcealerts`: Manually triggers daily alert check routines across all users.
- `!logs [file]`: Displays the last 15 log lines or attaches the full `bot.log` file directly in Discord.

---

## Agent Guidelines & Development Rules

When making modifications or adding features to this repository, AI agents and developers must strictly follow these rules:

1. **Module System & JavaScript Standards:**
   - Always use modern ECMAScript Modules (`import` / `export`). CommonJS `require()` will fail (`"type": "module"` is configured in `package.json`).
   - Use Node.js async/await syntax. Avoid unhandled promises or blocking operations.

2. **Discord Interaction Handling:**
   - Discord slash commands must respond or acknowledge within **3 seconds**.
   - Always call `await defer(interaction, isEphemeral)` before long-running tasks (such as Riot API authentication or canvas banner rendering).
   - Use `ephemeral: true` for all sensitive account operations (`/login`, `/cookies`, `/forget`, `/account`).

3. **Riot API Rate Limits & Etiquette:**
   - Riot endpoints strictly rate-limit authentication and store requests.
   - Do **NOT** bypass `authQueue.js` or `shopManager.js`. Always utilize the existing request queues.
   - Store responses should be cached in `data/shopCache` when possible to avoid repeated requests during the same 24-hour cycle.

4. **Security & Data Privacy:**
   - Never log user credentials, auth tokens (`rso`, `idt`, `ent`), or `ssid` cookies to the console or Discord channels.
   - Ensure `config.json`, `.env`, and all contents inside `data/` remain strictly excluded from git tracking.
   - When printing configuration, always redact sensitive tokens (refer to `!config read` implementation in `discord/bot.js`).

5. **Canvas & Asset Operations:**
   - Storefront graphic rendering belongs in `services/canvasBanner.js`. Keep UI rendering separated from Discord message builder logic (`discord/embed.js`).
   - Always enclose image loading (`loadImage`) inside `try/catch` blocks with suitable fallback handling if Riot CDN assets are temporarily unreachable.

6. **Deployment & Container Consistency:**
   - If introducing new top-level directories (similar to `services/`), update `Dockerfile` to include the appropriate `COPY` instruction before `RUN npm i`.
   - Ensure keepalive handlers remain intact so hosting environments do not sleep.

---

## Getting Started

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
cp config.json.example config.json
# Populate DISCORD_TOKEN in .env or token in config.json

# 3. Update Valorant assets (weapons, skins, bundles, currencies)
npm run update:assets

# 4. Start the bot
npm start
# or: node SkinPeek.js
```

### Docker Deployment
```bash
docker-compose up -d --build
```

### Diagnostic Tool

Run the diagnostic script inside container or locally:

```bash
npm run diag
# or: node diag.js
```

