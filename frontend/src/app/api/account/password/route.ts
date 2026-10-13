import {
  authAdmin,
  bearer,
  isConfigured,
  reply,
  serviceRest,
  userFromToken,
} from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

/** A signed-in user sets a new password; this also clears a pending temporary-password flag. */
export async function POST(request: Request) {
  if (!isConfigured()) return reply({ error: "Not configured." }, 503);
  const token = bearer(request);
  const user = token ? await userFromToken(token) : null;
  if (!user) return reply({ error: "Please log in again." }, 401);
  const body = (await request.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8 || password.length > 128) {
    return reply({ error: "Use a password of 8 to 128 characters." }, 400);
  }
  try {
    await authAdmin(`users/${user.id}`, { method: "PUT", body: JSON.stringify({ password }) });
    await serviceRest(`profiles?user_id=eq.${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ must_change_password: false }),
    });
    return reply({ ok: true });
  } catch {
    return reply({ error: "Your password wasn't changed. Try again." }, 502);
  }
}
