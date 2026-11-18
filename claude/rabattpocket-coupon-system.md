# RabattPocket.de: Coupon System ka Analysis (aur apni site me banane ka guide)

> Ye analysis sirf public front-end se kiya gaya hai (page markup, public REST discovery, store page HTML). Server ka PHP code / database dekha nahi gaya. Jahan "andaza" likha hai, wo front-end se nikala gaya inference hai.

---

## 1. Site kis cheez par bani hai

| Cheez | Detail |
|---|---|
| CMS | **WordPress** (generator meta: 7.1.4) |
| Theme | **`coupon-press`** (body class: `wp-theme-coupon-press`) |
| Hosting/Plugins | Hostinger tools, LiteSpeed Cache, Yoast SEO, Contact Form 7, Google Site Kit, Code Snippets, JWT Auth |
| Custom plugin | **`uca`** (REST namespace `uca/v1`), shayad "assistant" ke liye |
| Analytics | Microsoft Clarity (`p.clarity.ms`) |
| CSS prefix | `rp-*` (layout), `rprx-*` (coupon card) |

**Data model (URL aur body classes se):**

- **Store** = custom taxonomy `coupon_store` (body class: `tax-coupon_store term-zalando-rabattcode term-112`), URL: `/store/{slug}-rabattcode/`
- **Category** = taxonomy, URL: `/coupon-category/{slug}/` (fashion, electronics, travel, ...)
- **Coupon** = individual item (ID jaise `3739`), URL: `/store/{store-slug}/{coupon-id}/`
- **Aktionen / Events** = `/aktionen/{slug}/` (Black Friday, Cyber Monday, Singles Day...), dates ke saath
- **Blog** = normal WP posts

Note: `/wp-json/wp/v2/types` me coupon type REST me **expose nahi** hai, yaani coupons ka data WordPress REST API se public nahi milta. Sab kuch **server-side render** hota hai (PHP templates), JS se fetch nahi hota.

---

## 2. Homepage data kaise dikhata hai

Homepage (`templates/frontpage.php`) ke sections, upar se neeche:

1. **Navbar**: Geschäfte, Kategorien, Aktionen (dropdown), Blog + search box
2. **Hero**: heading, search input (combobox), "Beliebte Shops" chips (SHEIN, zalando...)
3. **Deal slider**: `complementary` block, store naam + category
4. **Aktuelle Top-Gutscheine**: cards: store logo, `10€ Rabattcode`, short description, `✓ Verifiziert`
5. **Top-Kategorien**: 8 category cards (image + title + CTA)
6. **Beliebte Gutscheine & Rabattcodes**: asli coupon cards (code reveal wale)
7. **Aktuelle Shopping-Anlässe**: event cards (Black Friday 27. Nov 2026 etc.)
8. **Event overview, SEO text, 6-Step guide, Blog (latest 3), Newsletter, Footer**
9. **Floating Assistant** ("Rabattpocket-Assistent") + sticky "JETZT SPAREN" button

Ye saari lists PHP me `WP_Query` / `get_terms()` se banti hain aur HTML me hi aa jaati hain (isliye page load par koi data-API call nahi dikhi, sirf Clarity).

---

## 3. Coupon card ka structure (`rprx-*`)

Har coupon ek `<article>` hai:

```html
<article id="rprx-card-3739" class="rprx-card rprx-is-top rprx-value-one-line">
  <div class="rprx-main">
    <div class="rprx-ticket">           <!-- left: ticket jaisa badge -->
      <span class="rprx-value-primary">5€</span>
      <div class="rprx-ticket-label">RABATTCODE</div>
    </div>
    <div class="rprx-content">
      <div class="rprx-verified">Verifiziert</div>
      <span class="rprx-top-badge">TOP GUTSCHEINCODE</span>
      <!-- title + description -->
    </div>
  </div>
  <div class="rprx-footer">
    <button class="rprx-details rprx-toggle" aria-controls="rprx-details-3739">Mehr Informationen</button>
    <div class="rprx-button-box">
      <a class="rprx-reveal js-btn-co"
         href="/store/zalando-rabattcode/3739/"
         data-type="code"
         data-coupon-id="3739"
         data-aff-url="https://rabattpocket.de/out/3739"
         data-code="THE-REAL-CODE">
        <span class="rprx-code-peek">...last chars...</span>
        <span class="rprx-reveal-cover">CODE ANZEIGEN</span>
      </a>
    </div>
  </div>
</article>
```

