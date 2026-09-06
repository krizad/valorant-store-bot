/**
 * VALORANT Store - Session Helper
 * Popup Logic
 */

const I18N = {
    th: {
        riotStatus: "สถานะ Riot Games",
        checking: "กำลังตรวจสอบ",
        checkingDesc: "กำลังตรวจหาคุกกี้เซสชัน SSID...",
        detected: "ตรวจพบเซสชัน",
        detectedDesc: "พบคุกกี้ SSID พร้อมใช้งาน (ไม่ต้องเปิด F12)",
        notFound: "ไม่พบเซสชัน",
        notFoundDesc: "ยังไม่พบคุกกี้ SSID กรุณาล็อกอิน Riot ก่อน",
        btnCopy: "📋 คัดลอก SSID (คลิกเดียว)",
        btnCopied: "✅ คัดลอก SSID สำเร็จแล้ว!",
        btnOpenRiot: "🔑 เปิดหน้าล็อกอิน Riot Games",
        tokenLabel: "โทเคนหรือลิงก์จากคำสั่ง /login Discord:",
        tokenPlaceholder: "วางลิงก์ Web Portal หรือ Session Token",
        btnSync: "🚀 ซิงค์เข้า Discord Bot ทันที",
        btnSyncing: "⏳ กำลังซิงค์ข้อมูล...",
        footerHint: "ใช้สำหรับบอท Valorant Store Check ใน Discord",
        errNoSsid: "ไม่พบคุกกี้ SSID กรุณากดล็อกอิน Riot Games ก่อน",
        errNoToken: "กรุณาระบุ Session Token หรือวางลิงก์จาก Discord",
        syncSuccess: (user) => `✅ เชื่อมต่อสำเร็จ! เข้าสู่ระบบในชื่อ: ${user}`,
        syncFailed: (err) => `❌ การเชื่อมต่อล้มเหลว: ${err}`
    },
    en: {
        riotStatus: "Riot Games Status",
        checking: "CHECKING",
        checkingDesc: "Detecting Riot Games SSID cookie...",
        detected: "ACTIVE SESSION",
        detectedDesc: "SSID cookie detected and ready to use.",
        notFound: "NOT LOGGED IN",
        notFoundDesc: "SSID cookie not found. Please login to Riot Games first.",
        btnCopy: "📋 Copy SSID (1-Click)",
        btnCopied: "✅ SSID Copied to Clipboard!",
        btnOpenRiot: "🔑 Open Riot Games Login",
        tokenLabel: "Token or Link from Discord /login:",
        tokenPlaceholder: "Paste Web Portal Link or Session Token",
        btnSync: "🚀 Sync with Discord Bot",
        btnSyncing: "⏳ Synchronizing...",
        footerHint: "Designed for VALORANT Store Discord Bot",
        errNoSsid: "SSID cookie not found. Please log in to Riot Games first.",
        errNoToken: "Please provide a Session Token or paste your Web Portal URL.",
        syncSuccess: (user) => `✅ Linked successfully! Logged in as: ${user}`,
        syncFailed: (err) => `❌ Authentication failed: ${err}`
    }
};

let currentLang = "th";
let currentSsid = null;
let detectedPortalUrl = null;

const langSelect = document.getElementById("lang-select");
const statusCard = document.getElementById("status-card");
const statusBadge = document.getElementById("status-badge");
const statusDesc = document.getElementById("status-desc");
const btnCopy = document.getElementById("btn-copy-ssid");
const btnOpenRiot = document.getElementById("btn-open-riot");
const inputToken = document.getElementById("input-token");
const btnSync = document.getElementById("btn-sync-bot");
const syncMsg = document.getElementById("sync-msg");

function updateTexts() {
    const t = I18N[currentLang];
    document.getElementById("txt-riot-status").textContent = t.riotStatus;
    document.getElementById("txt-token-label").textContent = t.tokenLabel;
    document.getElementById("txt-footer-hint").textContent = t.footerHint;
    document.getElementById("txt-btn-open-riot").textContent = t.btnOpenRiot;
    inputToken.placeholder = t.tokenPlaceholder;

    if (!btnCopy.dataset.copied) {
        document.getElementById("txt-btn-copy").textContent = t.btnCopy;
    }
    if (!btnSync.dataset.syncing) {
        document.getElementById("txt-btn-sync").textContent = t.btnSync;
    }

    if (currentSsid) {
        statusCard.className = "card active";
        statusBadge.className = "status-badge badge-green";
        statusBadge.textContent = t.detected;
        statusDesc.textContent = t.detectedDesc;
        btnOpenRiot.style.display = "none";
        btnCopy.style.display = "flex";
    } else if (currentSsid === false) {
        statusCard.className = "card error";
        statusBadge.className = "status-badge badge-red";
        statusBadge.textContent = t.notFound;
        statusDesc.textContent = t.notFoundDesc;
        btnOpenRiot.style.display = "flex";
        btnCopy.style.display = "none";
    }
}

