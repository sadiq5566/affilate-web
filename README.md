# DealHaven: affiliate coupons & deals platform (UK, France, Italy)

A complete affiliate-marketing setup in one repo:

| Folder | What it is | Tech | Dev URL |
|---|---|---|---|
| `server/` | API, database, affiliate click tracking, commission postbacks | Node 22+, Express 5, SQLite (built into Node) | http://localhost:4000 |
| `website/` | Public coupon & deals website (SEO-friendly, server rendered) | Next.js 15 | http://localhost:3000 |
| `dashboard/` | Admin dashboard: manage everything and see earnings | React + Vite + Recharts | http://localhost:5173 |

## Quick start

```bash
npm run setup     # install everything + create the database with demo data
npm run dev       # start API + website + dashboard together
```

Dashboard login (development): **admin@example.com / admin123**. Change it in *Dashboard → Settings*,
or set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env` **before the first start**.

Copy `server/.env.example → server/.env`, `website/.env.example → website/.env.local` and
`dashboard/.env.example → dashboard/.env` to configure things.

## How the money flow works

```
Visitor clicks "Get Code" / "Get Deal"
   → website /go/coupon/12         (our own domain, rel="sponsored nofollow")
   → API logs the click with a unique click_id
   → 302 redirect to your affiliate link with ?clickref=<click_id>  (or wherever you put {click_id})
   → visitor buys at the shop
   → the affiliate network calls our postback URL with the click_id + commission
   → conversion appears in Dashboard → Sales & Leads and on the Overview charts
```

1. **Add a store** (Dashboard → Stores) with the tracking link you got from the network (Awin, CJ, Impact,
   Rakuten, Tradedoubler…), the **Sub-ID parameter** for that network (Awin `clickref`, CJ `sid`,
   Impact `subId1`, Rakuten `u1`, Tradedoubler `epi`) and the commission rate.
2. **Add coupons and products** for that store. Each one can have its own deep link; if it doesn't, the
   store link is used. Pick the region (UK / FR / IT / All) where it should show.
3. **Connect sales tracking:** copy the postback URL from *Dashboard → Settings* into each network's
   S2S/postback settings. Networks without postbacks: download their transactions CSV and use
   *Sales & Leads → Import CSV*. You can also add sales manually.
4. Sales sent again with the same `order_ref` are **updated**, so status changes (pending → approved → paid) flow through.

## Dashboard features

- **Overview**: commission, sales, conversions, clicks, conversion rate and EPC, each compared with the previous period;
  daily charts; earnings by status (pending / approved / paid / rejected); top stores; regions; most-clicked offers;
  warnings about coupons that are about to expire. GBP and EUR are converted into one reporting currency (Settings).
- **Products, Coupons, Stores, Categories**: add, edit and delete items, with search, filters, bulk actions and image upload.
- **Sales & Leads**: add sales by hand, import or export CSV, and bulk-mark sales approved, paid or rejected.
- **Clicks**: the full click log with the click ID, and whether the click turned into a sale.
- **Subscribers**: newsletter sign-ups with GDPR consent, and a CSV export.
- **Settings**: site name, contact email, default region, exchange rates, postback URL and token, and your password.

## Website features

- Region switch (🇬🇧 UK / 🇫🇷 FR / 🇮🇹 IT). On a visitor's first visit the region is picked from Vercel or Cloudflare geo headers, or from the browser language.
- Home page, coupon list (filter and sort), product deals, store pages (“Brand Discount Codes – Month Year”), categories, and search.
- Click-to-reveal coupon codes: the shop opens in a new tab and the code is shown in a pop-up with a copy button.
- SEO: server rendering, a page title and description for every page, canonical URLs, `sitemap.xml`, `robots.txt`, Product JSON-LD, and `rel="sponsored"` on affiliate links.
- Compliance for the UK and EU: an affiliate disclosure page, a cookie consent banner, privacy and terms page templates, and newsletter consent.
  **The legal pages are templates. Have them reviewed before launch.**
- English only for now. Text lives in the page components, so translation (FR / IT) can be added later with next-intl or a similar library.

## Database

SQLite file at `server/data/app.db` (uploads in `server/data/uploads/`). Back up this folder.

```bash
npm run seed -w server -- --force          # wipe catalog + analytics and reload demo data
node server/src/seed.js --force            # wipe and load demo catalog only (no fake clicks/sales)
```

**Before going live:** delete the demo stores, coupons and products, or reseed without `--demo`. The demo
merchants are fictional and their links point to example.com.

## Deploying

- **API (`server/`)**: any Node 22.13+ host with a persistent disk (Railway, Render, Fly.io, a VPS). Set
  `API_PUBLIC_URL`, `SITE_URL`, `CORS_ORIGINS`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
- **Website (`website/`)**: Vercel or any Node host. Set `API_URL` (where the API is) and `NEXT_PUBLIC_SITE_URL`.
- **Dashboard (`dashboard/`)**: `npm run build -w dashboard` builds a static site in `dashboard/dist`. Host it anywhere
  (Netlify, Vercel, Cloudflare Pages) and set `VITE_API_URL` to the API URL at build time.
