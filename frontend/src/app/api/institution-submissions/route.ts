
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const text = (value: unknown, max = 500): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json(
      { error: "Institution submissions are not configured." },
      { status: 503 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Please submit valid form data." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Please submit valid form data." },
      { status: 400 },
    );
  }

  const data = body as Record<string, unknown>;

  const institutionName = text(
    data.institutionName ?? data.institution_name ?? data.institution,
    200,
  );

  const contactName = text(
    data.contactName ??
      data.contact_name ??
      data.contactPerson ??
      data.contact_person ??
      data.name,
    150,
  );

  const phone = text(data.phone ?? data.mobile, 30);
  const email = text(data.email, 254);

  const rawDetails = data.details;
  const details =
    rawDetails &&
    typeof rawDetails === "object" &&
    !Array.isArray(rawDetails)
      ? (rawDetails as Record<string, unknown>)
      : {};

  if (!institutionName || !contactName || !phone) {
    return NextResponse.json(
      {
        error:
          "Institution name, contact person and phone are required. Please check the form field names.",
      },
      { status: 400 },
    );
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
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
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Institution submission failed:",
        response.status,
        errorText,
      );

      return NextResponse.json(
        {
          error:
            "We couldn't save your booking. Please check the deployment configuration and try again.",
        },
        { status: 502 },
      );
    }

    const saved = (await response.json()) as Array<{ id: string }>;

    return NextResponse.json({
      ok: true,
      id: saved[0]?.id,
      message: "Your institution pickup request has been saved.",
    });
  } catch (error) {
    console.error("Institution submission error:", error);

    return NextResponse.json(
      { error: "A connection error occurred. Please try again." },
      { status: 500 },
    );
  }
}
