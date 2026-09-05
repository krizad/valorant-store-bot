import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VIEWS_DIR = path.resolve(__dirname, "../views");

export const DEFAULT_PORTAL_LANG = "en";

// Load translations from views/translations.json
let translationsData = {};
try {
    const rawJson = fs.readFileSync(path.join(VIEWS_DIR, "translations.json"), "utf-8");
    translationsData = JSON.parse(rawJson);
} catch (err) {
    console.error("[WebPortal] Failed to load translations.json, using fallback:", err.message);
    translationsData = {
        en: {
            code: "en",
            name: "English",
            flag: "🇬🇧",
            pageTitle: "VALORANT Store Check — Official Web Gateway",
            brandTitle: "VALORANT STORE CHECK",
            brandSubtitle: "RIOT SIGN-ON AUTHENTICATION GATEWAY",
            securityBadge: "Official Riot Sign-On (RSO) • End-to-End Encrypted • Zero Password Storage",
            connectingTo: "Linking Riot account to Discord ID:",
            defaultUser: "Discord Operative",
            step1Num: "01",
            step1Title: "AUTHENTICATE VIA RIOT GAMES",
            step1Desc: "Click below to sign in directly through the official Riot Games login portal in a secure window.",
            step1Btn: "Sign In with Riot Games",
            step1Hint: "Official auth.riotgames.com OAuth endpoint",
            step2Num: "02",
            step2Title: "CONFIRM AUTHENTICATION",
            step2Notice: "<b>Verification Process:</b> After signing in, Riot will redirect to an authorization callback URL containing your temporary access token. Simply paste that URL or token below to complete linkage.",
            tabUrl: "Paste Callback URL / Token",
            tabBookmarklet: "1-Click Bookmarklet (PC)",
            addressBarMockupLabel: "Browser Address Bar Example:",
            addressBarMockupText: "playvalorant.com/opt_in#access_token=...",
            addressBarMockupTip: "Copy the entire URL from your browser's address bar after login",
            inputLabel: "Paste Redirect URL, Access Token, or SSID Cookie:",
            inputPlaceholder: "Paste the redirected URL (https://playvalorant.com/opt_in#access_token=...) or ssid cookie here...",
            tokenDetectedSuccess: "✓ Valid Riot Authentication Token Detected",
            tokenDetectedSsid: "✓ Valid Riot SSID Session Cookie Detected",
            bookmarkletTitle: "⚡ Desktop 1-Click Extraction Tool",
            bookmarkletHint: "Drag this button to your browser Bookmarks Bar. After completing Riot login, click the bookmark once to instantly transfer your session.",
            bookmarkletBtn: "⚡ Link Valorant Session",
            submitBtn: "AUTHORIZE & CONNECT ACCOUNT",
            successTitle: "AUTHENTICATION VERIFIED",
            successSubtitle: "Connected to VALORANT Network as:",
            successTag: "VERIFIED OPERATIVE",
            successHint: "Your Riot session has been successfully encrypted and linked.<br>You may now return to Discord and use <b>/shop</b> to view your daily offerings.",
            bookmarkletAlertNotRiot: "Please open the Riot login page (Step 1) first. Once authenticated, click this bookmark.",
            bookmarkletAlertNoToken: "Authentication token not found. Please complete login on the Riot page, then click this bookmark again.",
            bookmarkletAlertError: "Authentication error: ",
            emptyInputError: "Please paste your callback URL, access token, or SSID cookie.",
            verifyingStatus: "⏳ Verifying cryptographic signature with Riot Games...",
            failStatus: "Authentication failed. The token may be invalid or expired. Please sign in again.",
            networkError: "Network gateway communication error: ",
            expiredTitle: "SESSION EXPIRED OR INVALID",
            expiredSubtitle: "GATEWAY TIMEOUT / INVALID TOKEN",
            expiredDesc: "This one-time authentication link has either expired (10-minute security window) or has already been used.<br><br>Please initiate a new session by running <b>/login</b> in Discord.",
            expiredBtn: "Return to Discord",
            selectLang: "Language"
        }
    };
}

export const PORTAL_TRANSLATIONS = translationsData;

// Cached HTML templates
let cachedLoginTemplate = null;
let cachedExpiredTemplate = null;

