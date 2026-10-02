# 🧩 VALORANT Store — Session Helper (Chrome Extension)

Manifest V3 helper extension for the **ValorantStoreCheck** Discord bot.
It grabs your Riot Games **`ssid` session cookie** in one click and sends it to the bot's Web
Authentication Portal — no DevTools (F12), no Cookie-Editor needed.

## 📥 Install (Chrome / Edge / Brave)

1. Download `valorant-store-helper.zip` — either from the bot's Web Portal
   (**Extension** tab → **📥 Download Extension**) or directly from
   `<your-bot-url>/download/extension`.
2. Extract the ZIP to a folder you'll keep (don't delete it after installing —
   Chrome loads the extension from this folder).
3. Open `chrome://extensions` in your browser.
4. Turn on **Developer mode** (toggle in the top-right corner).
5. Click **Load unpacked** and select the extracted folder.
6. Pin the extension (puzzle-piece icon 🧩 → pin) so it's one click away.

## 🚀 Usage

### Option A — Sync from the Web Portal (recommended)

1. In Discord run **`/login`** and click **Login via Web Portal**.
2. Keep that portal tab open, then open a new tab and log in at
   [account.riotgames.com](https://account.riotgames.com/).
3. Go back to the **portal tab** — it shows **"Extension Detected"**.
4. Press **Sync Now** — the extension reads your `ssid` cookie and submits it to
   the portal for you. You'll see the success screen right away.

### Option B — 1-Click copy

1. Click the extension icon while on any `auth.riotgames.com` /
   `account.riotgames.com` page where you are logged in.
2. Your `ssid` value is copied to the clipboard — paste it into the portal input,
   or into the **Enter SSID Directly** modal in Discord.

## 🔒 Security notes

- The extension only reads the **`ssid` cookie** for Riot Games domains
  (`auth.riotgames.com`, `account.riotgames.com`, `playvalorant.com`) — nothing else.
- Your `ssid` is sent **only** to your own bot instance's `/api/auth/submit`
  endpoint (the same server that served you this extension).
- `ssid` is equivalent to being logged in to your Riot account. **Never share it**
  with anyone, and only use it with a bot you trust and host yourself.
- The bot stores it locally in its own `data/` directory and only talks to official
  Riot endpoints with it.

## 🛠 For bot hosts

The ZIP served at `/download/extension` is built from this folder:

```bash
npm run package:extension   # -> assets/valorant-store-helper.zip
```

The build uses the system `zip` command when available and falls back to a pure
Node.js ZIP builder otherwise (Windows, minimal Docker images, shared hosts).
