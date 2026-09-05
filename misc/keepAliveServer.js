import express from "express";
import { getLoginSession, updateLoginSession } from "./sessionStore.js";
import { renderWebPortalHtml, renderExpiredOrInvalidHtml } from "./webPortalHtml.js";
import { queueCookiesLogin, queueRedirectUrlLogin } from "../valorant/authQueue.js";
import { waitForAuthQueueResponse } from "../discord/authManager.js";
import { getUser } from "../valorant/auth.js";
import { resolvePublicUrl } from "./config.js";

/**
 * Creates and starts a lightweight HTTP server for health monitoring,
 * external uptime pings (e.g. UptimeRobot) to prevent idle spindown/sleep,
 * and the Web Authentication Portal.
 */
export function startKeepAliveServer(port = process.env.PORT || 3000, getBotStatus = null) {
    const app = express();

    app.use(express.json());

    // Health-check endpoint for UptimeRobot / cron pings
    app.get("/health", (req, res) => {
        const botStatus = typeof getBotStatus === "function" ? getBotStatus() : {};
        res.status(200).json({
            status: "alive",
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            memory: process.memoryUsage(),
            bot: botStatus
        });
    });

    app.get("/", (req, res) => {
        res.status(200).send("<h3>Valorant Store Discord Bot is running (HTTP Keep-Alive Active).</h3>");
    });

    // Web Authentication Portal Page
    app.get(["/auth", "/auth/login"], (req, res) => {
        const token = req.query.token;
        const lang = req.query.lang || "en";
        const session = getLoginSession(token);

        if (!session) {
            return res.status(400).send(renderExpiredOrInvalidHtml(null, lang));
        }

        const publicUrl = resolvePublicUrl(req);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.status(200).send(renderWebPortalHtml({ session, publicUrl, lang }));
    });

    // Web Portal Submission Endpoint
    app.post("/api/auth/submit", async (req, res) => {
        const { token, cookies: rawCookies, lang = "en" } = req.body || {};
        const isTh = lang === "th";

        if (!token) {
            return res.status(400).json({ success: false, error: isTh ? "ไม่พบเซสชันโทเคน" : "Missing session token" });
        }

        const session = getLoginSession(token);
        if (!session) {
            return res.status(400).json({
                success: false,
                error: isTh
                    ? "เซสชันหมดอายุหรือไม่ถูกต้อง กรุณากด /login ใน Discord อีกครั้ง"
                    : "Session expired or invalid. Please run /login in Discord again."
            });
        }

        let input = (rawCookies || "").trim();
        if (!input) {
            return res.status(400).json({
                success: false,
                error: isTh
                    ? "กรุณาระบุ URL ที่ล็อกอินสำเร็จ หรือ ssid cookie"
                    : "Please provide a valid login URL or ssid cookie."
            });
        }

        try {
            let authResult;
            if (input.includes("access_token=") || input.startsWith("http://") || input.startsWith("https://")) {
                authResult = await queueRedirectUrlLogin(session.userId, input);
            } else {
                if (!input.includes("=")) {
                    input = `ssid=${input}`;
                }
                authResult = await queueCookiesLogin(session.userId, input);
            }

            if (authResult?.inQueue) authResult = await waitForAuthQueueResponse(authResult);

            const user = getUser(session.userId);
            if (authResult?.success && user) {
                updateLoginSession(token, {
                    status: "success",
                    username: user.username
                });
                console.log(`[WebPortal] User ${session.userTag} (${session.userId}) authenticated successfully as ${user.username}`);
                return res.status(200).json({ success: true, username: user.username });
            } else {
                updateLoginSession(token, {
                    status: "failed",
                    error: authResult?.error || "Invalid auth data"
                });
                return res.status(400).json({
                    success: false,
                    error: isTh
                        ? "เข้าสู่ระบบไม่สำเร็จ ข้อมูลไม่ถูกต้องหรือโทเคนหมดอายุแล้ว กรุณาลองใหม่อีกครั้ง"
                        : "Login failed. Invalid authentication data or token expired. Please try again."
                });
            }
        } catch (e) {
            console.error("[WebPortal] Error during web auth submission:", e);
            return res.status(500).json({
                success: false,
                error: isTh ? "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: " + e.message : "Internal server error: " + e.message
            });
        }
    });

    // Session Status Check Endpoint
    app.get("/api/auth/status", (req, res) => {
        const token = req.query.token;
        const session = getLoginSession(token);
        if (!session) {
            return res.status(200).json({ status: "expired" });
        }
        res.status(200).json({
            status: session.status,
            username: session.username,
            error: session.error
        });
    });

    const server = app.listen(port, () => {
        console.log(`[Keep-Alive] HTTP server listening on port ${port}`);
    });

    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.warn(`[Keep-Alive] Port ${port} is in use, retrying on alternative or continuing...`);
        } else {
            console.error("[Keep-Alive] HTTP server error:", err);
        }
    });

    return server;
}
