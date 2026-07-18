# Pulse Meter API (Cloudflare Worker)

Tiny Worker that backs the Pulse Meter widget with real, shared counters
(`visitors`, `downloads`, `thumbs`) stored in Cloudflare KV, so every visitor
to the portfolio sees the same live numbers instead of a per-browser fake
count.

## Deploy

From this `worker/` directory:

```bash
npm install -g wrangler      # if you don't have it already
wrangler login                # opens a browser to authenticate with Cloudflare

wrangler kv namespace create PULSE_KV
# copy the printed `id = "..."` into wrangler.toml, replacing
# REPLACE_WITH_YOUR_KV_NAMESPACE_ID

wrangler deploy
```

`wrangler deploy` prints your Worker's URL, e.g.
`https://ayush-pulse.<your-subdomain>.workers.dev`.

## Wire it into the site

Copy that URL into `PULSE_API` in both:
- `../script.js`
- `../assets/pulse-meter.html`

Then commit and push — GitHub Pages will pick it up on the next deploy.

## Local testing

```bash
wrangler dev
```

Then, in another terminal:

```bash
curl http://localhost:8787/pulse
curl -X POST http://localhost:8787/pulse/visit
curl -X POST http://localhost:8787/pulse/download
curl -X POST http://localhost:8787/pulse/thumb -H "Content-Type: application/json" -d '{"action":"inc"}'
```

## Notes

- `visitors` is deduped per IP (hashed, never stored raw) per calendar day,
  so refreshing the page repeatedly doesn't inflate the count.
- `downloads` and `thumbs` are not server-deduped — the front-end already
  gates them (one increment per real click, and the thumb button toggles a
  `localStorage` flag so a given browser can only be "thumbed" once at a
  time).
- KV's read-modify-write isn't atomic. At portfolio-site traffic levels the
  chance of two increments racing and clobbering each other is negligible;
  if this ever needs to be bulletproof, swap the counters for a Durable
  Object instead.
