import { NextResponse, type NextRequest } from "next/server";
import { noStore } from "@/lib/server/http";
import {
  applySessionCookies,
  clearSessionCookies,
  getActiveSession,
  userRest,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} from "@/lib/server/session";

export const runtime = "nodejs";

type Profile = { full_name: string; role: "buyer" | "shop_owner" };
type Shop = {
  shop_name: string;
  gstin: string | null;
  verification_status: "pending" | "verified" | "rejected";
};

/** Who is signed in, for the account page and forms. Refreshes expired sessions. */
export async function GET(request: NextRequest) {
  const session = await getActiveSession(request);

  if (!session) {
    const result = NextResponse.json({ authenticated: false }, { headers: noStore });
    if (request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE)) {
      clearSessionCookies(result);
    }
    return result;
  }

  const [profiles, shops, staff] = await Promise.all([
    userRest<Profile[]>(session.accessToken, "profiles?select=full_name,role&limit=1"),
    userRest<Shop[]>(
      session.accessToken,
      "shop_owners?select=shop_name,gstin,verification_status&limit=1",
    ),
    userRest<Array<{ user_id: string }>>(session.accessToken, "staff?select=user_id&limit=1"),
  ]);

  const result = NextResponse.json(
    {
      authenticated: true,
      user: session.user,
      profile: profiles?.[0] ?? null,
      shop: shops?.[0] ?? null,
      isStaff: Boolean(staff && staff.length > 0),
    },
    { headers: noStore },
  );
  if (session.refreshed) applySessionCookies(result, session.refreshed);
  return result;
}
