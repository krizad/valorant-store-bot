import crypto from "crypto";

/**
 * In-memory one-time session store for Discord Web Portal authentication
 */
const sessions = new Map();
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Creates a new one-time login session for a Discord user
 * @param {string} userId - Discord user ID
 * @param {string} userTag - Discord user display name / tag
 * @param {string} userAvatar - Optional Discord avatar URL
 * @returns {object} Session object including one-time token
 */
export function createLoginSession(userId, userTag = "", userAvatar = "") {
    const token = crypto.randomBytes(16).toString("hex");
    const session = {
        token,
        userId,
        userTag,
        userAvatar,
        status: "pending", // 'pending' | 'success' | 'failed'
        error: null,
        username: null,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_TTL_MS
    };
    sessions.set(token, session);
    return session;
}

/**
 * Retrieves a valid, unexpired session by token
 * @param {string} token 
 * @returns {object|null}
 */
export function getLoginSession(token) {
    if (!token || !sessions.has(token)) return null;
    const session = sessions.get(token);
    if (Date.now() > session.expiresAt) {
        sessions.delete(token);
        return null;
    }
    return session;
}

/**
 * Updates a session's state
 * @param {string} token 
 * @param {object} updates 
 * @returns {object|null}
 */
export function updateLoginSession(token, updates = {}) {
    const session = getLoginSession(token);
    if (!session) return null;
    Object.assign(session, updates);
    return session;
}

/**
 * Deletes a session
 * @param {string} token 
 */
export function deleteLoginSession(token) {
    sessions.delete(token);
}

// Garbage collect expired sessions every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions.entries()) {
        if (now > session.expiresAt) {
            sessions.delete(token);
        }
    }
}, 5 * 60 * 1000).unref();