function getLoginTemplate() {
    if (!cachedLoginTemplate) {
        cachedLoginTemplate = fs.readFileSync(path.join(VIEWS_DIR, "login.html"), "utf-8");
    }
    return cachedLoginTemplate;
}

function getExpiredTemplate() {
    if (!cachedExpiredTemplate) {
        cachedExpiredTemplate = fs.readFileSync(path.join(VIEWS_DIR, "expired.html"), "utf-8");
    }
    return cachedExpiredTemplate;
}

/**
 * Register a new portal language dynamically at runtime
 * @param {string} code - Language code (e.g. 'ja', 'es', 'de')
 * @param {object} translation - Translation dictionary object
 */
export function registerPortalLanguage(code, translation) {
    if (!code || typeof translation !== "object") return;
    PORTAL_TRANSLATIONS[code] = {
        ...PORTAL_TRANSLATIONS[DEFAULT_PORTAL_LANG],
        ...translation,
        code
    };
}

/**
 * Helper to normalize language code (e.g. 'en-US' -> 'en', 'th-TH' -> 'th')
 */
export function normalizeLangCode(langCode) {
    if (!langCode || typeof langCode !== "string") return DEFAULT_PORTAL_LANG;
    const clean = langCode.trim().toLowerCase();
    if (PORTAL_TRANSLATIONS[clean]) return clean;
    const base = clean.split("-")[0].split("_")[0];
    if (PORTAL_TRANSLATIONS[base]) return base;
    return DEFAULT_PORTAL_LANG;
}

/**
 * Renders the responsive HTML for the Valorant Store Check Web Authentication Portal
 */
export function renderWebPortalHtml({ session, publicUrl = "", lang = "" }) {
    const riotAuthUrl = "https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&scope=account%20openid&nonce=1";

    const initialLang = normalizeLangCode(lang || session?.lang);
    const t = PORTAL_TRANSLATIONS[initialLang] || PORTAL_TRANSLATIONS[DEFAULT_PORTAL_LANG];

    // Language options HTML for <select>
    const langOptionsHtml = Object.keys(PORTAL_TRANSLATIONS).map(code => {
        const item = PORTAL_TRANSLATIONS[code];
        const isSelected = code === initialLang ? "selected" : "";
        return `<option value="${code}" ${isSelected}>${item.flag} ${item.name}</option>`;
    }).join("\n                        ");

    // Bookmarklet initial script
    const bookmarkletScript = createBookmarkletCode(publicUrl, session.token, initialLang, t);

    const userAvatar = session.userTag ? escapeHtml(session.userTag.charAt(0).toUpperCase()) : "U";
    const userName = escapeHtml(session.userTag || t.defaultUser);
    const userHint = `${escapeHtml(t.connectingTo)} ${escapeHtml(session.userId)}`;

    let html = getLoginTemplate();

    const replacements = {
        "{{INITIAL_LANG}}": initialLang,
        "{{PAGE_TITLE}}": escapeHtml(t.pageTitle),
        "{{BRAND_TITLE}}": escapeHtml(t.brandTitle),
        "{{BRAND_SUBTITLE}}": escapeHtml(t.brandSubtitle || "AUTHENTICATION GATEWAY"),
        "{{SECURITY_BADGE}}": escapeHtml(t.securityBadge || "Official Riot Sign-On • End-to-End Encrypted"),
        "{{USER_AVATAR}}": userAvatar,
        "{{USER_NAME}}": userName,
        "{{USER_HINT}}": userHint,
        "{{STEP1_NUM}}": escapeHtml(t.step1Num || "01"),
        "{{STEP1_TITLE}}": escapeHtml(t.step1Title),
        "{{STEP1_DESC}}": escapeHtml(t.step1Desc),
        "{{STEP1_BTN}}": escapeHtml(t.step1Btn),
        "{{STEP1_HINT}}": escapeHtml(t.step1Hint || "Official Riot Games endpoint"),
        "{{RIOT_AUTH_URL}}": riotAuthUrl,
        "{{STEP2_NUM}}": escapeHtml(t.step2Num || "02"),
        "{{STEP2_TITLE}}": escapeHtml(t.step2Title),
        "{{STEP2_NOTICE}}": t.step2Notice,
        "{{TAB_URL}}": escapeHtml(t.tabUrl || "Paste URL / Token"),
        "{{TAB_BOOKMARKLET}}": escapeHtml(t.tabBookmarklet || "1-Click Bookmarklet (PC)"),
        "{{ADDRESS_BAR_MOCKUP_LABEL}}": escapeHtml(t.addressBarMockupLabel || "Address Bar Example:"),
        "{{ADDRESS_BAR_MOCKUP_TEXT}}": escapeHtml(t.addressBarMockupText || "playvalorant.com/opt_in#access_token=..."),
        "{{ADDRESS_BAR_MOCKUP_TIP}}": escapeHtml(t.addressBarMockupTip || "Copy URL from browser"),
        "{{INPUT_LABEL}}": escapeHtml(t.inputLabel),
        "{{INPUT_PLACEHOLDER}}": escapeHtml(t.inputPlaceholder),
        "{{SUBMIT_BTN}}": escapeHtml(t.submitBtn),
        "{{BOOKMARKLET_TITLE}}": escapeHtml(t.bookmarkletTitle),
        "{{BOOKMARKLET_HINT}}": escapeHtml(t.bookmarkletHint),
        "{{BOOKMARKLET_SCRIPT}}": bookmarkletScript,
        "{{BOOKMARKLET_BTN}}": escapeHtml(t.bookmarkletBtn),
        "{{SUCCESS_TITLE}}": escapeHtml(t.successTitle),
        "{{SUCCESS_SUBTITLE}}": escapeHtml(t.successSubtitle),
        "{{SUCCESS_TAG}}": escapeHtml(t.successTag || "VERIFIED OPERATIVE"),
        "{{SUCCESS_HINT}}": t.successHint,
        "{{LANG_OPTIONS}}": langOptionsHtml,
        "{{TRANSLATIONS_JSON}}": JSON.stringify(PORTAL_TRANSLATIONS),
        "{{PUBLIC_URL}}": publicUrl,
        "{{SESSION_TOKEN}}": session.token,
        "{{SESSION_USER_ID}}": session.userId
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
        html = html.split(placeholder).join(value);
    }

    return html;
}

