# Snowy'sz Live Limited Sales Tracker

A SkyBlock-themed live dashboard for Snowy'sz community `370302186` that tracks **only limited UGC sales** streamed from the real Roblox **Revenue › Sales** API. It never invents sales, buyers, prices, timestamps, or revenue.

## Data mode — live API only

The Node backend (`server.js`) polls Roblox's group transactions endpoint
(`economy.roblox.com/v2/groups/370302186/transactions`, `transactionType=Sale`,
latest 100) and verifies every candidate sale against the public asset-details
endpoint. Only sales whose assets are `IsLimited` or `IsLimitedUnique` are
returned; normal (non-limited) sales are dropped entirely. Asset details are
cached for ten minutes so polling stays fast. The browser refreshes the feed
every 60 seconds. CSV import was removed.

The dashboard shows `LIVE REQUIRED` (no cookie configured) or `API ERROR`
(session rejected / Roblox unreachable) and stays empty until real limited
sales arrive from the API.

## Run locally

```bash
npm start
```

The server binds to `0.0.0.0` on port `4173` locally (or the `PORT` supplied by Render).

## Enable live mode on Render

1. Create a Render Web Service from this repository (the included `render.yaml` is preconfigured).
2. Add the private environment variables in Render's Environment settings:
   - `ROBLOX_GROUP_ID=370302186`
   - `ROBLOX_COOKIE` = the value of an authorized Roblox session cookie, without the `Cookie:` prefix
3. Redeploy and open the site. The status pill changes to `LIVE API` only after Roblox returns real limited transactions.

### Verify the deployment

- `GET /api/health` → `{ "ok": true, "liveSalesConfigured": true }` once the cookie is set.
- `GET /api/sales` → `status: "live"`, `connected: true`, and a `sales` array containing only limited items.
- `status: "api-error"` with a 401/403 means the session is invalid or the account lacks the group's *View group revenue* permission.

Roblox can delay or rate-limit transaction reporting, so this is near-live rather than a guaranteed exact-one-minute delivery.

## Security

Never put the Roblox cookie in this repository, in browser JavaScript, in screenshots, or in chat. Use a dedicated authorized account, keep the variable private in Render, and rotate it if it is ever exposed. If the variable is missing or Roblox denies access, the dashboard stays empty instead of showing placeholder sales.
