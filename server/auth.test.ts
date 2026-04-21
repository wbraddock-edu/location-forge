// Lightweight smoke test for shared Forge persistent auth (cookie-based).
//
// Runs a real Express app instance against a temp SQLite DB, then drives the
// auth endpoints and verifies that:
//   - register + login issue a `forge_session` HttpOnly cookie
//   - /api/auth/me restores the user from the cookie alone (no header)
//   - logout clears the cookie AND invalidates the server session
//   - bearer (X-Session-Id) compatibility still works
//
// Run with: npx tsx server/auth.test.ts

import fs from "fs";
import os from "os";
import path from "path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-auth-test-"));
// db.ts writes `data.db` into RAILWAY_VOLUME_MOUNT_PATH or cwd; point it at
// a scratch dir so the real project DB is never touched.
process.env.RAILWAY_VOLUME_MOUNT_PATH = tmpDir;
process.env.NODE_ENV = "test";

async function main() {
  // Imported after env vars are set so db/sqlite pick up our tmp path.
  const express = (await import("express")).default;
  const { registerRoutes } = await import("./routes");
  const http = await import("http");

  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false }));
  const server = http.createServer(app);
  await registerRoutes(server, app);

  const port = await new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve(typeof addr === "object" && addr ? addr.port : 0);
    });
  });
  const base = `http://127.0.0.1:${port}`;

  let passed = 0;
  let failed = 0;
  const assert = (cond: any, msg: string) => {
    if (cond) { passed++; console.log("  ✓", msg); }
    else { failed++; console.error("  ✗", msg); }
  };

  const extractCookie = (res: Response, name: string): string | null => {
    const setCookies: string[] = [];
    // Node fetch exposes set-cookie via getSetCookie (Node 20+).
    const anyHeaders: any = res.headers;
    if (typeof anyHeaders.getSetCookie === "function") {
      setCookies.push(...anyHeaders.getSetCookie());
    } else {
      const raw = res.headers.get("set-cookie");
      if (raw) setCookies.push(raw);
    }
    for (const c of setCookies) {
      if (c.startsWith(name + "=")) return c;
    }
    return null;
  };

  const cookieValue = (setCookie: string): string => {
    const firstPart = setCookie.split(";")[0];
    return firstPart; // e.g. "forge_session=abc"
  };

  console.log("register:");
  const regRes = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "smoke@example.com", password: "hunter2", displayName: "Smoke" }),
  });
  assert(regRes.ok, "register returns 2xx");
  const regBody: any = await regRes.json();
  assert(typeof regBody.token === "string" && regBody.token.length > 0, "register returns bearer token (bearer compat)");
  const regCookie = extractCookie(regRes, "forge_session");
  assert(!!regCookie, "register sets forge_session cookie");
  assert(!!regCookie && /HttpOnly/i.test(regCookie), "register cookie is HttpOnly");
  assert(!!regCookie && /Path=\//.test(regCookie), "register cookie has Path=/");
  assert(!!regCookie && /SameSite=/i.test(regCookie), "register cookie has SameSite");

  console.log("me via cookie only:");
  const cookieHeader = cookieValue(regCookie || "");
  const meRes = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookieHeader } });
  assert(meRes.ok, "/api/auth/me with cookie returns 2xx");
  const meBody: any = await meRes.json();
  assert(meBody.email === "smoke@example.com", "/me returns the expected user");

  console.log("me with no auth:");
  const meNone = await fetch(`${base}/api/auth/me`);
  assert(meNone.status === 401, "/api/auth/me without cookie/bearer returns 401");

  console.log("bearer compat:");
  const meBearer = await fetch(`${base}/api/auth/me`, { headers: { "X-Session-Id": regBody.token } });
  assert(meBearer.ok, "/api/auth/me with bearer still works");

  console.log("login issues a fresh cookie:");
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "smoke@example.com", password: "hunter2" }),
  });
  assert(loginRes.ok, "login returns 2xx");
  const loginCookie = extractCookie(loginRes, "forge_session");
  assert(!!loginCookie, "login sets forge_session cookie");

  console.log("logout invalidates server session AND clears cookie:");
  const loginBody: any = await loginRes.json();
  const loginCookieHeader = cookieValue(loginCookie || "");
  const logoutRes = await fetch(`${base}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: loginCookieHeader },
  });
  assert(logoutRes.ok, "logout returns 2xx");
  const clearCookie = extractCookie(logoutRes, "forge_session");
  assert(!!clearCookie && /Max-Age=0/i.test(clearCookie), "logout sets Max-Age=0 cookie (clears it)");
  const meAfter = await fetch(`${base}/api/auth/me`, { headers: { Cookie: loginCookieHeader } });
  assert(meAfter.status === 401, "/me after logout returns 401 (server session invalidated)");
  // Bearer for the just-logged-out session should also fail.
  const meAfterBearer = await fetch(`${base}/api/auth/me`, { headers: { "X-Session-Id": loginBody.token } });
  assert(meAfterBearer.status === 401, "bearer for logged-out session also returns 401");

  server.close();
  // Clean up tmp DB.
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