// Check active tab to see if user is on the Bot Web Portal
async function detectActiveTabInfo() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
            const url = new URL(tab.url);
            if (url.pathname.includes("/auth") || url.searchParams.has("token")) {
                const token = url.searchParams.get("token");
                detectedPortalUrl = `${url.protocol}//${url.host}`;
                if (token && !inputToken.value) {
                    inputToken.value = token;
                }
            }
        }
    } catch (e) {
        // Tab query permission limitation handled gracefully
    }
}

// Request SSID from background worker
function checkSsid() {
    chrome.runtime.sendMessage({ action: "GET_SSID" }, (res) => {
        if (res && res.success && res.ssid) {
            currentSsid = res.ssid;
        } else {
            currentSsid = false;
        }
        updateTexts();
    });
}

// Copy SSID to clipboard
btnCopy.addEventListener("click", async () => {
    if (!currentSsid) return;

    try {
        await navigator.clipboard.writeText(currentSsid);
        btnCopy.dataset.copied = "true";
        btnCopy.classList.add("btn-success");
        document.getElementById("txt-btn-copy").textContent = I18N[currentLang].btnCopied;

        setTimeout(() => {
            delete btnCopy.dataset.copied;
            btnCopy.classList.remove("btn-success");
            document.getElementById("txt-btn-copy").textContent = I18N[currentLang].btnCopy;
        }, 2500);
    } catch (e) {
        console.error("Clipboard write failed:", e);
    }
});

// Open Riot login page
btnOpenRiot.addEventListener("click", () => {
    chrome.tabs.create({
        url: "https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&scope=account%20openid&nonce=1"
    });
});

// Sync with bot
btnSync.addEventListener("click", async () => {
    const t = I18N[currentLang];
    syncMsg.style.display = "none";

    if (!currentSsid) {
        showMsg(t.errNoSsid, "error");
        return;
    }

    let tokenInput = inputToken.value.trim();
    if (!tokenInput) {
        showMsg(t.errNoToken, "error");
        return;
    }

    let portalUrl = detectedPortalUrl;
    let token = tokenInput;

    // If user pasted full URL (e.g. https://bot.valorant.krizad.com/auth/login?token=abc)
    if (tokenInput.startsWith("http://") || tokenInput.startsWith("https://")) {
        try {
            const parsed = new URL(tokenInput);
            portalUrl = `${parsed.protocol}//${parsed.host}`;
            token = parsed.searchParams.get("token") || token;
        } catch (err) {}
    }

    // Default portal URL fallback if not detected
    if (!portalUrl) {
        portalUrl = window.location.origin.includes("chrome-extension")
            ? "https://bot.valorant.krizad.com"
            : window.location.origin;
    }

    btnSync.dataset.syncing = "true";
    document.getElementById("txt-btn-sync").textContent = t.btnSyncing;
    btnSync.disabled = true;

    chrome.runtime.sendMessage({
        action: "SUBMIT_TO_BOT",
        portalUrl,
        token,
        ssid: currentSsid,
        lang: currentLang
    }, (res) => {
        btnSync.disabled = false;
        delete btnSync.dataset.syncing;
        document.getElementById("txt-btn-sync").textContent = t.btnSync;

        if (res && res.success) {
            showMsg(t.syncSuccess(res.username || "Valorant Agent"), "success");
        } else {
            showMsg(t.syncFailed(res?.error || "Connection error"), "error");
        }
    });
});

function showMsg(text, type) {
    syncMsg.textContent = text;
    syncMsg.className = `msg-box msg-${type}`;
    syncMsg.style.display = "block";
}

// Language switch handler
langSelect.addEventListener("change", (e) => {
    currentLang = e.target.value;
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ lang: currentLang });
    }
    updateTexts();
});

// Initialize
if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["lang"], (result) => {
        if (result && result.lang) {
            currentLang = result.lang;
            langSelect.value = currentLang;
        }
        updateTexts();
    });
}

detectActiveTabInfo();
checkSsid();
updateTexts();
