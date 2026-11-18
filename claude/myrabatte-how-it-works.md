# MyRabatte.de — Kaise kaam karti hai (Coupon / Deals Website Blueprint)

> Ye document myrabatte.de ke public pages (homepage, shop page, coupon popup) dekh kar bana hai.
> Jo cheezein site se directly dikhti hain wo **[Observed]** hain, jo backend ka andaza hai wo **[Inferred]** hai.

---

## 1. Business model (site paisa kaise kamati hai)

- Site ek **coupon / voucher aggregator** hai (Germany market, language: German).
- Users ko **free** coupons dikhte hain, registration ki zarurat nahi. **[Observed]**
- Jab user coupon ke baad shop par jaakar kharidta hai, to shop se **affiliate commission** milta hai.
  Site ke hero text me bhi likha hai: "Wir erhalten ggf. eine Provision bei Käufen über unsere Links". **[Observed]**
- Isliye har button ("Zum Shop", "Gutschein anzeigen", "Kopieren & Weiter") ka final goal = user ko **affiliate link** par bhejna.

---

## 2. Site structure (pages / URLs)

| Page | URL pattern | Kaam |
|---|---|---|
| Homepage | `/` | Search bar, popular shops ke logos, top offers chips, SEO text |
| Saare shops | `/alle-geschaefte/` | Shops ki A–Z list |
| Categories | `/kategorien/` | Mode, Technik, Haus & Garten etc. |
| Category page | `/coupon-category/{slug}/` | e.g. `/coupon-category/black-friday-rabattcode/` |
| Shop (store) page | `/gutscheine/{shop}-rabattcode/` | Us shop ke saare coupons |
| Single coupon | `/gutscheine/{shop}-rabattcode/{coupon_id}/` | Coupon popup khulta hai (code reveal) |
| Filter | `?coupon_type=all\|code\|sale\|print` | Shop page par tabs filter |
| Affiliate redirect | `/go-store/{store_id}` | Shop ki website par bhejta hai (affiliate URL) |
| Blog | `/blog/` | SEO content |

**[Inferred]** URL structure (`go-store`, `coupon_type=code/sale/print`, `coupon-category`) WordPress coupon themes jaise **WP Coupon (FameThemes)** se match karta hai. Aap chaho to wahi theme/plugin use kar sakte ho, ya custom bana sakte ho.

---

## 3. Homepage ka flow

1. **Hero**: "Alle Gutscheine & Angebote auf einen Blick" + bada search bar ("Suche nach Marken oder Produkten...").
2. **Quick chips**: top deals jaise `NordVPN – Bis zu 70%`, `Inateck – 20% Rabatt`, `Mepal – Sale 25%`.
   Har chip = ek shop page ka link.
3. **Shop logo grid**: popular shops (Bond Touch, Trip.com, iScooter ...) — logo par click = shop page.
4. **Header menu**: Shops, Kategorien, Blog, aur ek highlighted seasonal button (**Black Friday 2026**).
5. **SEO text section**: about us, mission, top categories, "Geprüfte Qualität" (verification process), trust numbers (5+ saal, 10.000+ users, 100% free).
6. **Floating chat/"Sparfuchs" button** (bottom right) — mascot assistant. **[Observed]**

---

## 4. Shop (store) page — sabse important page

Example: `/gutscheine/nordvpn-rabattcode/`

### 4.1 Top header (hero card)
- Shop logo
- Rating: `Ø 4.8 (110 Reviews)` (stars)
- H1: **"{Shop} Rabattcode & Gutscheine – {Monat Jahr}"** (month/year automatic update, SEO ke liye)
- Badges: `Manuell geprüft`, `Update: November 2026`
- Short description + "Mehr lesen"
- 2 buttons: **BESTER DEAL** (scroll to coupon list) aur **ZUM SHOP** (`/go-store/{id}`)
- Stats bar: `Täglich verifiziert`, `7 Aktive Gutscheine`, `100% Kostenlos`, `25k+ Nutzer sparen`
  (active coupons count dynamic hota hai)

