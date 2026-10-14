# Staff guide: running the ReLoop hub

For hub workers and admins. No technical knowledge needed. Each task says which page to open and which buttons to press. Pages start with `https://re-loop-ochre.vercel.app`; for example, `/hub/intake` means `https://re-loop-ochre.vercel.app/hub/intake`.

**Who can do what**

- **Hub staff** can do everything in this guide except the tasks marked **(admin)**.
- **Admins** can do everything, including shop verification, password resets, the partner map, the team, link and QR visits (`/hub/links`), the audit log (`/hub/audit`) and the settings (`/hub/settings`). Staff don't see these screens in the menu.
- Log in at `/login` with your own account. Ask an admin to give you access (see [Managing staff](#12-managing-staff)).

**Contents**

1. [Verifying a shop](#1-verifying-a-shop-admin)
2. [Resetting someone's password](#2-resetting-someones-password-admin)
3. [Reviewing shop submissions and making offers](#3-reviewing-shop-submissions-and-making-offers)
4. [Turning an accepted offer into hub items](#4-turning-an-accepted-offer-into-hub-items)
5. [Intake and grading](#5-intake-and-grading)
6. [Listing an item for sale](#6-listing-an-item-for-sale)
7. [Reservations, questions and institution bookings](#7-reservations-questions-and-institution-bookings)
8. [Marking an item sold](#8-marking-an-item-sold)
9. [Logging a recycler handover](#9-logging-a-recycler-handover)
10. [Today's overview and the KPIs](#10-todays-overview-and-the-kpis)
11. [Putting a shop on the map](#11-putting-a-shop-on-the-map-admin)
12. [Managing staff](#12-managing-staff-admin)
13. [If something goes wrong](#13-if-something-goes-wrong)

---

## 1. Verifying a shop (admin)

**Page:** `/hub/shops` (menu: **Shop verification**)

A shop owner can't submit items until an admin verifies their shop.

1. Under **Waiting for review**, read the shop's details: shop name, owner, phone, address and GSTIN. Shops without a GST registration show **Not GST-registered**, which is allowed.
2. **Phone check:** call the phone number shown. Confirm that the person who answers is the owner and that the shop exists (ask for the shop name and market). Don't verify a shop you couldn't reach.
3. Write a short **Review note**, for example "Called, confirmed by owner".
4. Press **Verify**. If something doesn't add up, press **Reject** and say why in the note.

The shop owner sees the new status on their `/account` page straight away.

## 2. Resetting someone's password (admin)

**Page:** `/hub/users` (menu: **Users**)

ReLoop doesn't send emails, so this is the only way to recover an account.

1. **Identity check first.** The person must contact us (usually on WhatsApp). Call them back on the phone number saved on their account, not a number they give you in the chat, and confirm who they are.
2. Search by email, name or phone, then press **Search**.
3. On their account, press **Reset password**. Tick the box confirming you checked it's really them, then confirm.
4. A temporary password appears **once**. Press **Copy** and send it to them privately (WhatsApp or a call). Close the box; you can't see it again.
5. When they next log in, they must choose a new password at once. Until they do, their account has no staff or admin rights.

Every reset is recorded (who reset whose password, and when). The password itself is never stored or logged.

## 3. Reviewing shop submissions and making offers

**Page:** `/hub/submissions` (menu: **Shop submissions**)

Verified shops send us lists of items. They appear under **Waiting for review**, with the shop's name and phone.

1. Read the item, quantity, condition, the shop's expected price and any details.
2. To make an offer, enter **Offer per item (₹)** and a **Note the shop will see** (for example "Screens cracked; price for parts"). Press **Make offer**.
3. To refuse, write the reason in the note and press **Reject**. The shop sees the reason.

The shop sees your offer on its `/account` page and accepts by WhatsApp. Agree the pickup day in the same chat.

## 4. Turning an accepted offer into hub items

**Page:** `/hub/submissions`, group **Offered: waiting for the shop**

Do this once the shop has accepted on WhatsApp.

1. Under "Shop accepted? Create … hub items", check the **Category** (and **Part type** for parts). The system suggests one from the shop's wording.
2. Enter **Paid per item (₹)**: what we actually paid.
3. Press **Create hub items**. You get one hub item per unit, each with its own **RL-JMU-** tag, linked to the submission.
4. Click a tag to open the item and grade it (next section).

## 5. Intake and grading

**Pages:** `/hub/intake` (menu: **Intake**) for items that didn't come through a shop submission (institution lots, walk-ins); then the item's own page.

**Intake**

1. Choose the **Source** (repair shop, retailer, institution or household) and the **Partner shop** or **Institution**.
2. Fill in **Category** (and **Part type** for parts), **Brand** and **Model**.
3. Fill in **How we bought it**, **We paid (₹)** (0 for free scrap), **Payment method** and, if you have them, **Expected resale (₹)** and **Weight (kg)**.
4. Save. The item gets the next **RL-JMU-** tag. Write the tag on the item. Press **Open item**.

**Grading** (within 24 hours of arrival), on the item's page under **Test and grade**:

1. Go through the **Test checklist**.
2. Pick the **Grade** and press **Save grade**:
   - **A**: everything passes.
   - **B**: one fixable fault.
   - **C**: not worth fixing; good parts will be removed.
   - **D**: dead or hazardous.
3. **Data wipe** (phones, laptops, drives): pick the **Method** and press **Mark wiped**. Use "Drive drilled (wipe failed)" if a drive won't wipe. Nothing can be listed until the wipe is recorded.
4. Enter the **Rack** location so others can find it.

**What happens next depends on the grade**, under **Next step**:

- **B**: send it to a repair partner (choose the shop, the fault and the fee). When it comes back, press **Back, fixed**, or mark it not fixable (it becomes C).
- **C**: record the parts you removed, then **Save parts, shell to scrap**. Each part gets its own tag; the shell goes to the scrap cage.
- **D**: enter the weight and press **Move to scrap cage**.
- **Batteries**: always into the closed metal cabinet with sand, never the cage.

## 6. Listing an item for sale

**Page:** the item's page, **Next step**

1. The item must be graded A, B or C, and wiped if it holds data.
2. Enter the **List price (₹)** and press **List online**. It appears in the public shop straight away.
3. Unsold items are handled automatically: after 45 days the price drops 20%, and after 75 days the item is downgraded to C.

## 7. Reservations, questions and institution bookings

**Page:** `/hub/requests` (menu: **Requests**)

Requests from the public site arrive here: **Reservations**, **Questions** (about an item) and **Institution pickups**. The list shows open requests (new or contacted); use the **Kind** and **Status** filters to see others.

1. Tap **WhatsApp** next to the phone number to reply to the person.
2. Press **Mark contacted** once you've been in touch.
3. For a reservation: press **Mark item reserved** so nobody else buys it. The item leaves the public shop. If the buyer drops out, cancel the reservation on the item's page (**Cancel reservation**).
4. For an institution pickup: agree a date with them on WhatsApp. After the pickup, press **Pickup done**, and log the items at **Intake** with the institution as the source.
5. Press **Cancel** for requests that go nowhere.

Closed requests (sold, cancelled or done) are deleted automatically 12 months after they were closed, with the person's details. Close requests when they're finished.

## 8. Marking an item sold

**From a reservation:** on `/hub/requests`, press **Mark item sold**. This marks both the item and the request as sold.

**From the item's page** (for example, a hub walk-in):

1. Under **Next step**, check **Sold for (₹)** and choose the **Fulfilment** (hub pickup, Jammu delivery or shipped).
2. Press **Mark sold**.

## 9. Logging a recycler handover

**Page:** `/hub/handovers` (menu: **Recycler handovers**)

Do this every time the authorised recycler collects: when the scrap cage reaches 100 kg or every 14 days, and every week for batteries.

1. Tick the items being collected (everything in the scrap cage is listed).
2. Copy from the recycler's weight receipt: **Recycler**, **Receipt number**, **Date**, **Total weight on receipt (kg)** and **Batteries (kg)**.
3. If the recycler paid us, fill in **Rate per kg (₹)** and **Amount received (₹)**.
4. For an institution's e-waste, fill in **On behalf of (institution)** so its name is on the record.
5. Press **Save handover (… items)**. Keep the paper receipt; file it under the receipt number.

## 10. Today's overview and the KPIs

**Page:** `/hub` (menu: **Overview**). After logging in, hub staff and admins land here.

- **Requests and submissions** lists what is waiting: new shop submissions, offers waiting for the shop's answer, new reservations, institution pickups and questions, and (admins) shops waiting for verification. Each line opens the page to deal with it. The same counts appear as badges in the hub menu.
- **Stock** lists items overdue for grading or listing, a full scrap cage, batteries waiting, and listed items that reach the day-45 price cut or the day-75 downgrade within the next 7 days.
- The search box at the top of the menu finds an item by its tag (or just its number, for example `42`), a brand or model, a shop or an institution; admins also find accounts.

**Page:** `/hub/kpis` (menu: **KPIs**)

| On the KPI page                                                    | What it counts                                                                               |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Items in this month                                                | Items logged this month. Parts taken from a C item aren't counted again.                     |
| Reused (A + B + C)                                                 | Share of graded items that were A, B or C, so not scrap.                                     |
| Scrap handed over                                                  | Kilograms handed to the recycler (all categories plus batteries), from the handover log.     |
| Active partner shops                                               | Shops on **Shops & institutions** with status **Active**. The target is 25.                  |
| Average stock age                                                  | Average days in the hub for items not yet sold or recycled.                                  |
| Reservations, Questions, Institution pickups                       | Requests received this month, by kind.                                                       |
| Shop submissions in, Offers made, Bought from shops, Paid to shops | The shop loop: items submitted, offers made, offers turned into hub items, and what we paid. |

**Needs attention** lists what to act on now:

- items not graded within 24 hours;
- A and B items not listed within 48 hours;
- a full scrap cage, or too long since the last handover (book the recycler);
- batteries waiting for the weekly collection.

Spreadsheets (CSV) of the KPIs and items can be downloaded from the KPI page. They leave out supplier contact names and phone numbers.

## 11. Putting a shop on the map (admin)

**Page:** `/hub/shops`, on a **verified** shop

Only shops that agreed can appear on the public `/locations` map. The map shows the shop's name, market and position, never the phone or owner.

1. Ask the owner whether they agree to be on ReLoop's public map. Note the date they agreed.
2. Tick **The shop agreed to be shown on ReLoop's public map.** and set **Agreed on** to that date.
3. Choose the **Market**. If you don't know the exact spot, leave the position empty: the shop is shown at the market, marked approximate.
4. Press **Show on map**. To remove it later, press **Take off the map**.

## 12. Managing staff (admin)

**Page:** `/hub/team` (menu: **Team**)

1. The new person signs up on `/register` with their own account (never share accounts).
2. Find them and press **Make hub staff**. Press **Make admin** only for people who need verification, password resets, the map and the team.
3. When someone leaves, press **Remove admin** and **Remove from hub staff**.
4. ReLoop always keeps at least one admin: the last admin can't be removed. Every change is recorded.

## 13. If something goes wrong

| Problem                                                         | What to do                                                                                                                                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The hub asks you to log in again                                | Your session ended. Log in again; nothing is lost.                                                                                                                                |
| "That change wasn't saved"                                      | Reload the page and try once more. If it still fails, note what you were doing and tell an admin.                                                                                 |
| You entered a wrong grade, price or status                      | Don't create a second item. Fix it on the item's page if you can, otherwise tell an admin with the RL-JMU tag.                                                                    |
| Someone can't log in                                            | An admin resets their password (section 2), after the identity check.                                                                                                             |
| A shop says it can't submit items                               | Check on `/hub/shops` that it's **Verified**. Pending shops can't submit.                                                                                                         |
| An item shows in the shop but is already gone                   | Mark it sold or reserved straight away, so the shop page updates.                                                                                                                 |
| Every admin is locked out                                       | The technical team can restore an admin with the database recovery script. Contact them; don't create new accounts to work around it.                                             |
| The website is down or showing errors                           | Tell the technical team. They can roll the site back to the last working version in a few minutes. Keep working on paper (tag, grade, price) and enter it later.                  |
| Something looks wrong with the data (missing items, odd totals) | Stop editing and tell the technical team. They take regular backups. Admins can also press **Download backup** on `/hub/data` (keep the file private: it holds supplier details). |
| A battery is swollen, hot or leaking                            | Safety first: don't open or charge it. Put it in the metal cabinet with sand and hand it over at the next weekly battery collection.                                              |
