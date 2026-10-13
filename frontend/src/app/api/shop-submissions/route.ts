import { NextResponse } from "next/server";

export const runtime = "nodejs";
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const text = (value: unknown, max = 500) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SERVICE_KEY)
    return NextResponse.json(
      { error: "Submissions are not configured yet. Please contact ReLoop." },
      { status: 503 },
    );
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!token)
    return NextResponse.json({ error: "Please log in to submit items." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit valid form data." }, { status: 400 });
  }
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Please submit valid form data." }, { status: 400 });
  const data = body as Record<string, unknown>;
  if (text(data.website, 200)) return NextResponse.json({ ok: true });
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length < 1 || items.length > 10)
    return NextResponse.json(
      { error: "Submit between 1 and 10 items at a time." },
      { status: 400 },
    );
  const cleanedItems = items.map((raw) => {
    const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const quantity = Number(item.quantity);
    const askingPrice =
      item.askingPrice === "" || item.askingPrice == null ? null : Number(item.askingPrice);
    const imageUrl = text(item.imageUrl, 1000) || null;
    return {
      item_name: text(item.itemName, 120),
      category: text(item.category, 80),
      brand: text(item.brand, 100),
      model: text(item.model, 100),
      condition: text(item.condition, 40) === "Working" ? "Good" : text(item.condition, 40),
      quantity,
      asking_price: askingPrice,
      image_url: imageUrl,
      description: text(item.description, 800),
    };
  });
  if (
    cleanedItems.some(
      (item) =>
        !item.item_name ||
        !item.condition ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        (item.asking_price !== null &&
          (!Number.isFinite(item.asking_price) || item.asking_price < 0)) ||
        (item.image_url && !/^https:\/\//i.test(item.image_url)),
    )
  )
    return NextResponse.json(
      {
        error:
          "Each item needs a name, condition and positive whole-number quantity. Image links must use HTTPS.",
      },
      { status: 400 },
    );
  const base = SUPABASE_URL.replace(/\/$/, "");
  const adminHeaders = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
  try {
    const userResponse = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!userResponse.ok)
      return NextResponse.json(
        { error: "Your login has expired. Please log in again." },
        { status: 401 },
      );
    const user = (await userResponse.json()) as { id?: string; email?: string };
    if (!user.id)
      return NextResponse.json(
        { error: "Could not verify your account. Please log in again." },
        { status: 401 },
      );
    const profileResponse = await fetch(
      `${base}/rest/v1/profiles?user_id=eq.${encodeURIComponent(user.id)}&select=role`,
      { headers: adminHeaders, cache: "no-store" },
    );
    if (!profileResponse.ok) {
      console.error("Profile lookup failed:", profileResponse.status, await profileResponse.text());
      return NextResponse.json(
        { error: "Account setup is incomplete. Please contact ReLoop." },
        { status: 503 },
      );
    }
    const profiles = (await profileResponse.json()) as Array<{ role: string }>;
    if (profiles[0]?.role !== "shop_owner")
      return NextResponse.json(
        { error: "Only registered shop-owner accounts can submit items." },
        { status: 403 },
      );
    const shopResponse = await fetch(
      `${base}/rest/v1/shop_owners?id=eq.${encodeURIComponent(user.id)}&select=verification_status`,
      { headers: adminHeaders, cache: "no-store" },
    );
    if (!shopResponse.ok) {
      console.error(
        "Shop verification lookup failed:",
        shopResponse.status,
        await shopResponse.text(),
      );
      return NextResponse.json(
        { error: "Could not check your shop verification. Please try again later." },
        { status: 503 },
      );
    }
    const shops = (await shopResponse.json()) as Array<{ verification_status: string }>;
    if (shops[0]?.verification_status !== "verified")
      return NextResponse.json(
        { error: "Your shop must be verified by ReLoop before you can submit items." },
        { status: 403 },
      );
    const insertResponse = await fetch(`${base}/rest/v1/shop_submissions`, {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "return=representation" },
      body: JSON.stringify(
        cleanedItems.map((item) => ({
          shop_owner_id: user.id,
          item_name: item.item_name,
          category_id: null,
          brand: item.brand || null,
          model: item.model || null,
          description:
            [item.category ? `Category: ${item.category}` : "", item.description]
              .filter(Boolean)
              .join("\n") || null,
          quantity: item.quantity,
          condition: item.condition,
          asking_price: item.asking_price,
          image_url: item.image_url,
          status: "Pending",
        })),
      ),
      cache: "no-store",
    });
    if (!insertResponse.ok) {
      console.error(
        "Shop submission insert failed:",
        insertResponse.status,
        await insertResponse.text(),
      );
      return NextResponse.json(
        { error: "We couldn't save your items. Please try again or contact ReLoop." },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, count: cleanedItems.length });
  } catch (error) {
    console.error("Shop submission error:", error);
    return NextResponse.json(
      { error: "A connection error occurred. Please try again." },
      { status: 500 },
    );
  }
}