### 4.2 Filter tabs
`Alle (7)` · `Gutscheincode (5)` · `Angebote (2)` · `Printable (0)`
- **Gutscheincode** = code jo checkout par dalna hai
- **Angebote / Sale** = deal jisme code nahi, sirf link se discount milta hai
- **Printable** = print karke store me use hone wala coupon

### 4.3 Left sidebar
- Editor box ("Marie Hoffmann – Manuelle Prüfung") → trust/E-E-A-T
- `Zuletzt geprüft: 17.11.2026`
- `Erfolgsrate: 95% Verified`
- User rating (stars)
- **FAQ accordion** (shop-specific questions, FAQ schema ke liye achha)

### 4.4 Coupon card (har deal ka card)
Har card me ye elements hain **[Observed]**:

```
[ Left color block: 20% RABATT ] | Title: "NordVPN Rabattcode: 20% Rabatt auf VPN-Schutz"
                                 | Badges: ✔ VERIFIZIERT · "Vor 2h geprüft" · 📅 Ablaufdatum · 👥 "80 Mal benutzt"
                                 | Short description (2 lines, truncated)
                                 | [ GUTSCHEIN ANZEIGEN ] (button jiske peeche code ke last letters halke dikhte hain)
                                 | 🔥 "Stark nachgefragt!" (sirf popular coupons par)
```

- **Discount block** (left): percent / € / "Gratis Versand" / "Sale" — alag colors (orange = top, dark red = normal).
- **Ticket look**: left aur right side par half-circle cutouts (CSS) — coupon jaisa dikhne ke liye.
- **Code teaser**: button ke peeche code ke aakhri 2-3 letters blur me dikhte hain taaki user ko lage code "peeche chhupa hai".
- **Social proof**: "80 Mal benutzt", "Stark nachgefragt!", "Vor 2h geprüft".
- **Urgency**: expiry date (e.g. `Nov 19, 2026`).

---

## 5. "Gutschein anzeigen" click par kya hota hai (Code reveal flow)

Ye is site ka core trick hai:

1. User **GUTSCHEIN ANZEIGEN** par click karta hai.
2. **Naya tab** shop ke affiliate link par khulta hai (`/go-store/...`), aur **purane tab me popup (modal)** khulta hai.
   URL change hota hai → `/gutscheine/{shop}-rabattcode/{coupon_id}/`. **[Inferred]** (popup + URL share-able hai)
3. Popup me dikhta hai **[Observed]**:
   - Shop logo + green badge `HEUTE GEPRÜFT`
   - Coupon title
   - Progress bar: **"Sehr beliebt! — 94% heute eingelöst"** (urgency / social proof)
   - `DEIN GUTSCHEINCODE LAUTET:` → code (monospace, dashed border) e.g. `SPRING`
   - Buttons: **Kopieren & Weiter** (copy + shop kholna), **CODE KOPIEREN** (sirf copy), **Zum Shop >**
   - `Einlösehinweise` (kaise use karna hai: "Code direkt im Warenkorb des Shops einlösen")
   - **Newsletter signup**: "Keinen Gutschein mehr verpassen" → email field + privacy checkbox (Datenschutz consent) + `EINTRAGEN`
4. Agar coupon type = **Sale** (code nahi) → popup me code ke bajay sirf "Zum Angebot" button aata hai.

> Kyun ye kaam karta hai: click = affiliate cookie set ho jaata hai (naye tab me shop khulta hai), aur user ko code bhi mil jaata hai. Conversion rate high rehta hai.

---

## 6. Trust & SEO elements (jo site use karti hai)

- "Manuell geprüft", "Täglich verifiziert", "Vor 2h geprüft" labels
- Author box with name + photo
- Auto-updating month/year in title and H1 (`November 2026`)
- Ratings + review count (Schema.org `AggregateRating` laga sakte ho)
- FAQ accordion (Schema.org `FAQPage`)
- Seasonal landing pages (Black Friday etc.)
- Long SEO text on homepage with categories
- Cookie/consent + Datenschutz link (Germany me GDPR/DSGVO zaroori)
- Affiliate disclosure text ("Wir erhalten ggf. eine Provision")

