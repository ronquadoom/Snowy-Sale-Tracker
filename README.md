# Snowy'sz Live Limited Sales Tracker

A classic Roblox `Null_Plainsky`-themed live dashboard for Snowy'sz community `370302186` that tracks **only limited UGC sales** streamed from the real Roblox **Revenue › Sales** API, plus an **in-stock limited UGC tracker** for the 141 supplied catalog IDs. It never invents sales, buyers, prices, timestamps, stock, or revenue.

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

## In-stock limited UGC tracker

Alongside the live sales feed, the dashboard tracks the **141 catalog links
supplied for this group** (`catalog-ids.js`) and reports which of them are
**limited, 3,000-copy runs that still have copies in stock**.

The scan uses Roblox's **public** catalog API
(`economy.roblox.com/v2/assets/{id}/details`), so it needs **no cookie and no
session** — it works the moment the service is deployed.

An item is listed only when all three are true:

1. Roblox flags it as limited (`IsLimited`, `IsLimitedUnique`, or the
   collectible's `CollectiblesItemDetails.IsLimited`).
2. Its total print run is exactly **3,000** copies
   (`CollectiblesItemDetails.TotalQuantity`).
3. It still has copies left (`Remaining > 0`).

Everything else is dropped and counted instead of hidden: sold-out runs,
non-limited items, runs that are not 3,000 copies, and items Roblox will not
report (deleted, unreachable, or missing a total stock figure). A missing stock
or price is never treated as zero, and no item is ever listed on a guess.

- `GET /api/in-stock` → the tracked items, `inStockCopies`, and the
  `totals` breakdown (`inStock`, `soldOut`, `nonLimited`, `stockMismatch`,
  `unknownStock`, `unavailable`) whose sum is always the 141 supplied IDs.
- `GET /api/in-stock?refresh=1` forces a new sweep; `?excluded=1` adds the
  per-item reason each excluded ID was dropped.
- Sweeps run 8 lookups at a time, cache each asset for 60 s, retry once on
  429/5xx, and are reused for 45 s so a burst of dashboard refreshes never
  triggers a second 141-request sweep. After the first request the server keeps
  the scan warm every 5 minutes.

Optional tuning environment variables (all have safe defaults):
`UGC_TOTAL_STOCK` (3000), `UGC_SCAN_CONCURRENCY` (8), `UGC_CACHE_TTL_MS`
(60000), `UGC_MIN_SCAN_INTERVAL_MS` (45000), `UGC_POLL_MS` (300000),
`UGC_REQUEST_TIMEOUT_MS` (10000), `UGC_RETRY_DELAY_MS` (400).

## Tests

```bash
npm test
```

The suite (Node's built-in test runner, no dependencies) covers the classifier
against **real payloads captured from the catalog API**, the 3,000-copy and
sold-out exclusions, report aggregation, fetch retry/404 behaviour, the full
141-ID sweep, the `/api/in-stock` endpoint over HTTP, and the dashboard
rendering of the in-stock panel.

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

- `GET /api/health` → `{ "ok": true, "liveSalesConfigured": true }` once the cookie is set, and `stockTracker: { "trackedIds": 141, "requiredTotalStock": 3000, "configured": true }` (the in-stock tracker needs no cookie).
- `GET /api/in-stock` → the limited 3,000-copy runs that still have stock.
- `GET /api/sales` → `status: "live"`, `connected: true`, and a `sales` array containing only limited items.
- `status: "api-error"` with a 401/403 means the session is invalid or the account lacks the group's *View group revenue* permission.

Roblox can delay or rate-limit transaction reporting, so this is near-live rather than a guaranteed exact-one-minute delivery.

## Security

Never put the Roblox cookie in this repository, in browser JavaScript, in screenshots, or in chat. Use a dedicated authorized account, keep the variable private in Render, and rotate it if it is ever exposed. If the variable is missing or Roblox denies access, the dashboard stays empty instead of showing placeholder sales.
