import {
  authAdmin,
  reply,
  requireAdmin,
  serviceRest,
  temporaryPassword,
} from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

/**
 * Sets a temporary password for one account, for admins only, after they
 * confirm the person's identity. The password is returned once and never
 * logged or stored in plain text; the user must change it at next sign-in.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/users/[id]/reset-password">,
) {
  const gate = await requireAdmin(request);
  if ("response" in gate) return gate.response;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return reply({ error: "Unknown account." }, 400);
  if (id === gate.admin.id) {
    return reply({ error: "Use “Change password” for your own account." }, 400);
  }
  const body = (await request.json().catch(() => ({}))) as { confirmedIdentity?: unknown };
  if (body.confirmedIdentity !== true) {
    return reply({ error: "Confirm you've checked it's really them first." }, 400);
  }

  try {
    // Admins can't reset each other: an admin's password is changed only by that admin.
    const [staffAdmin, activeAdmin] = await Promise.all([
      serviceRest<unknown[]>(`staff?select=user_id&user_id=eq.${id}&role=eq.admin`),
      serviceRest<unknown[]>(`admin_users?select=id&id=eq.${id}&is_active=eq.true`),
    ]);
    if (staffAdmin.length || activeAdmin.length) {
      return reply(
        { error: "That account is an admin. Admins change their own password from their account." },
        403,
      );
    }
    // Flag first: if anything after this fails, the account still has to change its password.
    const flagged = await serviceRest<unknown[]>(`profiles?user_id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ must_change_password: true }),
    });
    if (flagged.length !== 1) return reply({ error: "That account has no profile." }, 404);

    const password = temporaryPassword();
    await authAdmin(`users/${id}`, { method: "PUT", body: JSON.stringify({ password }) });
    await serviceRest("admin_audit_log", {
      method: "POST",
      body: JSON.stringify({
        admin_id: gate.admin.id,
        target_user_id: id,
        action: "password_reset",
      }),
    });
    return reply({ password });
  } catch {
    return reply({ error: "The password wasn't reset. Try again." }, 502);
  }
}