Dusre type ka button (deal, bina code):
```html
<a href="https://www.dpbolvw.net/click-...">ZUM DEAL</a>   <!-- seedha affiliate link -->
```

### Code reveal ka flow (kaise kaam karta hai)

1. Card par code **pehle se HTML me** `data-code` attribute me hota hai.
2. UI me sirf **aakhri kuch characters** (`rprx-code-peek`) dikhte hain, upar `CODE ANZEIGEN` ka cover.
3. Click par JS (`js-btn-co`):
   - code **clipboard me copy** karta hai,
   - cover hata deta hai,
   - **naye tab me** `/store/{slug}/{id}/` kholta hai (code popup wala page) aur/ya `data-aff-url` (`/out/{id}`) par bhejta hai.
4. `/out/{id}` ek **server-side redirect** hai (302): click track karta hai, phir merchant ka **affiliate link** (CJ, `dpbolvw.net` jaise) par bhej deta hai. Ye "cloaking" kehlata hai, taaki affiliate URL HTML me na dikhe aur clicks count ho sakein.

### Verified / Top / Expiry
Badges (`Verifiziert`, `TOP GUTSCHEINCODE`, `NEW`) coupon ke meta fields se aate hain (andaza: `is_verified`, `is_top`, `is_new`, `expires_at`).

---

## 4. SEO layer

Store page par:
- `H1` + `H2` ke saath **template text** ("Zalando Rabattcode - November 2026": mahina/saal auto-update)
- JSON-LD `@graph`: `Organization`, `WebSite`, `Brand`, `Store`, `BreadcrumbList`, `CollectionPage` (Yoast se)
- Meta description har store ke liye alag
- Neeche FAQ-type sections: "So löst du einen Rabattcode ein", "Warum funktioniert er nicht", "Transparenz" (affiliate disclosure)
- "Ähnliche Rabattcodes" aur "Weitere beliebte Angebote" se internal linking

---

## 5. Chatbot / Assistant (`uca/v1`)

Floating widget "Rabattpocket-Assistent", label: *"Live-Gutscheindaten"*, aur note: *"Keine kostenpflichtige KI-API. Gutscheinsuchen bleiben auf dieser Website."*

Yaani ye **koi LLM nahi**, balki apni database par search hai. REST endpoints (route discovery se):

| Endpoint | Method | Kaam (andaza) |
|---|---|---|
| `/wp-json/uca/v1/session` | GET | chat session/nonce banana |
| `/wp-json/uca/v1/chat` | POST | user ka text -> matching store/coupons wapas |
| `/wp-json/uca/v1/seasonal-events` | POST | current events (Black Friday...) |
| `/wp-json/uca/v1/seasonal-offers` | POST | event ke offers |
| `/wp-json/uca/v1/request-store` | POST | "mera shop nahi mila" request |
| `/wp-json/uca/v1/watch`, `/unwatch` | POST | coupon alert subscribe/unsubscribe |

POST body ka exact format maine test nahi kiya (kisi ke database par random POST bhejna theek nahi). Ye apni site me aap khud design karoge.

---

## 6. Apni website me ye kaise banaye

### Option A: WordPress par (sabse aasan, same stack)

1. Ek coupon theme/plugin lo (jaise **WP Coupons and Deals**, ya custom plugin).
2. Custom Post Type `coupon` + taxonomies `coupon_store`, `coupon_category` banao.
3. Coupon meta fields: `code`, `type` (code/deal), `affiliate_url`, `expires_at`, `is_verified`, `is_top`, `discount_label`.
4. Store (taxonomy term) meta: logo, description, website, SEO text.
5. `/out/{id}` ke liye rewrite rule + redirect handler.

### Option B: Custom stack (Next.js / Laravel / Node)

Minimal database schema:

```sql
CREATE TABLE stores (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  website_url TEXT,
  seo_title TEXT, seo_description TEXT
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT
);

CREATE TABLE coupons (
  id SERIAL PRIMARY KEY,
  store_id INT REFERENCES stores(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('code','deal')) NOT NULL,
  code TEXT,                       -- NULL agar deal hai
  discount_label TEXT,             -- "10€", "20%", "BIG SALE"
  affiliate_url TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  is_top BOOLEAN DEFAULT FALSE,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  clicks INT DEFAULT 0
);

CREATE TABLE coupon_categories (
  coupon_id INT REFERENCES coupons(id),
  category_id INT REFERENCES categories(id)
);

CREATE TABLE events (            -- Aktionen
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE, name TEXT,
  starts_on DATE, ends_on DATE
);
```

Routes:

