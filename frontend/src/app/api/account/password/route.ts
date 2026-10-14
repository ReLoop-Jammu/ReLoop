import { isDemoAccount } from "@/lib/environment";
import {
  authAdmin,
  bearer,
  isConfigured,
  passwordMatches,
  reply,
  serviceRest,
  userFromToken,
} from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

/**
 * A signed-in user sets a new password; this also clears a pending
 * temporary-password flag. The current password is required, except right
 * after an admin reset (the user only has the temporary one, already used to
 * sign in).
 */
export async function POST(request: Request) {
  if (!isConfigured()) return reply({ error: "Not configured." }, 503);
  const token = bearer(request);
  const user = token ? await userFromToken(token) : null;
  if (!user) return reply({ error: "Please log in again." }, 401);
  if (isDemoAccount(user.email)) {
    return reply(
      { error: "Demo accounts keep their shared password, so everyone can log in." },
      403,
    );
  }
  const body = (await request.json().catch(() => ({}))) as {
    password?: unknown;
    currentPassword?: unknown;
  };
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8 || password.length > 128) {
    return reply({ error: "Use a password of 8 to 128 characters." }, 400);
  }
  try {
    const [profile] = await serviceRest<{ must_change_password: boolean }[]>(
      `profiles?select=must_change_password&user_id=eq.${user.id}`,
    );
    if (!profile?.must_change_password) {
      const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
      if (!current) return reply({ error: "Enter your current password." }, 400);
      if (!user.email || !(await passwordMatches(user.email, current))) {
        return reply({ error: "Your current password isn't right." }, 403);
      }
    }
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