---

## 7. Data model (apni website par implement karne ke liye)

### `stores`
| Field | Type | Note |
|---|---|---|
| id | int | e.g. 401 |
| name | string | NordVPN |
| slug | string | `nordvpn` → URL `/gutscheine/nordvpn-rabattcode/` |
| logo_url | string | |
| description | text | SEO text, "Mehr lesen" |
| affiliate_url | string | Tracking link (Awin/CJ/Impact/Partnerize etc.) |
| rating_avg / rating_count | float / int | |
| category_id | fk | |
| last_checked_at | datetime | "Zuletzt geprüft" |
| success_rate | int | 95 |
| faq | json | list of Q/A |

### `coupons`
| Field | Type | Note |
|---|---|---|
| id | int | e.g. 4973 |
| store_id | fk | |
| title | string | |
| type | enum | `code` \| `sale` \| `print` |
| code | string/null | `SPRING` |
| discount_label | string | `20%`, `15 €`, `Gratis Versand` |
| description | text | |
| expires_at | date/null | |
| verified_at | datetime | "Vor 2h geprüft" calculate karo |
| is_featured | bool | "Stark nachgefragt!" / orange card |
| used_count | int | "80 Mal benutzt" (click par +1) |
| usage_note | text | "Einlösehinweise" |
| status | enum | active / expired / hidden |
| custom_affiliate_url | string/null | coupon-specific deep link (optional) |

### Baaki tables
- `categories` (id, name, slug, parent_id)
- `coupon_categories` (many-to-many)
- `subscribers` (email, consent_at, ip, source_coupon_id)
- `click_logs` (coupon_id, store_id, ts, referrer, user_agent_hash) — analytics ke liye
- `reviews` (store_id, rating, text, created_at)

---

## 8. Routes / API (simple version)

```
GET  /                              → homepage (top stores, categories, search)
GET  /alle-geschaefte/              → all stores
GET  /kategorien/                   → categories
GET  /coupon-category/:slug         → category listing
GET  /gutscheine/:store-rabattcode  → store page (?coupon_type=code|sale|print)
GET  /gutscheine/:store-rabattcode/:couponId → same page + auto-open modal for that coupon
GET  /go-store/:storeId             → 302 redirect to affiliate_url (+ log click)
GET  /go-coupon/:couponId           → optional, coupon-specific redirect
POST /api/coupons/:id/reveal        → returns code, increments used_count, logs click
POST /api/subscribe                 → newsletter (with consent)
GET  /api/search?q=nord             → autocomplete (stores + coupons)
```

**Wichtig:** Code ko HTML me plain mat daalo agar reveal-tracking chahiye; `reveal` API se laao taaki har reveal count ho aur bots limit ho sakein.

---

## 9. Frontend implementation (step-by-step)

### Step 1 — Coupon card
```html
<article class="coupon-card" data-id="4973" data-type="code">
  <div class="coupon-discount"><strong>20%</strong><span>RABATT</span></div>
  <div class="coupon-body">
    <h3>NordVPN Rabattcode: 20% Rabatt auf VPN-Schutz</h3>
    <ul class="badges">
      <li class="verified">✔ Verifiziert</li>
      <li>Vor 2h geprüft</li>
      <li>📅 19.11.2026</li>
      <li>👥 80 Mal benutzt</li>
    </ul>
    <p>Sichern Sie sich 20% Rabatt ...</p>
  </div>
  <div class="coupon-action">
    <button class="btn-reveal">Gutschein anzeigen <span class="code-peek">NG</span></button>
    <div class="hot">🔥 Stark nachgefragt!</div>
  </div>
</article>
```

