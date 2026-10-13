# Tracked links

Short links for Instagram, WhatsApp and the printed QR code. Each one counts the click and then opens the right page with UTM tags, so we can tell where visitors came from.

## The links

Copy the **short link**; it's what people should see and tap. The full form is what it opens.

| Where to use it                                             | Short link                                   | Opens                                                                             |
| ----------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| Instagram bio (the one link in the profile)                 | https://re-loop-ochre.vercel.app/go/ig-bio   | `/?utm_source=instagram&utm_medium=bio&utm_campaign=reloop-pilot`                 |
| Instagram posts (caption or "link in bio" sticker)          | https://re-loop-ochre.vercel.app/go/ig-post  | `/shop?utm_source=instagram&utm_medium=post&utm_campaign=reloop-pilot`            |
| Instagram stories (link sticker)                            | https://re-loop-ochre.vercel.app/go/ig-story | `/what-we-accept?utm_source=instagram&utm_medium=story&utm_campaign=reloop-pilot` |
| WhatsApp: messages, groups, status and the business profile | https://re-loop-ochre.vercel.app/go/wa       | `/?utm_source=whatsapp&utm_medium=share&utm_campaign=reloop-pilot`                |
| Awareness-drive QR code (already printed, never change it)  | https://re-loop-ochre.vercel.app/go/drive    | `/locations?utm_source=qr&utm_medium=print&utm_campaign=awareness-drive-2026`     |

- **Use the short link, not the full one.** The full form works too, but only the short link is counted by ReLoop.
- **One link per place.** Don't put the story link in the bio, or the counts get mixed.
- **A new campaign or a new place** (a poster at a college, a Facebook page) needs a new line in `frontend/src/config/tracked-links.ts` and a pull request. Pick a short slug made of lowercase letters, digits and dashes.
- **Unknown links** (a typo such as `/go/ig-bi0`) open the home page and aren't counted.

## Reading the counts

1. Log in with an admin account and open **`/hub/shops`**.
2. The **Tracked links** panel shows, for each link, the clicks **this month** (India time) and **all time**.

What counts as a click:

- **Counted:** a person opening the link in a browser, including Instagram's and WhatsApp's own in-app browsers.
- **Not counted:** link previews (WhatsApp and Instagram fetch the page to draw the preview card), search-engine crawlers and browser prefetches.
- **Stored per click:** the link, its source, its medium and the time. No IP address, device or anything else about the person. Only admins can read the counts, and nobody can read single clicks through the site.
- The 3 awareness-drive scans counted before this change (in the old `qr_scans` table) carried over as `/go/drive` clicks.

## Vercel Analytics

Vercel Analytics is switched on for the site, and every visit through these links arrives with its UTM tags in the address. Checked on production on 2026-10-14: opening `/go/ig-bio` in a browser sends Vercel a page view of `/?utm_source=instagram&utm_medium=bio&utm_campaign=reloop-pilot`.

But **the ReLoop Vercel team is on the free Hobby plan, and Hobby doesn't show a breakdown by UTM source or medium.** Vercel's UTM Parameters panel needs the paid Web Analytics Plus add-on. On Hobby, Vercel shows pages, referrers, countries and devices, but not "how many came from Instagram stories".

So:

- **The source of truth for "where did visitors come from" is the Tracked links panel on `/hub/shops`.**
- Vercel Analytics is still useful for which pages people read after they arrive.
- If the team later upgrades to Web Analytics Plus, the UTM tags are already in place: nothing needs changing.
