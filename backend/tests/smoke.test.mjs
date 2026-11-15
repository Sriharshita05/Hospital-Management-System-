process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234";
const { app } = await import("../src/server.js");
const Staff = (await import("../src/models/Staff.js")).default;
const jwt = (await import("jsonwebtoken")).default;
const http = await import("node:http");

// Stub the DB lookup used by the auth middleware
const fake = (role) => ({ _id: "507f1f77bcf86cd799439011", role, isActive: true, doctor: null });
let currentRole = "frontDesk";
Staff.findById = () => ({ select: async () => fake(currentRole) });

const server = http.createServer(app).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const tok = (role) => jwt.sign({ id: "507f1f77bcf86cd799439011", role }, process.env.JWT_SECRET);

const call = async (path, { method = "GET", role, body, raw } = {}) => {
  currentRole = role || currentRole;
  const r = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(role ? { Authorization: `Bearer ${tok(role)}` } : {}) },
    body: raw ?? (body ? JSON.stringify(body) : undefined)
  });
  let j = {}; try { j = await r.json(); } catch {}
  return [r.status, j.message];
};

const results = [];
const t = async (name, p, expect) => {
  const [status, msg] = await p;
  const ok = status === expect;
  results.push(ok);
  console.log(ok ? "PASS" : "FAIL", name, "->", status, msg ?? "");
};

await t("no token on /patients", call("/api/patients"), 401);
await t("bad token", (async () => { const r = await fetch(base + "/api/patients", { headers: { Authorization: "Bearer abc" } }); return [r.status]; })(), 401);
await t("unknown route 404", call("/api/nope"), 404);
await t("bad JSON 400", call("/api/auth/login", { method: "POST", raw: "{bad" }), 400);
await t("login object payload rejected", call("/api/auth/login", { method: "POST", body: { email: { $ne: null }, password: { $ne: null } } }), 400);
await t("clinician cannot read bills", call("/api/bills", { role: "clinician" }), 403);
await t("frontDesk cannot read audit logs", call("/api/audit-logs", { role: "frontDesk" }), 403);
await t("frontDesk cannot read prescriptions", call("/api/prescriptions", { role: "frontDesk" }), 403);
await t("clinician cannot list staff", call("/api/auth/staff", { role: "clinician" }), 403);
await t("clinician cannot register staff", call("/api/auth/register", { method: "POST", role: "clinician", body: {} }), 403);
await t("frontDesk cannot create schedule", call("/api/schedules", { method: "POST", role: "frontDesk", body: {} }), 403);
await t("visit validation (400 before DB)", call("/api/visits", { method: "POST", role: "admin", body: {} }), 400);
await t("prescription needs visit", call("/api/prescriptions", { method: "POST", role: "admin", body: {} }), 400);
await t("prescription needs medicines", call("/api/prescriptions", { method: "POST", role: "admin", body: { visit: "507f1f77bcf86cd799439011" } }), 400);
await t("report needs fields", call("/api/diagnostic-reports", { method: "POST", role: "admin", body: {} }), 400);
await t("bill needs visit", call("/api/bills", { method: "POST", role: "admin", body: {} }), 400);
await t("bill invalid tax", call("/api/bills", { method: "POST", role: "admin", body: { visit: "507f1f77bcf86cd799439011", items: [{}], taxRate: 500 } }), 400);
await t("payment invalid status", call("/api/bills/B1/payment", { method: "PATCH", role: "admin", body: { paymentStatus: "Hacked" } }), 400);
await t("staff register invalid email", call("/api/auth/register", { method: "POST", role: "admin", body: { staffId: "S1", name: "A", email: "bad", password: "12345678", role: "admin" } }), 400);
await t("staff register bad role", call("/api/auth/register", { method: "POST", role: "admin", body: { staffId: "S1", name: "A", email: "a@b.co", password: "12345678", role: "root" } }), 400);

// Sanitizer: operator keys are stripped
const { sanitizeBody } = await import("../src/middleware/securityMiddleware.js");
const req = { body: { a: { $ne: 1, ok: 2 }, "b.c": 1, list: [{ $gt: 1, x: 1 }] } };
sanitizeBody(req, {}, () => {});
const sanOk = JSON.stringify(req.body) === JSON.stringify({ a: { ok: 2 }, list: [{ x: 1 }] });
console.log(sanOk ? "PASS" : "FAIL", "sanitizer strips $ and dotted keys", JSON.stringify(req.body));
results.push(sanOk);

// Rate limiter on login: 20 allowed per window, then 429
let last;
for (let i = 0; i < 22; i++) last = await call("/api/auth/login", { method: "POST", body: {} });
await t("login rate limit after 20", Promise.resolve(last), 429);

console.log(results.every(Boolean) ? "ALL PASSED" : "SOME FAILED", `(${results.filter(Boolean).length}/${results.length})`);
server.close(); process.exit(0);
