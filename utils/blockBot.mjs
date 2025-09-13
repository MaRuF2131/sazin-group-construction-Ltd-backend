// browserOnlyMiddleware.mjs
// Middleware to allow only browser requests
// Features:
// 1. Checks static hidden token (for simple bot block)
// 2. Supports dynamic per-session token (short-lived, set via JS)
// 3. Can be combined with session cookies

import crypto from "crypto";

// ----------------------
// CONFIGURATION
// ----------------------
const STATIC_HIDDEN_TOKEN = process.env.STATIC_HIDDEN_TOKEN || "my_static_secret"; // hidden in frontend JS
const DYNAMIC_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_COOKIE_NAME = "sess"; // your session cookie name

// In-memory store for simplicity (use Redis or DB in production)
const dynamicTokenStore = new Map();

// ----------------------
// Generate dynamic token
// ----------------------
export function generateDynamicToken(sessionId) {
  const token = crypto.randomBytes(16).toString("hex");
  const expires = Date.now() + DYNAMIC_TOKEN_EXPIRY_MS;
  dynamicTokenStore.set(token, { sessionId, expires });
  return token;
}

// ----------------------
// Validate dynamic token
// ----------------------
function validateDynamicToken(token, sessionId) {
  if (!token) return false;
  const data = dynamicTokenStore.get(token);
  if (!data) return false;
  if (data.sessionId !== sessionId) return false;
  if (data.expires < Date.now()) {
    dynamicTokenStore.delete(token);
    return false;
  }
  return true;
}

// ----------------------
// Middleware
// ----------------------
export function browserOnlyMiddleware(options = {}) {
  const {
    requireSessionCookie = SESSION_COOKIE_NAME,
    staticTokenHeader = "x-static-token",
    dynamicTokenHeader = "x-dynamic-token",
    logger = (lvl, msg, meta) => console.log(lvl, msg, meta || {}),
  } = options;

  return (req, res, next) => {
    try {
      const sessionCookie = req.cookies ? req.cookies[requireSessionCookie] : null;
      const staticToken = req.headers[staticTokenHeader];
      const dynamicToken = req.headers[dynamicTokenHeader];

      // 1️⃣ Allow if static token matches
      if (staticToken && staticToken === STATIC_HIDDEN_TOKEN) {
        return next();
      }

      // 2️⃣ Allow if session cookie + dynamic token matches
      if (sessionCookie && validateDynamicToken(dynamicToken, sessionCookie)) {
        return next();
      }

      // 3️⃣ Optional: Log blocked request
      logger("warn", "Blocked non-browser request", {
        ip: req.ip || req.connection.remoteAddress,
        path: req.path,
        ua: req.headers["user-agent"],
        headers: {
          staticToken: staticToken || null,
          dynamicToken: dynamicToken || null,
          sessionCookie: sessionCookie || null,
        },
      });

      // Block request
      return res.status(403).json({ error: "Forbidden" });
    } catch (err) {
      return res.status(403).json({ error: "Forbidden" });
    }
  };
}

// ----------------------
// Helper: middleware route to issue dynamic token
// ----------------------
export function issueDynamicTokenRoute(req, res) {
  const sessionCookie = req.cookies ? req.cookies[SESSION_COOKIE_NAME] : null;
  if (!sessionCookie) return res.status(403).json({ error: "No session cookie" });

  const token = generateDynamicToken(sessionCookie);
  return res.json({ dynamicToken: token });
}
