/**
 * VALORANT Store - Session Helper
 * Content Script (Injected on Web Portal pages)
 */

(function () {
    // Notify the Web Portal DOM that the extension is installed and ready
    document.documentElement.dataset.valorantHelperInstalled = "true";
    window.dispatchEvent(new CustomEvent("valorant-helper-ready", {
        detail: { version: "1.0.0" }
    }));

    // Listen for requests from the Web Portal page
    window.addEventListener("message", async (event) => {
        if (event.source !== window || !event.data || !event.data.type) return;

        if (event.data.type === "VALORANT_STORE_GET_SSID") {
            try {
                chrome.runtime.sendMessage({ action: "GET_SSID" }, (response) => {
                    window.postMessage({
                        type: "VALORANT_STORE_SSID_RESPONSE",
                        data: response
                    }, "*");
                });
            } catch (err) {
                window.postMessage({
                    type: "VALORANT_STORE_SSID_RESPONSE",
                    data: { success: false, error: err.message }
                }, "*");
            }
        }

        if (event.data.type === "VALORANT_STORE_AUTO_LOGIN") {
            try {
                const { portalUrl, token, lang } = event.data;
                chrome.runtime.sendMessage({ action: "GET_SSID" }, (cookieRes) => {
                    if (!cookieRes || !cookieRes.success || !cookieRes.ssid) {
                        window.postMessage({
                            type: "VALORANT_STORE_LOGIN_RESULT",
                            data: { success: false, error: "NO_SSID" }
                        }, "*");
                        return;
                    }

                    chrome.runtime.sendMessage({
                        action: "SUBMIT_TO_BOT",
                        portalUrl: portalUrl || window.location.origin,
                        token,
                        ssid: cookieRes.ssid,
                        lang: lang || "th"
                    }, (submitRes) => {
                        window.postMessage({
                            type: "VALORANT_STORE_LOGIN_RESULT",
                            data: submitRes
                        }, "*");
                    });
                });
            } catch (err) {
                window.postMessage({
                    type: "VALORANT_STORE_LOGIN_RESULT",
                    data: { success: false, error: err.message }
                }, "*");
            }
        }
    });
})();
