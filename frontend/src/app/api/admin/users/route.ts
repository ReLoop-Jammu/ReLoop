import { authAdmin, reply, requireAdmin, serviceRest } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type AuthUser = {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
};
type Profile = {
  user_id: string;
  full_name: string;
  phone: string;
  role: string;
  must_change_password: boolean;
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  isStaff: boolean;
  isAdmin: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  mustChangePassword: boolean;
};

/** Every auth account, page by page (the auth API returns at most 1,000 per page). */
async function allAuthUsers(): Promise<AuthUser[]> {
  const all: AuthUser[] = [];
  for (let page = 1; page <= 50; page++) {
    const { users } = await authAdmin<{ users: AuthUser[] }>(`users?page=${page}&per_page=1000`);
    all.push(...users);
    if (users.length < 1000) break;
  }
  return all;
}

/** Every account, for admins only: who they are, their role and when they last signed in. */
export async function GET(request: Request) {
  const gate = await requireAdmin(request);
  if ("response" in gate) return gate.response;
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
    const [users, profiles, staff, admins] = await Promise.all([
      allAuthUsers(),
      serviceRest<Profile[]>("profiles?select=user_id,full_name,phone,role,must_change_password"),
      serviceRest<{ user_id: string }[]>("staff?select=user_id"),
      serviceRest<{ id: string }[]>("admin_users?select=id&is_active=eq.true"),
    ]);
    const rows: AdminUserRow[] = users.map((u) => {
      const p = profiles.find((x) => x.user_id === u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        name: p?.full_name ?? "",
        phone: p?.phone ?? "",
        role: p?.role ?? "(no profile)",
        isStaff: staff.some((s) => s.user_id === u.id),
        isAdmin: admins.some((a) => a.id === u.id),
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        emailConfirmed: Boolean(u.email_confirmed_at),
        mustChangePassword: p?.must_change_password ?? false,
      };
    });
    const match = (r: AdminUserRow) =>
      !q ||
      [r.email, r.name, r.phone.replace(/\s/g, "")].some((v) =>
        v.toLowerCase().includes(q.replace(/\s/g, "")),
      );
    return reply({
      users: rows.filter(match).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    });
  } catch {
    return reply({ error: "Could not load accounts." }, 502);
  }
}
