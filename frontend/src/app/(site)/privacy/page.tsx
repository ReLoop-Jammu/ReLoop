import type { Metadata } from "next";
import { ContactDetail, LegalPage } from "@/components/legal/LegalPage";
import { getSiteSettings } from "@/features/settings/server";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How ReLoop collects, uses and protects your personal data.",
};

export default async function PrivacyPage() {
  const site = await getSiteSettings();
  const officer = SITE.grievanceOfficer;
  return (
    <LegalPage title="Privacy policy" updated={SITE.legalUpdated}>
      <section>
        <h2>Who we are</h2>
        <p>
          {SITE.legalName ?? SITE.name} (&quot;ReLoop&quot;, &quot;we&quot;) buys, grades and
          resells used phones, laptops, desktop computers, monitors and parts, based in {SITE.city}.
          This policy explains what personal data we collect, why, and the choices you have. We
          follow India&apos;s Digital Personal Data Protection Act, 2023 (DPDP Act).
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>When you sell to us:</strong> your name, phone number, and, for shops and
            institutions, the business name, market or address and a contact person. We also record
            the items you hand over, what we paid for them and how (cash, or UPI with its payment
            reference), with a numbered receipt.
          </li>
          <li>
            <strong>When you buy or reserve an item:</strong> your name, phone number, and your
            delivery area if you choose delivery.
          </li>
          <li>
            <strong>Requests you send us</strong> through the forms on this site, by WhatsApp or by
            email. If you are logged in when you send one, it is linked to your account so you can
            follow it under My requests.
          </li>
          <li>
            <strong>Your account,</strong> if you create one: your name, phone number and email
            address, and for shops the shop name, GSTIN (if any) and address. You can change these
            on your account&apos;s Profile and settings page.
          </li>
          <li>
            <strong>Notifications</strong> we show you on the site about your requests, offers and
            account. ReLoop sends no marketing messages and no email.
          </li>
          <li>
            <strong>Saved items:</strong> the shop items you save, when, and their price then, so we
            can tell you when one drops in price, is reserved or sells. Only you see your list.
          </li>
          <li>
            <strong>Technical data:</strong> anonymous, aggregated usage statistics (pages viewed,
            page speed) that do not identify you.
          </li>
        </ul>
        <p>
          We do not collect payment card details, and we do not sell your personal data. Data stored
          on devices, boards and drives you sell us (including parts left in a to-test bag) is
          wiped, or the storage chip destroyed, before anything is stripped or sold, and it is
          logged against the tag, as described on our How it works page. Photos a partner shop
          uploads of a part are stored privately, with their location and camera details removed,
          and are made public only when staff approve the listing.
        </p>
      </section>

      <section>
        <h2>Why we use it</h2>
        <ul>
          <li>To arrange pickups, drop-offs and payments when you sell to us.</li>
          <li>To reserve items, arrange delivery and honour warranties when you buy from us.</li>
          <li>
            To keep records of where items came from, how much scrap each shop handed over, and
            where scrap went (the weight ledger is kept as an e-waste record).
          </li>
          <li>
            To show, in totals only, which parts of Jammu our stock goes to: when you buy, staff may
            note your locality (never your address), and an area is shown only once three or more
            items have gone there.
          </li>
          <li>To answer your questions and keep the service secure.</li>
        </ul>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>
          We use trusted service providers to run the site, such as hosting and messaging. They
          process data only on our instructions. For institutions, the institution&apos;s name
          appears on the weight receipt of our licensed recycler, VRRG Group. A shop&apos;s
          kilograms are shown publicly only in bands (such as &ldquo;25-100 kg&rdquo;), and only
          with its consent. We may disclose data if required by law.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep your details while we have an active relationship with you. You can ask us to
          delete your account and data from your account&apos;s Profile and settings page, or by
          contacting us. An admin carries out the request within 30 days: your account, profile,
          shop details, saved items and notifications are deleted. Records we must keep by law
          (items we bought from you, what we paid and the weights we recorded, for tax and e-waste
          records) are kept with your name replaced by &ldquo;Deleted account&rdquo;, and your
          requests keep only their stage. Handled deletion requests are themselves deleted after 12
          months.
        </p>
        <p>
          Notifications on the site are deleted after 90 days. Saved items stay until you remove
          them or delete your account.
        </p>
        <p>
          Warranty claims (what you reported and what we decided, and for a claim we log for you at
          the hub, your name and phone) are deleted 12 months after the claim is closed.
        </p>
        <p>
          Requests you send through the site (reservations, questions about an item and institution
          pickup bookings) are seen only by ReLoop&apos;s hub staff. Open requests are kept until we
          close them. A closed request (sold, cancelled or done) is deleted automatically 12 months
          after it was closed, together with the name, phone number and other details in it.
        </p>
        <p>
          Each request has a private status link. Anyone who has the link sees only the
          request&apos;s stage (for example &ldquo;Pickup booked&rdquo;), never your name, phone
          number or message. The page is not shown to search engines.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>Under the DPDP Act you can:</p>
        <ul>
          <li>ask what personal data we hold about you and how it is used;</li>
          <li>ask us to correct, complete or update it;</li>
          <li>ask us to erase it, and withdraw consent you have given;</li>
          <li>nominate someone to exercise these rights on your behalf;</li>
          <li>raise a grievance with us, and then with the Data Protection Board of India.</li>
        </ul>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          ReLoop is not intended for anyone under 18. We do not knowingly collect data from
          children.
        </p>
      </section>

      <section>
        <h2>Contact and grievances</h2>
        <p>
          Grievance officer:{" "}
          {officer ? `${officer.name} (${officer.designation})` : <ContactDetail value={null} />}
          <br />
          Email:{" "}
          <ContactDetail value={officer?.email ?? site.supportEmail} href={(v) => `mailto:${v}`} />
          {officer && (
            <>
              <br />
              Phone:{" "}
              <ContactDetail value={officer.phone} href={(v) => `tel:${v.replace(/\s/g, "")}`} />
            </>
          )}
          {SITE.address && (
            <>
              <br />
              Address: {SITE.address}
            </>
          )}
        </p>
        <p>We aim to acknowledge grievances within 24 hours and resolve them within 15 days.</p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>If we make significant changes, we will update the date above.</p>
      </section>
    </LegalPage>
  );
}
