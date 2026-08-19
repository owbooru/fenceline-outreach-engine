/**
 * Access Gate — Server-side password enforcement.
 *
 * Replaces the client-side password check. The password is stored in
 * APP_ACCESS_PASSWORD env var. The client submits the password to
 * POST /api/access/login, and receives a signed JWT session cookie.
 * All /api/trpc routes are protected by this cookie via Express middleware.
 */
import type { Express, Request, Response, NextFunction } from "express";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";
import { getSessionCookieOptions } from "./_core/cookies";

const ACCESS_COOKIE = "fenceline_access";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

async function signAccessToken(): Promise<string> {
  const expirationSeconds = Math.floor((Date.now() + SESSION_DURATION_MS) / 1000);
  return new SignJWT({ access: "granted", iat: Math.floor(Date.now() / 1000) })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSecret());
}

async function verifyAccessToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return payload.access === "granted";
  } catch {
    return false;
  }
}

/**
 * Register the login/logout/status endpoints and the access middleware.
 */
export function registerAccessGate(app: Express) {
  // POST /api/access/login — validate password, issue cookie
  app.post("/api/access/login", async (req: Request, res: Response) => {
    const { password } = req.body || {};
    const correctPassword = process.env.APP_ACCESS_PASSWORD;

    if (!correctPassword) {
      // If no password is configured, deny all access (fail-closed)
      res.status(503).json({ error: "Access password not configured on server." });
      return;
    }

    if (password !== correctPassword) {
      res.status(401).json({ error: "Incorrect password." });
      return;
    }

    const token = await signAccessToken();
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(ACCESS_COOKIE, token, { ...cookieOptions, maxAge: SESSION_DURATION_MS });
    res.json({ success: true });
  });

  // POST /api/access/logout — clear the cookie
  app.post("/api/access/logout", (_req: Request, res: Response) => {
    res.clearCookie(ACCESS_COOKIE, { path: "/" });
    res.json({ success: true });
  });

  // GET /api/access/status — check if the current cookie is valid
  app.get("/api/access/status", async (req: Request, res: Response) => {
    const token = parseCookie(req, ACCESS_COOKIE);
    const valid = await verifyAccessToken(token);
    res.json({ authenticated: valid });
  });
}

/**
 * Express middleware that blocks /api/trpc requests unless the access cookie is valid.
 * Tracking routes (/api/track/*) are excluded because they serve open/click pixels
 * and unsubscribe pages that must work without authentication.
 */
export function accessGateMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip non-API routes (static assets, HTML)
    if (!req.path.startsWith("/api/")) return next();

    // Skip access endpoints themselves
    if (req.path.startsWith("/api/access/")) return next();

    // Skip tracking routes (open pixel, click redirect, unsubscribe)
    if (req.path.startsWith("/api/track/")) return next();

    // Skip health endpoint (unauthenticated monitoring)
    if (req.path === "/api/health") return next();

    // Skip OAuth callback
    if (req.path.startsWith("/api/oauth/")) return next();

    // Skip storage proxy
    if (req.path.startsWith("/manus-storage/")) return next();

    // Verify access cookie
    const token = parseCookie(req, ACCESS_COOKIE);
    const valid = await verifyAccessToken(token);
    if (!valid) {
      res.status(401).json({ error: "Access denied. Please log in." });
      return;
    }

    next();
  };
}

function parseCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const match = header.split(";").find(c => c.trim().startsWith(`${name}=`));
  if (!match) return undefined;
  return match.split("=").slice(1).join("=").trim();
}
