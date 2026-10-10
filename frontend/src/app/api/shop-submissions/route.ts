import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const text = (value: unknown, max = 500) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json(
      { error: "Submissions are not configured yet. Please contact ReLoop directly." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit valid form data." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Please submit valid form data." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  // Honeypot field for simple bot submissions.
  if (text(data.website, 200)) return NextResponse.json({ ok: true });

  const shopName = text(data.shopName, 120);
  const ownerName = text(data.ownerName, 120);
  const phone = text(data.phone, 40);
  const email = text(data.email, 160) || null;
  const address = text(data.address, 240) || null;
  const city = text(data.city, 100) || "Jammu";
  const items = Array.isArray(data.items) ? data.items : [];

  if (!shopName || !ownerName || !phone || !/^\+?[\d\s().-]{10,20}$/.test(phone)) {
    return NextResponse.json(
      { error: "Enter your shop name, contact name and a valid phone number." },
      { status: 400 },
    );
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (items.length < 1 || items.length > 10) {
    return NextResponse.json({ error: "Submit between 1 and 10 items at a time." }, { status: 400 });
  }

  const cleanedItems = items.map((raw) => {
    const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const quantity = Number(item.quantity);
    const askingPrice = item.askingPrice === "" || item.askingPrice == null ? null : Number(item.askingPrice);
    return {
      item_name: text(item.itemName, 120),
      brand: text(item.brand, 100) || null,
      model: text(item.model, 100) || null,
      category_id: null,
      description: [text(item.category, 80) ? `Category: ${text(item.category, 80)}` : "", text(item.description, 700)].filter(Boolean).join("\n") || null,
      quantity,
      condition: text(item.condition, 40),
      asking_price: askingPrice !== null && Number.isFinite(askingPrice) && askingPrice >= 0 ? askingPrice : null,
      image_url: text(item.imageUrl, 1000) || null,
      status: "Pending",
    };
  });

  const invalid = cleanedItems.find(
    (item) =>
      !item.item_name ||
      !item.condition ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      (item.asking_price !== null && (!Number.isFinite(item.asking_price) || item.asking_price < 0)) ||
      (item.image_url !== null && !/^https:\/\//i.test(item.image_url)),
  );
  if (invalid) {
    return NextResponse.json(
      { error: "Each item needs a name, condition and positive whole-number quantity. Image links must use HTTPS." },
      { status: 400 },
    );
  }

  const base = SUPABASE_URL.replace(/\/$/, "");
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  try {
    const ownerResponse = await fetch(`${base}/rest/v1/shop_owners`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        shop_name: shopName,
        owner_name: ownerName,
        email,
        phone,
        address,
        city,
        is_active: true,
      }),
      cache: "no-store",
    });
    if (!ownerResponse.ok) {
      console.error("Shop owner insert failed:", ownerResponse.status, await ownerResponse.text());
      return NextResponse.json({ error: "We couldn't save your shop details. Please try again." }, { status: 502 });
    }
    const owners = (await ownerResponse.json()) as Array<{ id: string }>;
    const ownerId = owners[0]?.id;
    if (!ownerId) {
      return NextResponse.json({ error: "We couldn't confirm your shop details. Please try again." }, { status: 502 });
    }

    const submissionResponse = await fetch(`${base}/rest/v1/shop_submissions`, {
      method: "POST",
      headers,
      body: JSON.stringify(cleanedItems.map((item) => ({ ...item, shop_owner_id: ownerId }))),
      cache: "no-store",
    });
    if (!submissionResponse.ok) {
      console.error("Shop submission insert failed:", submissionResponse.status, await submissionResponse.text());
      return NextResponse.json({ error: "Your shop was saved, but we couldn't save the item list. Please contact ReLoop before submitting again." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, count: cleanedItems.length });
  } catch (error) {
    console.error("Shop submission error:", error);
    return NextResponse.json({ error: "A connection error occurred. Please try again." }, { status: 500 });
  }
}
