/**
 * Pulse Meter API — Cloudflare Worker
 *
 * Routes:
 *   GET  /pulse           -> { visitors, downloads, thumbs }
 *   POST /pulse/visit     -> increments `visitors` once per IP per day, returns counts
 *   POST /pulse/download  -> increments `downloads`, returns counts
 *   POST /pulse/thumb     -> body { action: "inc" | "dec" }, adjusts `thumbs`, returns counts
 *
 * KV read-modify-write is not atomic; at portfolio-scale traffic the odds of a
 * lost update are negligible, so no Durable Object is used here.
 */

const COUNTER_KEYS = ["visitors", "downloads", "thumbs"];

async function getCount(env, key) {
  const raw = await env.PULSE_KV.get(key);
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

async function getAllCounts(env) {
  const entries = await Promise.all(COUNTER_KEYS.map((k) => getCount(env, k)));
  return Object.fromEntries(COUNTER_KEYS.map((k, i) => [k, entries[i]]));
}

async function bumpCount(env, key, delta) {
  const current = await getCount(env, key);
  const next = Math.max(0, current + delta);
  await env.PULSE_KV.put(key, String(next));
  return next;
}

function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  if (origin === env.ALLOWED_ORIGIN) return true;
  if (origin === "null") return true; // local file:// testing
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  return false;
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowOrigin = isAllowedOrigin(origin, env) ? origin : env.ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

async function hashIp(ip) {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function handleVisit(request, env, cors) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await hashIp(ip);
  const day = new Date().toISOString().slice(0, 10);
  const dedupeKey = `visit:${ipHash}:${day}`;

  const alreadySeen = await env.PULSE_KV.get(dedupeKey);
  if (!alreadySeen) {
    await env.PULSE_KV.put(dedupeKey, "1", { expirationTtl: 86400 });
    await bumpCount(env, "visitors", 1);
  }

  return json(await getAllCounts(env), 200, cors);
}

async function handleDownload(env, cors) {
  await bumpCount(env, "downloads", 1);
  return json(await getAllCounts(env), 200, cors);
}

async function handleThumb(request, env, cors) {
  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    // no body / invalid JSON — treat as no-op below
  }
  const delta = body.action === "dec" ? -1 : body.action === "inc" ? 1 : 0;
  if (delta !== 0) await bumpCount(env, "thumbs", delta);
  return json(await getAllCounts(env), 200, cors);
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === "GET" && url.pathname === "/pulse") {
      return json(await getAllCounts(env), 200, cors);
    }

    if (request.method === "POST" && url.pathname === "/pulse/visit") {
      return handleVisit(request, env, cors);
    }

    if (request.method === "POST" && url.pathname === "/pulse/download") {
      return handleDownload(env, cors);
    }

    if (request.method === "POST" && url.pathname === "/pulse/thumb") {
      return handleThumb(request, env, cors);
    }

    return json({ error: "not found" }, 404, cors);
  },
};
