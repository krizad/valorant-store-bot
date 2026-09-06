/**
 * VALORANT Store - Session Helper
 * Background Service Worker (Manifest V3)
 */

async function getRiotSsidCookie() {
    try {
        // Priority 1: Check auth.riotgames.com directly
        let cookie = await chrome.cookies.get({
            url: "https://auth.riotgames.com",
            name: "ssid"
        });

        if (cookie && cookie.value) {
            return { success: true, ssid: cookie.value };
        }

        // Priority 2: Check all riotgames.com domain cookies
        const cookies = await chrome.cookies.getAll({
            domain: "riotgames.com",
            name: "ssid"
        });

        if (cookies && cookies.length > 0 && cookies[0].value) {
            return { success: true, ssid: cookies[0].value };
        }

        // Priority 3: Check playvalorant.com
        cookie = await chrome.cookies.get({
            url: "https://playvalorant.com",
            name: "ssid"
        });

        if (cookie && cookie.value) {
            return { success: true, ssid: cookie.value };
        }

        return {
            success: false,
            error: "NOT_FOUND"
        };
    } catch (err) {
        return {
            success: false,
            error: err.message || String(err)
        };
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_SSID") {
        getRiotSsidCookie().then(sendResponse);
        return true; // Keep message channel open for async response
    }

    if (request.action === "SUBMIT_TO_BOT") {
        (async () => {
            const { portalUrl, token, ssid, lang } = request;
            if (!portalUrl || !token || !ssid) {
                return { success: false, error: "Missing required parameters" };
            }

            try {
                const endpoint = `${portalUrl.replace(/\/+$/, "")}/api/auth/submit`;
                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        token,
                        cookies: ssid,
                        lang: lang || "th"
                    })
                });

                const data = await res.json();
                return data;
            } catch (err) {
                return {
                    success: false,
                    error: err.message || "Failed to reach bot server"
                };
            }
        })().then(sendResponse);
        return true;
    }
});