### Step 2 — Reveal logic (JavaScript)
```js
document.querySelectorAll('.btn-reveal').forEach(btn => {
  btn.addEventListener('click', async () => {
    const card = btn.closest('.coupon-card');
    const id = card.dataset.id;
    const storeUrl = `/go-coupon/${id}`;

    // 1) naya tab me affiliate link kholo (user click ke andar hi, warna popup blocker)
    window.open(storeUrl, '_blank', 'noopener');

    // 2) URL update + modal open
    history.pushState({}, '', `${location.pathname.replace(/\/\d+\/?$/, '')}${id}/`);
    const data = await fetch(`/api/coupons/${id}/reveal`, { method: 'POST' }).then(r => r.json());
    openModal(data); // title, code, usage_note, percent_used_today
  });
});

function copyCode(code) {
  navigator.clipboard.writeText(code);
  // button text → "Kopiert ✔"
}
```

### Step 3 — Modal contents
- Logo, `Heute geprüft` badge, title
- Progress bar ("94% heute eingelöst") — **sirf real data se dikhao** (see Section 11)
- Code box + `Code kopieren` + `Kopieren & Weiter`
- `Einlösehinweise`
- Newsletter form with checkbox

### Step 4 — Filter tabs
Query param `?coupon_type=` se server-side filter, ya JS se client-side hide/show. Counts (`Alle (7)`) DB se aao.

### Step 5 — Search
Input par debounce (250ms) → `/api/search?q=` → dropdown me stores + top coupons.

### Step 6 — Styling notes
- Palette: dark maroon/burgundy gradient header + orange (#F59E0B → #EA580C) CTA.
- Font: rounded geometric sans (Poppins jaisa).
- Coupon "ticket" look: `radial-gradient` ya pseudo-elements se half-circle cutouts.
- Mobile: card vertical stack, button full width, modal bottom-sheet.

---

## 10. Admin panel (kya manage karna hoga)

- Store add/edit (logo, affiliate link, description, FAQ)
- Coupon add/edit (type, code, expiry, featured)
- **Verification workflow**: har coupon ka `verified_at` manually/auto update ("Vor 2h geprüft" ka matlab ye hai ki cron/admin ne recently check kiya)
- Auto-expire cron: `expires_at < now()` → status `expired` (listing se hata do ya "Abgelaufen" tab me dalo)
- Affiliate network feed import (Awin, Tradedoubler, CJ etc. coupon feeds API deti hain) — manual kaam kam hota hai
- Analytics dashboard: clicks per coupon/store, reveal → click rate

---

## 11. Legal / ethics checklist (Germany ke liye zaroori)

1. **Affiliate disclosure** clearly dikhao (Werbekennzeichnung / "Provisions-Links").
2. **DSGVO**: cookie consent banner, privacy policy, newsletter double-opt-in, consent checkbox.
3. **Impressum** page (Germany me mandatory).
4. **Fake social proof mat dikhao.** "94% heute eingelöst", "Stark nachgefragt", "Vor 2h geprüft" jaise labels sirf tab lagao jab wo **real data** se calculate ho. Fake urgency/claims German UWG (unfair competition law) ke under risky hain.
5. Expired / non-working codes hata do — "Erfolgsrate 95%" jaisa claim tabhi karo jab track karte ho.

---

## 12. Build options

| Option | Kab choose karein |
|---|---|
| **WordPress + coupon theme (WP Coupon)** | Fast launch, admin ready, affiliate redirect built-in |
| **Next.js / Laravel + DB** | Full control, custom UI, API-driven |
| **Static + headless CMS** | SEO-focused, kam traffic, simple |

**Recommended MVP order:**
1. Stores + coupons tables + admin
2. Store page + coupon card
3. Reveal modal + `/go-store` redirect + click logging
4. Search + categories
5. Newsletter + cookie consent
6. SEO (schema, auto month/year, sitemap)
7. Affiliate feed import + auto-expiry cron

---

## 13. Quick summary (1 minute)

1. User shop/coupon dhoondta hai → shop page par jaata hai.
2. Shop page par coupon cards (code / sale / print) dikhte hain with trust badges.
3. **"Gutschein anzeigen"** click → shop naye tab me (affiliate link) + code popup purane tab me.
4. User code copy karke shop par use karta hai → site ko commission.
5. Popup me newsletter signup se repeat visitors milte hain.
6. SEO (month/year titles, FAQs, ratings, long text) se Google traffic aata hai.
