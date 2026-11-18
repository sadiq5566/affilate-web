# DealHaven: affiliate coupons & deals platform (UK, Germany, France, Italy)

One Next.js app does everything: public website, admin dashboard, tracking API and database.

| Part | Where | URL (dev) |
|---|---|---|
| Public coupon & deals website | `app/(site)/` | http://localhost:3000 |
| Admin dashboard | `app/(admin)/admin/` + `components/admin/` | http://localhost:3000/admin |
| Click tracking, postback, admin API | `app/go/`, `app/api/` | `/go/...`, `/api/...` |
| Database, auth, analytics logic | `lib/server/` (SQLite, built into Node) | file `data/app.db` |

## Quick start

```bash
npm install
npm run setup     # creates .env.local (random JWT_SECRET) + the local database + demo content + blog articles
npm run dev       # website + dashboard + API on http://localhost:3000
```

`npm run setup` is safe to repeat: it never overwrites `.env.local` and never wipes data. Needs Node 22.13+.

Dashboard: **http://localhost:3000/admin**, login (development): **admin@example.com / admin123** (from `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
Those two only create the **first** account; later change the password in *Admin → Settings*.

### Environment (`.env.local`, see `.env.example`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public URL (canonical links, sitemap, postback URL). Use your https domain in production |
| `DEFAULT_REGION` | Region when the visitor's country is unknown: UK, DE, FR or IT |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First admin account |
| `JWT_SECRET` | Signs admin sessions. 32+ random characters in production |
| `DATA_DIR` | Where `app.db` (SQLite) and `uploads/` live. Needs a persistent disk in production |

In production the app logs a warning if `JWT_SECRET` is short, the admin password is still `admin123` or the site URL is localhost.

### Database commands

| Command | What it does |
|---|---|
| `npm run setup` | everything above in one go |
| `npm run seed` | demo catalog + 60 days of fake clicks/sales (skips if stores exist) |
| `npm run seed:extras` | demo events, German demo shops, one fully filled store |
| `npm run seed:articles` | 7 starter blog articles (never overwrites edited ones) |
| `npm run seed -- --force` | **wipes** catalog and analytics, then reloads the demo |

Back up the `data/` folder to back up everything.

## Blog

Articles live in *Admin → Articles* (Markdown text, topic, author, schedule date, SEO fields, cover image, CSV import/export) and are published at `/blog` and `/blog/{slug}` with Article and Breadcrumb structured data, in the sitemap, and on the homepage.

## Coupon system (from the blueprints in `claude/`)

- **Regions:** UK, Germany, France, Italy (cookie + geo/browser-language detection). Page titles use the local wording, e.g. "Zalando Rabattcode & Gutscheine – November 2026".
- **Coupon types:** *code* ("Show code"), *sale* (no code) and *printable*. Store pages have All / Codes / Sale / Printable tabs (`?coupon_type=`).
- **Show code:** the shop opens in a new tab, this tab shows a pop-up with the code. The real code is **not** in the page HTML: it is loaded from `POST /api/coupons/:id/reveal` (rate limited). The pop-up has its own shareable URL `/stores/{store}/{couponId}`.
- **Trust labels are real data only:** "checked 2h ago" comes from *Last checked* (admin: coupon *verified_at*, bulk action *Mark verified now*); "Popular today" needs 5+ real clicks today; star ratings and success rate only appear when entered on the store (no fake numbers, no rating markup without them).
- **Store page:** rating, "manually checked" badge, stats bar, editor box, FAQ accordion (per store, or generic defaults) with FAQ / Breadcrumb / CollectionPage structured data.
- **Events (Aktionen):** `/events` and `/events/{slug}` (Black Friday…). Manage in Admin → Events, assign coupons on the Coupons page.
- **Search:** live suggestions (stores + offers) in the header and on the home page.
- **Legal:** affiliate disclosure, cookie banner, Impressum template (needed for Germany).
- `npm run seed:extras` adds demo events, German demo shops and one fully filled store to an existing database.

## Admin: filters and CSV

Every list in the dashboard (products, coupons, stores, categories, sales, clicks, subscribers) has:

- **Filters** panel: dropdown filters, min/max ranges (price, commission, times used…), a date range, sorting and page size. Active filters show as removable chips and are remembered per page.
- **Export CSV**: downloads exactly what the current filters show.
- **Import CSV**: upload or paste a CSV (a template can be downloaded in the dialog). Existing items are updated, new ones created, so export → edit in Excel → import works for bulk edits. Empty cells never overwrite existing values. Products and coupons CSVs can use `store_slug, store_name, category, type (code/sale/print)`: missing stores, categories and events are created automatically.

## How the money flow works

```
Visitor clicks "Get Code" / "Get Deal"
   → website /go/coupon/12         (our own domain, rel="sponsored nofollow")
   → the site logs the click with a unique click_id
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

SQLite file at `data/app.db` (uploads in `data/uploads/`). Back up this folder.

```bash
npm run seed -- --force                    # wipe catalog + analytics and reload demo data
npm run seed:clean -- --force              # wipe and load demo catalog only (no fake clicks/sales)
```

**Before going live:** delete the demo stores, coupons and products, or reseed without `--demo`. The demo
merchants are fictional and their links point to example.com.

## Deploying

Deploy as one Next.js app on any Node 22.13+ host **with a persistent disk** (VPS, Railway, Render, Fly.io) because the
database and uploads live in `DATA_DIR`. (Serverless hosts with an ephemeral filesystem, e.g. Vercel, will lose data.)
Set `NEXT_PUBLIC_SITE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DATA_DIR`, then `npm run build && npm start`.
