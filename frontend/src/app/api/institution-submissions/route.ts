
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const text = (value: unknown, max = 500) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json(
      { error: "Institution submissions are not configured." },
      { status: 503 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Please submit valid form data." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Please submit valid form data." },
      { status: 400 }
    );
  }

  const data = body as Record<string, unknown>;

  const institutionName = text(data.institutionName, 200);
  const contactName = text(data.contactName, 150);
  const phone = text(data.phone, 30);
  const email = text(data.email, 254);
  const details =
    data.details &&
    typeof data.details === "object" &&
    !Array.isArray(data.details)
      ? data.details
      : {};

  if (!institutionName || !contactName || !phone) {
    return NextResponse.json(
      { error: "Institution name, contact name and phone are required." },
      { status: 400 }
    );
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const base = SUPABASE_URL.replace(/\/$/, "");
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(
      `${base}/rest/v1/institution_submissions`,
      {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          institution_name: institutionName,
          contact_name: contactName,
          phone,
          email: email || null,
          details,
          status: "Pending",
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Institution submission failed:",
        response.status,
        await response.text()
      );

      return NextResponse.json(
        { error: "We couldn't save your request. Please try again." },
        { status: 502 }
      );
    }

    const saved = await response.json();

    return NextResponse.json({
      ok: true,
      id: saved[0]?.id,
      message: "Your institution request has been submitted.",
    });
  } catch (error) {
    console.error("Institution submission error:", error);

    return NextResponse.json(
      { error: "A connection error occurred. Please try again." },
      { status: 500 }
    );
  }
}