| Route | Page |
|---|---|
| `/` | Home (top coupons, categories, events) |
| `/store/[slug]` | Store ke saare active coupons |
| `/store/[slug]/[couponId]` | Code popup page |
| `/coupon-category/[slug]` | Category listing |
| `/aktionen/[slug]` | Event page |
| `/out/[couponId]` | Click track + 302 affiliate redirect |
| `/api/search?q=` | Search / assistant |

`/out/[id]` ka logic (pseudo):

```js
export async function GET(req, { params }) {
  const c = await db.coupon.findUnique({ where: { id: +params.id } });
  if (!c) return new Response('Not found', { status: 404 });
  await db.coupon.update({ where: { id: c.id }, data: { clicks: { increment: 1 } } });
  return Response.redirect(c.affiliate_url, 302);
}
```

Code reveal JS:

```js
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.js-btn-co');
  if (!btn) return;
  e.preventDefault();
  await navigator.clipboard.writeText(btn.dataset.code);
  btn.classList.add('revealed');
  window.open(btn.dataset.affUrl, '_blank', 'noopener,sponsored');
});
```

---

## 7. Data import kaise hoga

Original site ka data **scrape/copy mat karna**: coupons, descriptions aur SEO text unke copyright me aate hain, aur codes asal me merchant/affiliate network ke hote hain. Sahi tareeka ye hai ki data **apne affiliate accounts se import karo**:

### Sources
1. **Affiliate network feeds / APIs** (sabse sahi):
   - **CJ Affiliate** (is site ke links `dpbolvw.net` = CJ): Link Search / Product Feed APIs
   - Awin, Impact, Tradedoubler, Admitad, Rakuten: sab ke coupon/promotion feeds (CSV/XML/JSON) hote hain
2. **Manual CSV** (chhote start ke liye) aur
3. **Admin panel** se ek ek coupon add karna.

### CSV format (template)

```csv
store_slug,store_name,title,type,code,discount_label,description,affiliate_url,category,is_verified,expires_at
zalando,Zalando,5€ Rabattcode,code,SAVE5,5€,5€ Rabatt auf deine erste Bestellung,https://aff.example/click?id=1,fashion,1,2026-12-31
odenson,Odenson,20% Rabatt,code,BEARD20,20%,20% auf alles,https://aff.example/click?id=2,beauty,1,
```

### Import script (Node.js + CSV)

```js
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const rows = parse(fs.readFileSync('coupons.csv'), { columns: true, skip_empty_lines: true });

for (const r of rows) {
  const store = await db.store.upsert({
    where: { slug: r.store_slug },
    update: {},
    create: { slug: r.store_slug, name: r.store_name },
  });
  await db.coupon.upsert({
    where: { store_id_title: { store_id: store.id, title: r.title } },
    update: { code: r.code || null, affiliate_url: r.affiliate_url, expires_at: r.expires_at || null },
    create: {
      store_id: store.id, title: r.title, type: r.type, code: r.code || null,
      discount_label: r.discount_label, description: r.description,
      affiliate_url: r.affiliate_url, is_verified: r.is_verified === '1',
      expires_at: r.expires_at || null,
    },
  });
}
```

WordPress par: **WP All Import** plugin se wahi CSV/XML feed `coupon` post type me map ho jaati hai, aur cron se auto-update bhi.

### Daily maintenance
- Cron job: expired coupons (`expires_at < now()`) ko hide karo
- Feed se naye coupons/links daily sync
- "Verified" tab dikhao jab aap ne actually check kiya ho (galat "verified" label legal/trust issue hai)

---

## 8. Legal / compliance (Germany ke liye zaroori)

- **Affiliate disclosure** dikhao (original site: *"Wir erhalten ggf. eine Provision..."* aur `Werbemethoden & Transparenz` page)
- **Impressum, Datenschutz, AGB** pages (German law)
- **Cookie consent** (Clarity/Analytics se pehle)
- Affiliate links par `rel="sponsored nofollow noopener"`

---

## 9. Build checklist

- [ ] DB schema (stores, coupons, categories, events)
- [ ] Store / category / event pages (server-rendered, SEO ke liye)
- [ ] Coupon card component + code reveal JS
- [ ] `/out/{id}` redirect + click tracking
- [ ] Search endpoint (`LIKE` / full-text) aur optional chat widget
- [ ] CSV / affiliate-feed importer + cron
- [ ] JSON-LD (`Store`, `BreadcrumbList`, `CollectionPage`), sitemap
- [ ] Legal pages + disclosure
