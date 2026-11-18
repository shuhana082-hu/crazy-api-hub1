"use strict";
/**
 * Name Check API – বিক্রির ওয়েবসাইট + API gateway
 * Express + PostgreSQL. ফ্রন্টএন্ড ফাইল: index.html, style.css, app.js (একই ফোল্ডারে)
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const rateLimit = require("express-rate-limit");

// ---------------------------------------------------------------- config
const PORT = Number(process.env.PORT) || 3000;
const DATABASE_URL = process.env.DATABASE_URL || "";
const IS_PROD = process.env.NODE_ENV === "production";
const SITE_NAME_DEFAULT = process.env.SITE_NAME || "NameAPI";
const BEHIND_CF = String(process.env.BEHIND_CLOUDFLARE || "").toLowerCase() === "true";
const KEY_RATE_PER_MIN = Number(process.env.KEY_RATE_PER_MIN) || 120;
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS) || 30000;
const CACHE_TTL_MS = (Number(process.env.CACHE_TTL_SECONDS) || 300) * 1000;
let SESSION_SECRET = process.env.SESSION_SECRET || "";
if (!SESSION_SECRET) {
  SESSION_SECRET = crypto.randomBytes(32).toString("hex");
  console.warn("[warn] SESSION_SECRET সেট করা নেই; রিস্টার্টে সবাই লগআউট হয়ে যাবে। Environment-এ SESSION_SECRET দিন।");
}
// ---------------------------------------------------------------- database
// DATABASE_URL দিলে বাইরের PostgreSQL (Neon/Supabase) ব্যবহার হবে।
// না দিলে সাইটের ভেতরেই চলা PostgreSQL (PGlite) ব্যবহার হবে, ডেটা DATA_DIR ফোল্ডারে থাকবে।
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
let dbAdapter = null;
const dbReady = (async () => {
  if (DATABASE_URL) {
    const { Pool } = require("pg");
    const isLocalDb = /localhost|127\.0\.0\.1/.test(DATABASE_URL);
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: isLocalDb || process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
      max: 10,
    });
    pool.on("error", (e) => console.error("[pg]", e.message));
    console.log("[db] বাইরের PostgreSQL ব্যবহার হচ্ছে");
    return {
      query: (t, p) => pool.query(t, p),
      tx: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const out = await fn(client);
          await client.query("COMMIT");
          return out;
        } catch (e) {
          try { await client.query("ROLLBACK"); } catch {}
          throw e;
        } finally { client.release(); }
      },
      close: () => pool.end(),
    };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new PGlite(DATA_DIR);
  await db.waitReady;
  console.log("[db] ভেতরের ডেটাবেজ ব্যবহার হচ্ছে, ফোল্ডার: " + DATA_DIR);
  const run = (h) => async (text, params) => {
    if (!params || !params.length) { const r = await h.exec(text); return r[r.length - 1] || { rows: [] }; }
    return h.query(text, params);
  };
  return {
    query: run(db),
    tx: (fn) => db.transaction((t) => fn({ query: run(t) })),
    close: () => db.close(),
  };
})();
const q = async (text, params) => (dbAdapter || (dbAdapter = await dbReady)).query(text, params);

// ---------------------------------------------------------------- helpers
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function getIp(req) {
  if (BEHIND_CF && req.headers["cf-connecting-ip"]) return String(req.headers["cf-connecting-ip"]);
  return req.ip || "0.0.0.0";
}
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return "scrypt$" + salt.toString("base64") + "$" + hash.toString("base64");
}
function verifyPassword(pw, stored) {
  try {
    const [, s, h] = String(stored).split("$");
    const hash = crypto.scryptSync(pw, Buffer.from(s, "base64"), 64);
    return crypto.timingSafeEqual(hash, Buffer.from(h, "base64"));
  } catch { return false; }
}
const DUMMY_HASH = hashPassword("dummy-password-for-timing");
const genKey = () => "sh-" + crypto.randomBytes(24).toString("base64url");

function signSession(userId, tv) {
  const exp = Date.now() + 7 * 24 * 3600 * 1000;
  const body = userId + "." + tv + "." + exp;
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return body + "." + sig;
}
function readSession(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 4) return null;
  const [uid, tv, exp, sig] = parts;
  const expect = crypto.createHmac("sha256", SESSION_SECRET).update(uid + "." + tv + "." + exp).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  return { uid: Number(uid), tv: Number(tv) };
}
function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function setSessionCookie(req, res, token, maxAgeSec) {
  const secure = req.secure || req.get("x-forwarded-proto") === "https" || IS_PROD;
  res.setHeader("Set-Cookie",
    "sid=" + encodeURIComponent(token) + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=" + maxAgeSec + (secure ? "; Secure" : ""));
}
const str = (v, max = 200) => String(v == null ? "" : v).trim().slice(0, max);
function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100) / 100;
}
const intIn = (v, min, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : NaN;
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------------------------------------------------------------- schema
async function initDb() {
  await q(`
CREATE TABLE IF NOT EXISTS users(
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  api_key TEXT UNIQUE NOT NULL, key_active BOOLEAN NOT NULL DEFAULT TRUE, banned BOOLEAN NOT NULL DEFAULT FALSE,
  token_version INT NOT NULL DEFAULT 0,
  plan_name TEXT, plan_requests INT NOT NULL DEFAULT 0, plan_used INT NOT NULL DEFAULT 0, plan_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_login TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS packages(
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', price NUMERIC(12,2) NOT NULL,
  requests INT NOT NULL, days INT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, sort INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS purchases(
  id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, package_id INT,
  package_name TEXT NOT NULL, price NUMERIC(12,2) NOT NULL, requests INT NOT NULL, days INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS deposits(
  id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, method TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL, sender TEXT NOT NULL, trx_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), reviewed_at TIMESTAMPTZ);
CREATE UNIQUE INDEX IF NOT EXISTS deposits_trx_uq ON deposits(upper(trx_id));
CREATE TABLE IF NOT EXISTS ledger(
  id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL, balance_after NUMERIC(12,2) NOT NULL, note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS ledger_user ON ledger(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS servers(
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, base_url TEXT NOT NULL, secret_key TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE, priority INT NOT NULL DEFAULT 10, last_status TEXT NOT NULL DEFAULT 'unknown',
  last_checked TIMESTAMPTZ, last_ms INT, fail_count INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS request_logs(
  id BIGSERIAL PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE CASCADE, kind TEXT, uid_queried TEXT,
  status TEXT NOT NULL, http INT, ms INT, server_id INT, ip TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS logs_user_time ON request_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS logs_time ON request_logs(created_at);
`);
  // ডিফল্ট সেটিংস
  const defaults = {
    site_name: SITE_NAME_DEFAULT,
    announcement: "",
    min_deposit: "20",
    support_link: "",
    rules: "",
    payment_methods: JSON.stringify([
      { id: "bkash", name: "bKash", number: "", type: "Personal", enabled: true },
      { id: "nagad", name: "Nagad", number: "", type: "Personal", enabled: true },
      { id: "rocket", name: "Rocket", number: "", type: "Personal", enabled: false },
    ]),
  };
  for (const [k, v] of Object.entries(defaults)) {
    await q("INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT (key) DO NOTHING", [k, v]);
  }
  // ডিফল্ট প্যাকেজ (অ্যাডমিন প্যানেল থেকে বদলানো যাবে)
  const pc = await q("SELECT count(*)::int AS c FROM packages");
  if (pc.rows[0].c === 0) {
    await q(`INSERT INTO packages(name,description,price,requests,days,sort) VALUES
      ('Starter','For testing and small projects',50,500,7,1),
      ('Growth','For active bots and tools',250,3000,30,2),
      ('Pro','For high volume use',900,15000,30,3)`);
  }
  // অ্যাডমিন অ্যাকাউন্ট
  const ae = str(process.env.ADMIN_EMAIL, 200).toLowerCase();
  const ap = process.env.ADMIN_PASSWORD || "";
  if (ae && ap) {
    const ex = await q("SELECT id FROM users WHERE email=$1", [ae]);
    if (!ex.rows.length) {
      await q("INSERT INTO users(name,email,password_hash,role,api_key) VALUES('Admin',$1,$2,'admin',$3)", [ae, hashPassword(ap), genKey()]);
      console.log("[init] অ্যাডমিন অ্যাকাউন্ট তৈরি হয়েছে:", ae);
    } else {
      await q("UPDATE users SET role='admin' WHERE id=$1", [ex.rows[0].id]);
    }
  } else {
    console.warn("[warn] ADMIN_EMAIL / ADMIN_PASSWORD সেট করা নেই, তাই অ্যাডমিন অ্যাকাউন্ট তৈরি হয়নি।");
  }
}

// ---------------------------------------------------------------- settings cache
async function getSettings() {
  const r = await q("SELECT key,value FROM settings");
  const s = {};
  r.rows.forEach((x) => (s[x.key] = x.value));
  let pm = [];
  try { pm = JSON.parse(s.payment_methods || "[]"); } catch { pm = []; }
  return {
    site_name: s.site_name || SITE_NAME_DEFAULT,
    announcement: s.announcement || "",
    min_deposit: Number(s.min_deposit) || 0,
    support_link: s.support_link || "",
    rules: s.rules || "",
    payment_methods: pm,
  };
}

// ---------------------------------------------------------------- views
const USER_SELECT = "*, (plan_expires IS NOT NULL AND plan_expires > now()) AS plan_valid";
function userView(u) {
  const remaining = Math.max(0, u.plan_requests - u.plan_used);
  return {
    id: u.id, name: u.name, email: u.email, role: u.role, balance: Number(u.balance),
    api_key: u.api_key, key_active: u.key_active, banned: u.banned, created_at: u.created_at,
    plan: {
      name: u.plan_name, requests: u.plan_requests, used: u.plan_used, remaining,
      expires_at: u.plan_expires,
      state: !u.plan_expires ? "none" : !u.plan_valid ? "expired" : remaining <= 0 ? "exhausted" : "active",
    },
  };
}
async function addLedger(client, userId, type, amount, balanceAfter, note) {
  await client.query("INSERT INTO ledger(user_id,type,amount,balance_after,note) VALUES($1,$2,$3,$4,$5)", [userId, type, amount, balanceAfter, note || null]);
}
async function withTx(fn) {
  return (dbAdapter || (dbAdapter = await dbReady)).tx(fn);
}
// প্ল্যানে রিকোয়েস্ট/দিন যোগ বা সেট করা (client = transaction client)
async function applyPlan(client, userId, { name, requests, days, mode }) {
  const r = await client.query("SELECT plan_requests, plan_used, plan_expires, (plan_expires IS NOT NULL AND plan_expires > now()) AS valid FROM users WHERE id=$1 FOR UPDATE", [userId]);
  const u = r.rows[0];
  if (mode === "add" && u.valid) {
    await client.query(
      "UPDATE users SET plan_name=$2, plan_requests=plan_requests+$3, plan_expires=plan_expires+($4 || ' days')::interval WHERE id=$1",
      [userId, name, requests, String(days)]);
  } else {
    await client.query(
      "UPDATE users SET plan_name=$2, plan_requests=$3, plan_used=0, plan_expires=now()+($4 || ' days')::interval WHERE id=$1",
      [userId, name, requests, String(days)]);
  }
}

// ---------------------------------------------------------------- app
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS) || 1);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  next();
});
app.use(express.json({ limit: "50kb" }));

const mkLimiter = (windowMs, limit, message) => rateLimit({
  windowMs, limit, standardHeaders: true, legacyHeaders: false, validate: false,
  keyGenerator: (req) => getIp(req),
  message: { ok: false, success: false, error: message },
});
const authLimiter = mkLimiter(15 * 60 * 1000, 20, "অনেক বেশি চেষ্টা করেছেন, কিছুক্ষণ পরে আবার চেষ্টা করুন।");
const registerLimiter = mkLimiter(60 * 60 * 1000, 10, "Too many sign-ups from this network. Try again later.");
const appLimiter = mkLimiter(60 * 1000, 240, "Too many requests, slow down.");
const apiIpLimiter = mkLimiter(60 * 1000, 300, "Too many requests from this IP.");

// ---------------------------------------------------------------- static files (flat folder)
const STATIC = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "application/javascript; charset=utf-8"],
  "/admin.js": ["admin.js", "application/javascript; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
};
const staticCache = {};
for (const [route, [file, type]] of Object.entries(STATIC)) {
  app.get(route, (req, res, next) => {
    try {
      const p = path.join(__dirname, file);
      if (!staticCache[file] || !IS_PROD) staticCache[file] = fs.readFileSync(p);
      res.setHeader("Content-Type", type);
      res.setHeader("Cache-Control", route === "/" ? "no-cache" : "public, max-age=300");
      res.send(staticCache[file]);
    } catch (e) { next(e); }
  });
}
const FAVICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#2563eb"/><path d="M9 16.5l4.5 4.5L23 11.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
app.get("/favicon.svg", (req, res) => { res.type("image/svg+xml").set("Cache-Control", "public, max-age=86400").send(FAVICON); });
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ---------------------------------------------------------------- site API (/app/*)
const site = express.Router();
site.use(appLimiter);
// CSRF সুরক্ষা: POST/PUT/DELETE শুধু JSON কনটেন্ট-টাইপে (ক্রস-সাইট ফর্ম পাঠাতে পারে না) + SameSite কুকি
site.use((req, res, next) => {
  if (req.method !== "GET" && !req.is("application/json")) return res.status(415).json({ ok: false, error: "Unsupported content type" });
  next();
});
site.use(wrap(async (req, res, next) => {
  const tok = parseCookies(req).sid;
  const s = tok && readSession(tok);
  if (s) {
    const r = await q("SELECT " + USER_SELECT + " FROM users WHERE id=$1", [s.uid]);
    const u = r.rows[0];
    if (u && !u.banned && u.token_version === s.tv) req.user = u;
  }
  next();
}));
const needUser = (req, res, next) => (req.user ? next() : res.status(401).json({ ok: false, error: "Please sign in." }));
const needAdmin = (req, res, next) => (req.user && req.user.role === "admin" ? next() : res.status(403).json({ ok: false, error: "Admin only." }));

// ---- public
site.get("/public", wrap(async (req, res) => {
  const [settings, pk, sv] = await Promise.all([
    getSettings(),
    q("SELECT id,name,description,price::float8 AS price,requests,days FROM packages WHERE active ORDER BY sort,id"),
    q("SELECT count(*)::int AS total, count(*) FILTER (WHERE last_status='up')::int AS up, count(*) FILTER (WHERE last_status='down')::int AS down FROM servers WHERE active"),
  ]);
  res.json({
    ok: true,
    site_name: settings.site_name,
    announcement: settings.announcement,
    support_link: settings.support_link,
    rules: settings.rules.split(/\r?\n/).map((x) => x.trim()).filter(Boolean),
    packages: pk.rows,
    servers: sv.rows[0],
  });
}));

// ---- auth
site.post("/register", registerLimiter, wrap(async (req, res) => {
  const name = str(req.body.name, 60), email = str(req.body.email, 200).toLowerCase(), pw = String(req.body.password || "");
  if (name.length < 2) throw new HttpError(400, "Enter your name.");
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Enter a valid email address.");
  if (pw.length < 8 || pw.length > 100) throw new HttpError(400, "Password must be 8 to 100 characters.");
  const ex = await q("SELECT 1 FROM users WHERE email=$1", [email]);
  if (ex.rows.length) throw new HttpError(409, "This email is already registered.");
  const r = await q("INSERT INTO users(name,email,password_hash,api_key,last_login) VALUES($1,$2,$3,$4,now()) RETURNING id, token_version", [name, email, hashPassword(pw), genKey()]);
  setSessionCookie(req, res, signSession(r.rows[0].id, r.rows[0].token_version), 7 * 24 * 3600);
  res.json({ ok: true });
}));
site.post("/login", authLimiter, wrap(async (req, res) => {
  const email = str(req.body.email, 200).toLowerCase(), pw = String(req.body.password || "");
  const r = await q("SELECT id, password_hash, banned, token_version FROM users WHERE email=$1", [email]);
  const u = r.rows[0];
  const ok = verifyPassword(pw, u ? u.password_hash : DUMMY_HASH);
  if (!u || !ok) throw new HttpError(401, "Wrong email or password.");
  if (u.banned) throw new HttpError(403, "This account is suspended.");
  await q("UPDATE users SET last_login=now() WHERE id=$1", [u.id]);
  setSessionCookie(req, res, signSession(u.id, u.token_version), 7 * 24 * 3600);
  res.json({ ok: true });
}));
site.post("/logout", (req, res) => { setSessionCookie(req, res, "", 0); res.json({ ok: true }); });
site.get("/me", wrap(async (req, res) => {
  if (!req.user) return res.json({ ok: true, user: null });
  const settings = await getSettings();
  res.json({ ok: true, user: userView(req.user), settings: { site_name: settings.site_name } });
}));
site.post("/password", needUser, wrap(async (req, res) => {
  const cur = String(req.body.current || ""), nw = String(req.body.password || "");
  const r = await q("SELECT password_hash FROM users WHERE id=$1", [req.user.id]);
  if (!verifyPassword(cur, r.rows[0].password_hash)) throw new HttpError(400, "Current password is wrong.");
  if (nw.length < 8 || nw.length > 100) throw new HttpError(400, "New password must be 8 to 100 characters.");
  const u = await q("UPDATE users SET password_hash=$2, token_version=token_version+1 WHERE id=$1 RETURNING token_version", [req.user.id, hashPassword(nw)]);
  setSessionCookie(req, res, signSession(req.user.id, u.rows[0].token_version), 7 * 24 * 3600);
  res.json({ ok: true });
}));

// ---- user area
site.get("/dashboard", needUser, wrap(async (req, res) => {
  const uid = req.user.id;
  const [days, recent, settings] = await Promise.all([
    q(`SELECT to_char((created_at AT TIME ZONE 'Asia/Dhaka')::date,'YYYY-MM-DD') AS d, count(*)::int AS c
       FROM request_logs WHERE user_id=$1 AND status='ok' AND created_at > now() - interval '8 days' GROUP BY 1 ORDER BY 1`, [uid]),
    q("SELECT kind, uid_queried, status, http, ms, created_at FROM request_logs WHERE user_id=$1 ORDER BY id DESC LIMIT 10", [uid]),
    getSettings(),
  ]);
  res.json({ ok: true, user: userView(req.user), usage: days.rows, recent: recent.rows, announcement: settings.announcement });
}));
site.post("/key/regenerate", needUser, wrap(async (req, res) => {
  const k = genKey();
  await q("UPDATE users SET api_key=$2 WHERE id=$1", [req.user.id, k]);
  res.json({ ok: true, api_key: k });
}));
site.get("/packages", needUser, wrap(async (req, res) => {
  const [pk, hist] = await Promise.all([
    q("SELECT id,name,description,price::float8 AS price,requests,days FROM packages WHERE active ORDER BY sort,id"),
    q("SELECT package_name, price::float8 AS price, requests, days, created_at FROM purchases WHERE user_id=$1 ORDER BY id DESC LIMIT 20", [req.user.id]),
  ]);
  res.json({ ok: true, packages: pk.rows, purchases: hist.rows, user: userView(req.user) });
}));
site.post("/buy", needUser, wrap(async (req, res) => {
  const pid = intIn(req.body.package_id, 1, 1e9);
  if (!pid) throw new HttpError(400, "Select a package.");
  const out = await withTx(async (c) => {
    const ur = await c.query("SELECT balance FROM users WHERE id=$1 FOR UPDATE", [req.user.id]);
    const pr = await c.query("SELECT * FROM packages WHERE id=$1 AND active", [pid]);
    if (!pr.rows.length) throw new HttpError(404, "Package not available.");
    const p = pr.rows[0];
    const bal = Number(ur.rows[0].balance), price = Number(p.price);
    if (bal < price) throw new HttpError(402, "Not enough balance. Add money first.");
    const nb = Math.round((bal - price) * 100) / 100;
    await c.query("UPDATE users SET balance=$2 WHERE id=$1", [req.user.id, nb]);
    await addLedger(c, req.user.id, "purchase", -price, nb, "Package: " + p.name);
    await c.query("INSERT INTO purchases(user_id,package_id,package_name,price,requests,days) VALUES($1,$2,$3,$4,$5,$6)", [req.user.id, p.id, p.name, p.price, p.requests, p.days]);
    await applyPlan(c, req.user.id, { name: p.name, requests: p.requests, days: p.days, mode: "add" });
    return p.name;
  });
  const u = await q("SELECT " + USER_SELECT + " FROM users WHERE id=$1", [req.user.id]);
  res.json({ ok: true, package: out, user: userView(u.rows[0]) });
}));
site.get("/wallet", needUser, wrap(async (req, res) => {
  const [dep, led, settings] = await Promise.all([
    q("SELECT id, method, amount::float8 AS amount, sender, trx_id, status, note, created_at FROM deposits WHERE user_id=$1 ORDER BY id DESC LIMIT 20", [req.user.id]),
    q("SELECT type, amount::float8 AS amount, balance_after::float8 AS balance_after, note, created_at FROM ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 20", [req.user.id]),
    getSettings(),
  ]);
  res.json({
    ok: true, balance: Number(req.user.balance), deposits: dep.rows, ledger: led.rows,
    methods: settings.payment_methods.filter((m) => m.enabled && m.number).map((m) => ({ id: m.id, name: m.name, number: m.number, type: m.type })),
    min_deposit: settings.min_deposit, support_link: settings.support_link,
  });
}));
site.post("/deposit", needUser, wrap(async (req, res) => {
  const settings = await getSettings();
  const method = settings.payment_methods.find((m) => m.id === str(req.body.method, 30) && m.enabled && m.number);
  if (!method) throw new HttpError(400, "Select a payment method.");
  const amount = money(req.body.amount);
  if (!(amount > 0) || amount > 1000000) throw new HttpError(400, "Enter a valid amount.");
  if (amount < settings.min_deposit) throw new HttpError(400, "Minimum deposit is " + settings.min_deposit + " BDT.");
  const sender = str(req.body.sender, 30), trx = str(req.body.trx_id, 40).toUpperCase();
  if (!/^[0-9+\-\s]{6,20}$/.test(sender)) throw new HttpError(400, "Enter the number you paid from.");
  if (!/^[A-Z0-9]{6,40}$/.test(trx)) throw new HttpError(400, "Enter a valid transaction ID.");
  const pend = await q("SELECT count(*)::int AS c FROM deposits WHERE user_id=$1 AND status='pending'", [req.user.id]);
  if (pend.rows[0].c >= 5) throw new HttpError(429, "You have too many pending requests. Please wait for approval.");
  try {
    await q("INSERT INTO deposits(user_id,method,amount,sender,trx_id) VALUES($1,$2,$3,$4,$5)", [req.user.id, method.name, amount, sender, trx]);
  } catch (e) {
    if (e.code === "23505") throw new HttpError(409, "This transaction ID was already submitted.");
    throw e;
  }
  res.json({ ok: true });
}));
site.get("/status", needUser, wrap(async (req, res) => {
  const [sv, logs] = await Promise.all([
    q("SELECT id, last_status, last_checked, last_ms FROM servers WHERE active ORDER BY priority, id"),
    q("SELECT kind, uid_queried, status, http, ms, created_at FROM request_logs WHERE user_id=$1 ORDER BY id DESC LIMIT 20", [req.user.id]),
  ]);
  res.json({
    ok: true,
    nodes: sv.rows.map((s, i) => ({ name: "Node " + (i + 1), status: s.last_status, ms: s.last_ms, checked: s.last_checked })),
    logs: logs.rows, user: userView(req.user),
  });
}));

// ---- admin
const admin = express.Router();
admin.use(needAdmin);
site.use("/admin", admin);

admin.get("/stats", wrap(async (req, res) => {
  const [a, b, c, d, e] = await Promise.all([
    q(`SELECT count(*)::int AS users, count(*) FILTER (WHERE plan_expires > now() AND plan_used < plan_requests)::int AS active_plans FROM users WHERE role='user'`),
    q("SELECT coalesce(sum(price),0)::float8 AS revenue, count(*)::int AS sales FROM purchases"),
    q("SELECT count(*)::int AS pending, coalesce(sum(amount),0)::float8 AS pending_amount FROM deposits WHERE status='pending'"),
    q(`SELECT to_char((created_at AT TIME ZONE 'Asia/Dhaka')::date,'YYYY-MM-DD') AS d, count(*)::int AS c
       FROM request_logs WHERE status='ok' AND created_at > now() - interval '8 days' GROUP BY 1 ORDER BY 1`),
    q("SELECT count(*)::int AS total, count(*) FILTER (WHERE last_status='up')::int AS up, count(*) FILTER (WHERE last_status='down')::int AS down FROM servers WHERE active"),
  ]);
  res.json({ ok: true, ...a.rows[0], ...b.rows[0], ...c.rows[0], usage: d.rows, servers: e.rows[0] });
}));

admin.get("/users", wrap(async (req, res) => {
  const term = str(req.query.q, 100), page = Math.max(1, Number(req.query.page) || 1), per = 20;
  const like = "%" + term.replace(/[%_\\]/g, "\\$&") + "%";
  const [rows, cnt] = await Promise.all([
    q(`SELECT ${USER_SELECT} FROM users WHERE ($1 = '' OR email ILIKE $2 OR name ILIKE $2) ORDER BY id DESC LIMIT ${per} OFFSET ${(page - 1) * per}`, [term, like]),
    q("SELECT count(*)::int AS c FROM users WHERE ($1 = '' OR email ILIKE $2 OR name ILIKE $2)", [term, like]),
  ]);
  res.json({ ok: true, users: rows.rows.map(userView), total: cnt.rows[0].c, page, per });
}));
async function getTarget(id) {
  const r = await q("SELECT " + USER_SELECT + " FROM users WHERE id=$1", [intIn(id, 1, 1e9) || 0]);
  if (!r.rows.length) throw new HttpError(404, "User not found.");
  return r.rows[0];
}
admin.post("/users/:id/balance", wrap(async (req, res) => {
  const t = await getTarget(req.params.id);
  const amt = money(req.body.amount);
  if (!Number.isFinite(amt) || amt === 0 || Math.abs(amt) > 1000000) throw new HttpError(400, "Enter a valid amount (use a minus sign to deduct).");
  const nb = await withTx(async (c) => {
    const r = await c.query("SELECT balance FROM users WHERE id=$1 FOR UPDATE", [t.id]);
    const nbal = Math.round((Number(r.rows[0].balance) + amt) * 100) / 100;
    if (nbal < 0) throw new HttpError(400, "Balance cannot go below zero.");
    await c.query("UPDATE users SET balance=$2 WHERE id=$1", [t.id, nbal]);
    await addLedger(c, t.id, "adjust", amt, nbal, str(req.body.note, 120) || "Admin adjustment");
    return nbal;
  });
  res.json({ ok: true, balance: nb });
}));
admin.post("/users/:id/ban", wrap(async (req, res) => {
  const t = await getTarget(req.params.id);
  if (t.role === "admin") throw new HttpError(400, "Cannot suspend an admin.");
  const banned = !!req.body.banned;
  await q("UPDATE users SET banned=$2, token_version=token_version+1 WHERE id=$1", [t.id, banned]);
  res.json({ ok: true });
}));
admin.post("/users/:id/grant", wrap(async (req, res) => {
  const t = await getTarget(req.params.id);
  const requests = intIn(req.body.requests, 1, 100000000), days = intIn(req.body.days, 1, 3650);
  if (!requests || !days) throw new HttpError(400, "Enter requests and days.");
  const mode = req.body.mode === "set" ? "set" : "add";
  await withTx((c) => applyPlan(c, t.id, { name: str(req.body.name, 40) || "Admin grant", requests, days, mode }));
  res.json({ ok: true });
}));
admin.post("/users/:id/revoke-plan", wrap(async (req, res) => {
  const t = await getTarget(req.params.id);
  await q("UPDATE users SET plan_requests=0, plan_used=0, plan_expires=NULL, plan_name=NULL WHERE id=$1", [t.id]);
  res.json({ ok: true });
}));
admin.post("/users/:id/regen-key", wrap(async (req, res) => {
  const t = await getTarget(req.params.id);
  const k = genKey();
  await q("UPDATE users SET api_key=$2, key_active=true WHERE id=$1", [t.id, k]);
  res.json({ ok: true, api_key: k });
}));
admin.post("/users/:id/key-active", wrap(async (req, res) => {
  const t = await getTarget(req.params.id);
  await q("UPDATE users SET key_active=$2 WHERE id=$1", [t.id, !!req.body.active]);
  res.json({ ok: true });
}));

admin.get("/packages", wrap(async (req, res) => {
  const r = await q("SELECT id,name,description,price::float8 AS price,requests,days,active,sort FROM packages ORDER BY sort,id");
  res.json({ ok: true, packages: r.rows });
}));
function readPackage(b) {
  const name = str(b.name, 40), desc = str(b.description, 160), price = money(b.price);
  const requests = intIn(b.requests, 1, 100000000), days = intIn(b.days, 1, 3650), sort = intIn(b.sort || 0, 0, 9999);
  if (!name) throw new HttpError(400, "Enter a package name.");
  if (!(price >= 0)) throw new HttpError(400, "Enter a valid price.");
  if (!requests) throw new HttpError(400, "Enter the number of requests.");
  if (!days) throw new HttpError(400, "Enter the validity in days.");
  return { name, desc, price, requests, days, sort: sort || 0, active: b.active !== false };
}
admin.post("/packages", wrap(async (req, res) => {
  const p = readPackage(req.body);
  await q("INSERT INTO packages(name,description,price,requests,days,sort,active) VALUES($1,$2,$3,$4,$5,$6,$7)", [p.name, p.desc, p.price, p.requests, p.days, p.sort, p.active]);
  res.json({ ok: true });
}));
admin.put("/packages/:id", wrap(async (req, res) => {
  const p = readPackage(req.body), id = intIn(req.params.id, 1, 1e9);
  await q("UPDATE packages SET name=$2,description=$3,price=$4,requests=$5,days=$6,sort=$7,active=$8 WHERE id=$1", [id, p.name, p.desc, p.price, p.requests, p.days, p.sort, p.active]);
  res.json({ ok: true });
}));
admin.delete("/packages/:id", wrap(async (req, res) => {
  const id = intIn(req.params.id, 1, 1e9);
  const used = await q("SELECT 1 FROM purchases WHERE package_id=$1 LIMIT 1", [id]);
  if (used.rows.length) { await q("UPDATE packages SET active=false WHERE id=$1", [id]); return res.json({ ok: true, hidden: true }); }
  await q("DELETE FROM packages WHERE id=$1", [id]);
  res.json({ ok: true });
}));

admin.get("/deposits", wrap(async (req, res) => {
  const st = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : null;
  const r = await q(`SELECT d.id, d.method, d.amount::float8 AS amount, d.sender, d.trx_id, d.status, d.note, d.created_at, u.email, u.name
    FROM deposits d JOIN users u ON u.id=d.user_id WHERE ($1::text IS NULL OR d.status=$1) ORDER BY (d.status='pending') DESC, d.id DESC LIMIT 100`, [st]);
  res.json({ ok: true, deposits: r.rows });
}));
admin.post("/deposits/:id/approve", wrap(async (req, res) => {
  const id = intIn(req.params.id, 1, 1e9);
  await withTx(async (c) => {
    const d = await c.query("SELECT * FROM deposits WHERE id=$1 FOR UPDATE", [id]);
    if (!d.rows.length) throw new HttpError(404, "Deposit not found.");
    if (d.rows[0].status !== "pending") throw new HttpError(409, "This request was already reviewed.");
    const dep = d.rows[0];
    const ur = await c.query("SELECT balance FROM users WHERE id=$1 FOR UPDATE", [dep.user_id]);
    const nb = Math.round((Number(ur.rows[0].balance) + Number(dep.amount)) * 100) / 100;
    await c.query("UPDATE users SET balance=$2 WHERE id=$1", [dep.user_id, nb]);
    await c.query("UPDATE deposits SET status='approved', reviewed_at=now() WHERE id=$1", [id]);
    await addLedger(c, dep.user_id, "deposit", dep.amount, nb, dep.method + " " + dep.trx_id);
  });
  res.json({ ok: true });
}));
admin.post("/deposits/:id/reject", wrap(async (req, res) => {
  const id = intIn(req.params.id, 1, 1e9);
  const r = await q("UPDATE deposits SET status='rejected', reviewed_at=now(), note=$2 WHERE id=$1 AND status='pending' RETURNING id", [id, str(req.body.note, 120) || null]);
  if (!r.rows.length) throw new HttpError(409, "This request was already reviewed.");
  res.json({ ok: true });
}));

admin.get("/servers", wrap(async (req, res) => {
  const r = await q("SELECT id,name,base_url,(secret_key <> '') AS has_key,active,priority,last_status,last_checked,last_ms,fail_count FROM servers ORDER BY priority,id");
  res.json({ ok: true, servers: r.rows });
}));
function readServer(b, isNew) {
  const name = str(b.name, 40) || "Server";
  const base = str(b.base_url, 300).replace(/\/+$/, "");
  try { const u = new URL(base); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { throw new HttpError(400, "Enter a valid server URL starting with https://"); }
  const priority = intIn(b.priority == null ? 10 : b.priority, 0, 999);
  if (Number.isNaN(priority)) throw new HttpError(400, "Priority must be a number.");
  return { name, base, key: b.secret_key == null ? null : str(b.secret_key, 200), priority, active: b.active !== false };
}
admin.post("/servers", wrap(async (req, res) => {
  const s = readServer(req.body, true);
  await q("INSERT INTO servers(name,base_url,secret_key,priority,active) VALUES($1,$2,$3,$4,$5)", [s.name, s.base, s.key || "", s.priority, s.active]);
  res.json({ ok: true });
}));
admin.put("/servers/:id", wrap(async (req, res) => {
  const s = readServer(req.body, false), id = intIn(req.params.id, 1, 1e9);
  await q("UPDATE servers SET name=$2, base_url=$3, priority=$4, active=$5, secret_key=CASE WHEN $6::text IS NULL OR $6 = '' THEN secret_key ELSE $6 END WHERE id=$1", [id, s.name, s.base, s.priority, s.active, s.key]);
  res.json({ ok: true });
}));
admin.delete("/servers/:id", wrap(async (req, res) => {
  await q("DELETE FROM servers WHERE id=$1", [intIn(req.params.id, 1, 1e9)]);
  res.json({ ok: true });
}));
admin.post("/servers/:id/test", wrap(async (req, res) => {
  const r = await q("SELECT * FROM servers WHERE id=$1", [intIn(req.params.id, 1, 1e9) || 0]);
  if (!r.rows.length) throw new HttpError(404, "Server not found.");
  const out = await pingServer(r.rows[0]);
  res.json({ ok: true, status: out.ok ? "up" : "down", ms: out.ms });
}));

admin.get("/settings", wrap(async (req, res) => { res.json({ ok: true, settings: await getSettings() }); }));
admin.put("/settings", wrap(async (req, res) => {
  const b = req.body;
  const methods = Array.isArray(b.payment_methods) ? b.payment_methods.slice(0, 8).map((m) => ({
    id: str(m.id, 30).toLowerCase().replace(/[^a-z0-9_-]/g, "") || crypto.randomBytes(3).toString("hex"),
    name: str(m.name, 30), number: str(m.number, 30), type: str(m.type, 20), enabled: !!m.enabled,
  })).filter((m) => m.name) : [];
  const vals = {
    site_name: str(b.site_name, 40) || SITE_NAME_DEFAULT,
    announcement: str(b.announcement, 300),
    min_deposit: String(Math.max(0, money(b.min_deposit) || 0)),
    support_link: str(b.support_link, 200),
    rules: String(b.rules == null ? "" : b.rules).slice(0, 4000),
    payment_methods: JSON.stringify(methods),
  };
  for (const [k, v] of Object.entries(vals)) {
    await q("INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [k, v]);
  }
  res.json({ ok: true });
}));
admin.get("/logs", wrap(async (req, res) => {
  const r = await q(`SELECT l.id, l.kind, l.uid_queried, l.status, l.http, l.ms, l.server_id, l.created_at, u.email
    FROM request_logs l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.id DESC LIMIT 100`);
  res.json({ ok: true, logs: r.rows });
}));

app.use("/app", site);

// ---------------------------------------------------------------- upstream servers
async function fetchJson(url, headers, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers, signal: ctrl.signal });
    let body = null;
    try { body = await r.json(); } catch {}
    return { status: r.status, body };
  } finally { clearTimeout(t); }
}
async function pingServer(s) {
  const t0 = Date.now();
  let ok = false;
  try {
    const r = await fetchJson(s.base_url + "/health", {}, 40000);
    ok = r.status === 200;
  } catch { ok = false; }
  const ms = Date.now() - t0;
  await q("UPDATE servers SET last_status=$2, last_checked=now(), last_ms=$3, fail_count=CASE WHEN $2='up' THEN 0 ELSE fail_count+1 END WHERE id=$1", [s.id, ok ? "up" : "down", ok ? ms : null]);
  return { ok, ms };
}
async function checkAllServers() {
  try {
    const r = await q("SELECT * FROM servers WHERE active");
    await Promise.all(r.rows.map((s) => pingServer(s)));
  } catch (e) { console.error("[health]", e.message); }
}

const lookupCache = new Map();
function cacheGet(k) {
  const h = lookupCache.get(k);
  if (!h) return null;
  if (Date.now() > h.exp) { lookupCache.delete(k); return null; }
  return h.val;
}
function cacheSet(k, v) {
  if (lookupCache.size > 5000) lookupCache.delete(lookupCache.keys().next().value);
  lookupCache.set(k, { val: v, exp: Date.now() + CACHE_TTL_MS });
}

// সফল হলে { data, serverId }; প্লেয়ার না পেলে HttpError(404); সব সার্ভার ফেল করলে HttpError(502)
async function lookupUpstream(kind, uid, region) {
  const ck = kind + ":" + region + ":" + uid;
  const hit = cacheGet(ck);
  if (hit) return { data: hit, serverId: null, cached: true };
  const sv = await q("SELECT * FROM servers WHERE active ORDER BY (last_status='down'), priority, id");
  if (!sv.rows.length) throw new HttpError(503, "Service is not configured yet.");
  for (const s of sv.rows) {
    try {
      const url = new URL("/api/" + kind, s.base_url);
      url.searchParams.set("uid", uid);
      url.searchParams.set("region", region);
      const headers = s.secret_key ? { "x-api-key": s.secret_key } : {};
      const r = await fetchJson(url.toString(), headers, UPSTREAM_TIMEOUT_MS);
      if (r.status === 404) {
        q("UPDATE servers SET last_status='up', fail_count=0 WHERE id=$1", [s.id]).catch(() => {});
        throw new HttpError(404, "Player not found.");
      }
      if (r.status === 200 && r.body && r.body.success && (r.body.name || kind === "player")) {
        q("UPDATE servers SET last_status='up', fail_count=0 WHERE id=$1", [s.id]).catch(() => {});
        cacheSet(ck, r.body);
        return { data: r.body, serverId: s.id, cached: false };
      }
      throw new Error("bad upstream response " + r.status);
    } catch (e) {
      if (e instanceof HttpError) throw e;
      q("UPDATE servers SET last_status='down', fail_count=fail_count+1, last_checked=now() WHERE id=$1", [s.id]).catch(() => {});
    }
  }
  throw new HttpError(502, "Upstream servers are unavailable. Please try again shortly.");
}

// ---------------------------------------------------------------- public API gateway (/api/v1/*)
const keyHits = new Map();
function keyRateOk(key) {
  const now = Date.now();
  let h = keyHits.get(key);
  if (!h || now > h.reset) { h = { count: 0, reset: now + 60000 }; keyHits.set(key, h); }
  h.count++;
  return h.count <= KEY_RATE_PER_MIN;
}
setInterval(() => { const now = Date.now(); for (const [k, h] of keyHits) if (now > h.reset) keyHits.delete(k); }, 60000).unref();

function apiFail(res, status, code, message, extra) {
  return res.status(status).json({ success: false, code, error: message, ...(extra || {}) });
}
async function planFailure(key) {
  const r = await q("SELECT " + USER_SELECT + " FROM users WHERE api_key=$1", [key]);
  const u = r.rows[0];
  if (!u) return { status: 401, code: "invalid_key", msg: "Invalid API key." };
  if (u.banned || !u.key_active) return { status: 403, code: "key_disabled", msg: "This API key is disabled." };
  if (!u.plan_expires) return { status: 402, code: "no_plan", msg: "No active package. Buy a package on the website to use this key." };
  if (!u.plan_valid) return { status: 402, code: "expired", msg: "Your package has expired. Renew it on the website." };
  return { status: 402, code: "limit_reached", msg: "Request limit reached. Upgrade your package on the website." };
}

async function gateway(kind, req, res) {
  const t0 = Date.now();
  const key = str(req.get("x-api-key") || req.query.key, 80);
  if (!key.startsWith("sh-")) return apiFail(res, 401, "invalid_key", "Missing or invalid API key.");
  const uid = str(req.query.uid, 20);
  if (!/^\d{5,15}$/.test(uid)) return apiFail(res, 400, "invalid_uid", "Invalid uid. Use digits only (5 to 15 digits).");
  const region = (str(req.query.region, 5).toUpperCase().replace(/[^A-Z]/g, "")) || "BD";
  if (!keyRateOk(key)) return apiFail(res, 429, "rate_limited", "Too many requests. Slow down.");

  // অ্যাটমিক ভাবে ১টা রিকোয়েস্ট রিজার্ভ (মেয়াদ ও লিমিট এক সাথে চেক)
  const rs = await q(
    `UPDATE users SET plan_used = plan_used + 1
     WHERE api_key=$1 AND banned=false AND key_active=true AND plan_expires > now() AND plan_used < plan_requests
     RETURNING id, plan_requests - plan_used AS remaining, plan_expires`, [key]);
  if (!rs.rows.length) {
    const f = await planFailure(key);
    return apiFail(res, f.status, f.code, f.msg);
  }
  const user = rs.rows[0];
  const log = (status, http, serverId) =>
    q("INSERT INTO request_logs(user_id,kind,uid_queried,status,http,ms,server_id,ip) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [user.id, kind, uid, status, http, Date.now() - t0, serverId, getIp(req)]).catch(() => {});
  const refund = () => q("UPDATE users SET plan_used = GREATEST(plan_used - 1, 0) WHERE id=$1", [user.id]).catch(() => {});
  try {
    const out = await lookupUpstream(kind, uid, region);
    log("ok", 200, out.serverId);
    const meta = { remaining: Number(user.remaining), expires_at: user.plan_expires };
    if (kind === "name") return res.json({ success: true, uid, name: out.data.name, region: out.data.region || region, ...meta });
    const { cached, fetched_at, ...rest } = out.data;
    return res.json({ ...rest, ...meta });
  } catch (e) {
    await refund(); // সফল না হলে রিকোয়েস্ট কাটা হয় না
    const status = e instanceof HttpError ? e.status : 500;
    log(status === 404 ? "not_found" : "error", status, null);
    if (status === 404) return apiFail(res, 404, "not_found", "Player not found.", { remaining: Number(user.remaining) + 1 });
    if (status === 502 || status === 503) return apiFail(res, status, "upstream_unavailable", e.message);
    console.error("[gateway]", e);
    return apiFail(res, 500, "server_error", "Internal error.");
  }
}
const apiRouter = express.Router();
apiRouter.use(apiIpLimiter);
apiRouter.get("/v1/name", wrap((req, res) => gateway("name", req, res)));
apiRouter.get("/v1/player", wrap((req, res) => gateway("player", req, res)));
apiRouter.get("/v1/usage", wrap(async (req, res) => {
  const key = str(req.get("x-api-key") || req.query.key, 80);
  const r = await q("SELECT " + USER_SELECT + " FROM users WHERE api_key=$1", [key]);
  if (!r.rows.length) return apiFail(res, 401, "invalid_key", "Invalid API key.");
  const v = userView(r.rows[0]).plan;
  res.json({ success: true, plan: v.name, status: v.state, requests: v.requests, used: v.used, remaining: v.remaining, expires_at: v.expires_at });
}));
app.use("/api", apiRouter);

// ---------------------------------------------------------------- errors
app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ success: false, error: "Not found." });
  if (req.path.startsWith("/app/")) return res.status(404).json({ ok: false, error: "Not found." });
  res.status(404).type("text").send("Not found");
});
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ ok: false, success: false, error: err.message });
  if (err && err.type === "entity.parse.failed") return res.status(400).json({ ok: false, error: "Invalid JSON." });
  console.error("[error]", err);
  res.status(500).json({ ok: false, success: false, error: "Something went wrong." });
});

// ---------------------------------------------------------------- start
(async () => {
  await initDb();
  app.listen(PORT, () => console.log("Site listening on :" + PORT));
  setTimeout(checkAllServers, 15000).unref();
  setInterval(checkAllServers, 4 * 60 * 1000).unref(); // ফ্রি Render সার্ভার জাগিয়ে রাখে + স্ট্যাটাস আপডেট
  if (process.env.RENDER_EXTERNAL_URL) { // নিজেকে জাগিয়ে রাখে, যাতে ফ্রি সার্ভার ঘুমিয়ে ডেটা না হারায়
    setInterval(() => fetch(process.env.RENDER_EXTERNAL_URL + "/health").catch(() => {}), 10 * 60 * 1000).unref();
  }
  const shutdown = async () => { try { await (await dbReady).close(); } catch {} process.exit(0); };
  process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
  setInterval(() => q("DELETE FROM request_logs WHERE created_at < now() - interval '30 days'").catch(() => {}), 24 * 3600 * 1000).unref();
})().catch((e) => { console.error("Startup failed:", e); process.exit(1); });
