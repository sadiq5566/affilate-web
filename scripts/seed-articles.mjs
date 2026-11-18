/**
 * Adds starter blog articles (guides, saving tips, shopping safety). Existing articles with the same slug are left
 * untouched, so edits you make in Admin → Articles are never overwritten.
 *   npm run seed:articles
 */
import './_env.mjs';
import { get, exec, transaction } from '../lib/server/db.js';

const daysAgo = (d) => new Date(Date.now() - d * 86400e3).toISOString().slice(0, 10);

const articles = [
  {
    slug: 'how-to-use-a-discount-code',
    title: 'How to use a discount code: a simple step-by-step guide',
    tag: 'Guides',
    age: 2,
    excerpt: 'Never used a promo code before? Here is exactly where to find the box, what to type and what to check before you pay.',
    body: `Using a discount code takes about thirty seconds once you know where to look. This guide walks through it from start to finish.

## Step 1: Find a code that fits your order

Open the store page and look at the offers. Every offer says what it is for (for example "10% off orders over 50") and when it ends. Check three things before you click:

- **The minimum spend.** Many codes only work above a certain basket value.
- **The products it covers.** Sale items, gift cards and some brands are often excluded.
- **The end date.** An expired code will simply be refused.

## Step 2: Show and copy the code

Click **Show code**. The shop opens in a new tab and the code appears in a pop-up on this page. Press **Copy code**. Some offers are plain **sales** that need no code: for those you just follow the link and the price is already reduced.

## Step 3: Shop as usual

Add your items to the basket on the shop's own site. Use the tab that opened when you clicked, because the offer is linked to that visit. If you close it and come back later, click the offer again.

## Step 4: Paste the code at checkout

Look for a field called **Promo code**, **Voucher**, **Gift card or discount code** or similar. It is usually in the basket or on the payment page, and sometimes hidden behind a small link such as "Have a code?". Paste the code and press **Apply**.

> Tip: if the total does not change, read the message next to the box. It normally tells you why, such as "minimum order not reached".

## Step 5: Check the price before you pay

Confirm the discount appears in the order summary. If it does, complete your purchase as normal.

## Quick checklist

1. Check the terms and the end date.
2. Copy the code and keep the shop tab open.
3. Paste it in the voucher field.
4. Make sure the total went down.

Still stuck? Read [why a discount code might not work](/blog/why-your-discount-code-is-not-working).`,
  },
  {
    slug: 'why-your-discount-code-is-not-working',
    title: 'Why your discount code is not working (and what to try)',
    tag: 'Guides',
    age: 5,
    excerpt: 'Codes get refused for a handful of predictable reasons. Go through this list before you give up.',
    body: `A code that is refused is annoying, but the cause is usually simple. Work through these in order.

## 1. The code has expired

Codes have end dates, and shops sometimes stop them early when a campaign hits its budget. Check the date on the offer and try another code from the same store.

## 2. You have not reached the minimum spend

Many offers need a minimum basket value, often calculated **after** other reductions and **before** delivery. Add an item or check the exact condition in the offer terms.

## 3. Your items are excluded

Sale items, new arrivals, gift cards, electronics and some brands are commonly excluded. If your basket is full of reduced products, a code is unlikely to stack on top.

## 4. The code is limited to certain customers

Some codes are for **new customers only**, for app orders, for a specific country, or for one use per account. If you have ordered before, a new-customer code will be rejected.

## 5. Two offers cannot be combined

Most shops allow **one** code per order. A free-delivery banner and a percentage code may also conflict.

## 6. A typing detail

- Copy and paste instead of typing.
- Check for a leading or trailing space.
- Codes are often case-sensitive, so keep capital letters.

## 7. The wrong shop or region

A code for the German shop may not work on the UK site. Make sure the offer was meant for the country you are ordering from.

## What to do next

Try a different offer from the store page, look for a plain **sale** that needs no code, or sign up for the shop's own newsletter, which often includes a welcome discount. If a code that is shown as verified does not work, tell the shop's support; they can confirm the current conditions.`,
  },
  {
    slug: 'how-to-spot-a-fake-discount',
    title: 'How to spot a fake discount or a fake sale',
    tag: 'Shopping safety',
    age: 9,
    excerpt: 'Huge percentage numbers are easy to print. Here is how to check whether a "70% off" price is real.',
    body: `A big red "-70%" does not always mean a bargain. Use these checks before you buy.

## Check the "before" price

A discount is only meaningful if the original price was real. Warning signs:

- The "was" price looks far above what the same product costs elsewhere.
- The "sale" never seems to end.
- The same item shows the same "reduced" price every time you visit.

In the EU, a shop that announces a price reduction has to show the **lowest price it charged in the previous 30 days** as the reference. If that number is missing, be cautious.

## Compare the final price

Search for the exact model number in two or three other shops, and include delivery. Sometimes a smaller "discount" at a different shop leaves you with the lowest total.

## Watch for pressure tactics

Countdown clocks that restart, "only 2 left" on every product and pop-ups saying "12 people are looking at this" are designed to rush you. Take a minute and decide calmly.

## Be careful with unknown shops

If an unfamiliar site offers famous brands at extreme prices, slow down:

- Look for a full company name and address, and a working contact page.
- Search the shop name with the word "reviews".
- Check the web address carefully for small spelling changes of a known brand.
- Prefer payment methods with buyer protection, such as a credit card or a trusted wallet.

## Be sceptical of codes from random sources

Codes on social media posts or unknown pages are often outdated or are simply bait to get you to click. A good coupon page shows when an offer was last checked and what the terms are.

## A short checklist

1. Is the original price believable?
2. Is the final price, with delivery, really the lowest?
3. Is the shop one you can verify?
4. Do you actually need the product?`,
  },
  {
    slug: 'black-friday-2026-how-to-prepare',
    title: 'Black Friday 2026: how to prepare and actually save money',
    tag: 'Seasonal',
    age: 12,
    excerpt: 'Black Friday falls on 27 November in 2026. A little preparation beats last-minute scrolling.',
    body: `Black Friday is the Friday after US Thanksgiving. In 2026 that is **27 November**, followed by Cyber Monday on **30 November**. Many shops start their offers days earlier, and some run the whole month.

## Start now, not on the day

- **Make a short list** of things you genuinely need or have been planning to buy.
- **Note today's price** for each item. This is your reference for judging whether a "deal" is real.
- **Set a budget** and stick to it.

## Follow the shops you care about

Sign up to the newsletters of your favourite stores. Early access and member-only codes are common. Use a separate email address if you do not want your main inbox flooded.

## Use codes and sales together, carefully

Many shops allow one code per order and exclude already-reduced items. Check the terms before you rely on a stack of discounts, and look at the [Black Friday page](/events) for current offers.

## Compare before you buy

A lower price at one shop is not always the lowest. Compare the **total including delivery**, and check the return policy: some shops extend returns over the holiday period, others do not.

## Beware of the usual traps

- Prices that are raised before the event and then "reduced".
- Limited stock that sells out before you can pay.
- Unknown shops with unrealistic prices.

Read [how to spot a fake discount](/blog/how-to-spot-a-fake-discount) before you hit "buy".

## On the day

1. Log in to your accounts in advance so checkout is quick.
2. Check your cart total, not just the product price.
3. Keep confirmation emails until the delivery arrives.

The best deal is the one on something you really wanted, at a price you had already decided was fair.`,
  },
  {
    slug: 'how-coupon-sites-make-money',
    title: 'How coupon sites make money, and how we handle it',
    tag: 'Transparency',
    age: 16,
    excerpt: 'Coupon websites are free to use because shops pay a commission. Here is what that means for you.',
    body: `You do not pay to use this site. So where does the money come from? Here is the honest answer.

## Affiliate commission

Many shops run **affiliate programmes**. When you click a link on our site and then buy, the shop can recognise that the sale came from us and pays a small commission, usually a percentage of the order. **The price you pay does not change.**

## What it does not change

- It does not make the product more expensive.
- It does not decide whether a code is shown. Offers are listed because they exist and are checked, not because a shop pays more.
- You can still go straight to any shop. You only help the site when you use our link.

## Why links are marked as sponsored

Affiliate links are tagged so that search engines understand they are commercial, and we show a notice on pages that contain them. See our [affiliate disclosure](/affiliate-disclosure) for the details.

## How we treat codes

- We show **when an offer was last checked**, and only mark something as verified after it has been tested.
- Expired offers disappear automatically.
- We do not invent ratings, user counts or "limited" claims. If a number is on the page, it comes from real data.

## Your data

If you subscribe to the newsletter, we ask for your consent first, and you can unsubscribe at any time. Read the [privacy policy](/privacy) for what we store.

## Why this model works

Shops want customers, shoppers want lower prices, and a site in the middle can help both. That is only worth doing if the offers are accurate, so keeping them accurate is the whole job.`,
  },
  {
    slug: 'save-more-online-without-chasing-every-deal',
    title: '7 simple ways to save more online without chasing every deal',
    tag: 'Saving tips',
    age: 21,
    excerpt: 'You do not need to refresh deal pages all day. A few habits save more than any single coupon.',
    body: `Saving money online is mostly about a few repeatable habits.

## 1. Wait 24 hours for non-essentials

Put the item in your basket and leave it. If you still want it tomorrow, buy it. Many impulse purchases disappear on their own.

## 2. Always look for a code before checkout

Make it a habit: open the store's coupon page first, then go to the shop. It costs a minute and often saves 5 to 15 percent.

## 3. Compare the total, not the sticker price

Delivery, return costs and import fees can erase a small discount. Compare the **final amount** at checkout.

## 4. Join the newsletter once, for the welcome offer

Many shops give a first-order discount for subscribing. You can unsubscribe afterwards.

## 5. Buy what you need in one order

If a shop has free delivery above a threshold, combine items in a single basket instead of ordering several times.

## 6. Use end-of-season sales for things you can plan

Winter coats in February, garden furniture in September. If it can wait, it is usually cheaper later.

## 7. Check the return policy first

A cheaper item you cannot easily return is not always a saving. Read [your rights when buying online](/blog/returns-and-cancelling-orders-uk-eu) and the shop's own policy.

## The real secret

Spend less on things you do not need. A code saves a percentage; skipping a purchase saves all of it.`,
  },
  {
    slug: 'returns-and-cancelling-orders-uk-eu',
    title: 'Returns and cancelling online orders: your rights in the UK and EU',
    tag: 'Shopping safety',
    age: 27,
    excerpt: 'A quick overview of the 14-day cancellation right for online purchases, plus the main exceptions.',
    body: `This is general information, not legal advice. Rules differ by country and product, so check official consumer sources for your situation.

## The 14-day cancellation right

In the **EU**, and under the **UK's Consumer Contracts Regulations**, you can generally cancel an online (distance) purchase of goods within **14 days of receiving them** without giving a reason. You then normally have a further period (also 14 days in most cases) to send the goods back. The shop must refund the price and standard delivery, usually within 14 days after it receives the goods or proof you sent them back.

## Common exceptions

The right to cancel usually does **not** apply to:

- Items made to your specification or clearly personalised.
- Sealed hygiene or health products once unsealed.
- Perishable goods.
- Digital content you have started to download, after you agreed it starts immediately.
- Certain travel and accommodation bookings for a specific date.

## Who pays for the return

The shop must tell you before you order who pays return postage. If it does not, the shop may have to cover it. Always read this on the product or checkout page.

## Faulty items are a different matter

If something is faulty or not as described, you have separate legal rights to a repair, replacement or refund, and these usually last much longer than 14 days. Contact the seller and keep your order confirmation and photos.

## Payment protection

Paying by credit card can add protection. In the **UK**, Section 75 of the Consumer Credit Act can make the card provider jointly responsible for purchases between £100 and £30,000. Debit-card and wallet protections vary by provider.

## Practical tips

1. Keep the order email and delivery receipt.
2. Photograph the item when it arrives.
3. Return within the stated window and keep proof of postage.
4. Use the shop's official returns process.`,
  },
];

let added = 0;
transaction(() => {
  for (const a of articles) {
    if (get('SELECT id FROM articles WHERE slug = ?', [a.slug])) continue;
    exec(
      `INSERT INTO articles (title, slug, excerpt, body, tag, author, published_at, seo_description, is_active)
       VALUES (?, ?, ?, ?, ?, 'Editorial team', ?, ?, 1)`,
      [a.title, a.slug, a.excerpt, a.body, a.tag, daysAgo(a.age), a.excerpt],
    );
    added++;
  }
});
console.log(`Articles: ${added} added, ${articles.length - added} already present.`);
