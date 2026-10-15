# Business Plan v2: public summary

Operational facts only, for the whole team and the code. The full plan (with the money section) is private and is not in this repo. **No P&L, costs, margins or VRRG resale prices belong in this repo.** Staff-only figures live in staff-read `app_settings` keys, never in files.

Team decisions on top of v2 (they win where v2 differs): no collection from households (households and students can buy, not sell); no TVs, small appliances, printers or UPS units from anyone, institutions included; Jammu city only (the Jammu Municipal Corporation area): nothing is sold or shipped outside Jammu.

## What ReLoop is

A fixed weekly pickup through Jammu's repair markets that pays a posted rate per kilo. Everything is weighed, sorted and tagged at one hub in Gandhi Nagar. Working parts go back to Jammu technicians, devices are graded and resold locally, and all scrap goes to the dismantling partner.

- Pilot: November 2026 to April 2027, Jammu only.
- After the pilot ReLoop adds more Jammu markets, not other cities: Janipur, Trikuta Nagar, Talab Tillo.

## Sources (who sells to ReLoop)

| Source                                           | Role      | Hands over                                                              | How it is collected                                                         |
| ------------------------------------------------ | --------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Mobile and laptop repair shops                   | Primary   | Broken screens, dead batteries, boards, swapped parts, leftover junk    | Weekly pickup on the fixed route; weighed, paid by UPI on the spot          |
| Retailers and exchange stores                    | Primary   | Scrap trade-in handsets, faulty phones they won't resell, display units | On the same route, monthly or when a bag fills                              |
| Institutions (colleges, schools, banks, offices) | Secondary | Bulk lots of old desktops, laptops and monitors                         | Booked lot pickup; fee of Rs 3,000 a lot (pickup, sorting, handover record) |

Not collected: anything from households; TVs, small appliances, printers, UPS units. Dead e-waste from an institution goes straight to the dismantling partner with the institution named on the weight receipt. ReLoop buys only the working and repairable equipment.

Ownership rule: before any device is bought the seller confirms they own it or have it signed over (a required, recorded tick box).

## Rate card (shops, per kg)

| Category                                       | ReLoop pays                            |
| ---------------------------------------------- | -------------------------------------- |
| Screens and displays                           | Rs 170                                 |
| Batteries                                      | Rs 800                                 |
| Dead motherboards                              | Rs 130                                 |
| Everything else (covers, sensors, accessories) | Rs 5                                   |
| Working parts (boards, cameras, ports)         | Tested, paid as parts, not by the kilo |

Rates are editable in hub settings and shown publicly on the Rate card page with an "as of" date. Weighed in front of the shopkeeper, paid by UPI, receipt issued. Rates quoted next to dealer rates must carry the source line "field interviews, October 2026".

## Routes and places

- **Hub:** a rented ground-floor room of about 300 sq ft in Gandhi Nagar, between Bahu Plaza and Gole Market.
- **Tuesday:** Gandhi Nagar cluster (Bahu Plaza, Gole Market). **Friday:** old city (Raghunath Bazaar, Residency Road). The Friday route starts in months 3 to 4.
- Buyers collect from the hub, or delivery in Jammu city (JMC area) costs Rs 50.

## Hub floor and storage

Intake and platform scale, test bench and wipe station, Parts Exchange shelf, device racks (A, B, C), four scrap bins (screens, boards, other, D devices) and a closed metal battery cabinet with sand, plus an outbound area for the dismantling partner. Every kilo is weighed and logged on arrival (shop, date, category, kg). Devices get an ID like RL-JMU-0142 with photo, source and grade. Data is wiped, or the storage chip destroyed, before anything is stripped or sold, and logged against the tag.

## Device grades

| Grade | Meaning                                                                           |
| ----- | --------------------------------------------------------------------------------- |
| A     | Works: wiped, cleaned, sold with a 30-day warranty                                |
| B     | One fixable fault: repaired at a partner shop at a set price per job, then sold   |
| C     | Strip for parts: working board, camera, port and battery go to the Parts Exchange |
| D     | Dead: sorted into the scrap bins and handed over by weight                        |

Grades apply to devices. Parts are labelled "Tested part" instead.

Device mix assumed by the plan: A 15%, B 20%, C 45%, D 20%.

## Stock rules

| Trigger                                       | Rule                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------- |
| Arrival                                       | Tested within 24 hours. Parts and A/B devices listed within 48 hours |
| Part unsold for 30 days                       | Price cut by 25%, once only                                          |
| Device unsold for 45 days                     | Stripped for parts (A/B moves to C)                                  |
| Any scrap bin reaches 100 kg, or 14 days pass | Handed to the dismantling partner on a weight receipt                |
| Batteries                                     | Handed over every week, whatever the quantity                        |

## Warranty and returns

- Devices (grade A and B): 30-day warranty.
- Parts: 7-day return for a fault, or if it does not fit the stated model, provided it is undamaged. No change-of-mind returns.

## Jammu Parts Exchange

Tested parts (boards, screens, cameras, ports, healthy batteries, laptop RAM and SSDs) listed within 48 hours with a 7-day return. Verified shop owners can list parts they harvest; staff approve each listing; ReLoop records a 12% commission when one sells. Parts are shown separately from refurbished devices in the shop.

## Buyers

Jammu repair technicians (parts), students and budget buyers (refurbished phones, laptops, monitors), engineering labs and makers (tested working parts only), and the dismantling partner (sorted scrap by weight). Nothing is sold or shipped outside Jammu.

## Dismantling partner

VRRG Group, Gangyal. Every kilo of scrap and every battery goes to them on a weight receipt. 100% of scrap to VRRG on a weight receipt is ReLoop's standard.

## Pilot KPIs (targets)

- 40 partner shops on the weekly route (10, 18, 26, 32, 36, 40 over months 1 to 6)
- About 500 kg a month sorted through the hub (92, 222, 352, 436, 474, 506 kg over months 1 to 6)
- 15 to 60 devices a month (15, 25, 35, 45, 55, 60)
- 100% of scrap to VRRG on a weight receipt
- Rs 1.5 lakh a month of tested parts sold (Parts Exchange included; staff-only on the site)
- 0 kg from partner shops to unregistered outside dealers (staff-only, from a monthly shop self-report)

Stage gates: months 1 to 2 move on at 200 kg in a month with at most 4 weekly pickups missed; months 3 to 4 move on when profitable two months running (a staff-only measure).

## Pilot phasing

| Months           | What                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1 to 2 (Nov-Dec) | Gandhi Nagar cluster, Tuesday route. Sign 10, then 18 shops. First dismantling-partner handover. Parts Exchange live |
| 3 to 4 (Jan-Feb) | Add the old city (Friday route). 32 shops, 5 retailers and exchange stores, 3 anchor institutions                    |
| 5 to 6 (Mar-Apr) | Fill the city route: 40 shops, about 500 kg a month. Next Jammu markets on the list                                  |

Phase 2 registration (JKPCC consent, CPCB refurbisher) is planned from month 6.

## Roles

Supply lead (shops, retailers, institutions, the route, the rate card); Hub lead (weighing, testing, grading, data wipe, the ledger, handovers); Sales lead (Parts Exchange, device listings, campus drives, delivery in Jammu); Finance and compliance lead (pricing, receipts, filings).