/**
 * Helper to construct the bookmarklet javascript: URI string
 */
function createBookmarkletCode(publicUrl, token, lang, t) {
    const alertNotRiot = (t.bookmarkletAlertNotRiot || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const alertNoToken = (t.bookmarkletAlertNoToken || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const alertErr = (t.bookmarkletAlertError || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

    return `javascript:(function(){try{var href=window.location.href;if(href.indexOf('access_token=')!==-1){window.location.href='${publicUrl}/auth/login?token=${token}&lang=${lang}&redirect_url='+encodeURIComponent(href);return;}var c=document.cookie.match(/(?:^|;\\s*)ssid=([^;]*)/);if(c&&c[1]){window.location.href='${publicUrl}/auth/login?token=${token}&lang=${lang}&ssid='+encodeURIComponent(c[1]);return;}if(href.indexOf('/auth/login')!==-1||href.indexOf('localhost')!==-1){alert('${alertNotRiot}');}else{alert('${alertNoToken}');}}catch(e){alert('${alertErr}'+e.message);}})();`;
}

/**
 * Renders an error page when token is invalid or expired
 */
export function renderExpiredOrInvalidHtml(errorMessage = null, lang = DEFAULT_PORTAL_LANG) {
    const resolvedLang = normalizeLangCode(lang);
    const t = PORTAL_TRANSLATIONS[resolvedLang] || PORTAL_TRANSLATIONS[DEFAULT_PORTAL_LANG];
    const displayTitle = errorMessage || t.expiredTitle;

    let html = getExpiredTemplate();

    const replacements = {
        "{{INITIAL_LANG}}": resolvedLang,
        "{{PAGE_TITLE}}": escapeHtml(displayTitle) + " — VALORANT Store Check",
        "{{DISPLAY_TITLE}}": escapeHtml(displayTitle),
        "{{EXPIRED_SUBTITLE}}": escapeHtml(t.expiredSubtitle || "GATEWAY TIMEOUT / INVALID TOKEN"),
        "{{EXPIRED_DESC}}": t.expiredDesc,
        "{{EXPIRED_BTN}}": escapeHtml(t.expiredBtn || "Return to Discord")
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
        html = html.split(placeholder).join(value);
    }

    return html;
}

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
