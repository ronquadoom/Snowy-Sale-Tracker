# Snowy'sz Live Sales Tracker

A dark, Roblox-style live sales dashboard for Snowy'sz community `370302186`.

## Data modes

The dashboard never invents sales. It supports two real-data modes:

1. **Live API mode** — the Node server polls Roblox's group transactions endpoint and the browser refreshes the feed every 60 seconds.
2. **CSV mode** — export **Sales of Goods** from Roblox **Revenue → Sales** and click **IMPORT SALES CSV** in the dashboard.

Normal/non-limited and limited sales are both retained. The default view is **NON-LIMITED**; use **All** or **LIMITEDS** to change the view.

## Run locally

```bash
npm start
```

The server binds to `0.0.0.0` and uses port `4173` locally, or the `PORT` supplied by Render.

Without live credentials configured, the app stays in `CSV REQUIRED` mode and shows no fake records.

## Enable live mode on Render

1. Create a Render Web Service from this repository.
2. Use the included `render.yaml`, or set:
   - Build command: `npm install`
   - Start command: `npm start`
3. Add these environment variables in Render's private Environment settings:
   - `ROBLOX_GROUP_ID=370302186`
   - `ROBLOX_COOKIE` = the value of an authorized Roblox session cookie, without the `Cookie:` prefix
4. Redeploy and open the site. The status changes to `LIVE API` only after Roblox returns real transactions.
5. Verify the deployment before sharing it:
   - Open `https://YOUR-RENDER-URL.onrender.com/api/health` and confirm `liveSalesConfigured: true`.
   - Open `/api/sales` and confirm `configured: true`, `connected: true`, and a `sales` array.
   - A `401` or `403` means the Roblox session is invalid or the account lacks the group's View group revenue permission.

The dashboard polls once per minute. Roblox can still delay or rate-limit transaction reporting, so this is near-live rather than a guaranteed exact-one-minute delivery.

Never put the Roblox cookie in this repository, browser JavaScript, screenshots, or chat. Use a dedicated authorized account, keep the variable private, and rotate it if it is ever exposed. If the variable is missing or Roblox denies access, the dashboard stays empty instead of showing placeholder sales.
