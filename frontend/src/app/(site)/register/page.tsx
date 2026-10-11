"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/features/sell/components/RequestForm";
import { registerAccount, type ReLoopRole } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<ReLoopRole | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", shopName: "", gstin: "", businessAddress: "" });
  const update = (key: keyof typeof form, value: string) => setForm((old) => ({ ...old, [key]: value }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (!role) { setError("Choose whether you are registering as a buyer or shop owner."); return; }
    if (role === "shop_owner" && !/^[0-9A-Z]{15}$/.test(form.gstin.trim().toUpperCase())) { setError("Enter a 15-character GSTIN. ReLoop will verify it before enabling shop submissions."); return; }
    setBusy(true);
    try {
      const result = await registerAccount({ ...form, role });
      if (result.session) router.push("/account"); else setMessage(result.message);
    } catch (e) { setError(e instanceof Error ? e.message : "Registration failed. Please try again."); }
    finally { setBusy(false); }
  }
  return <Container className="py-12 sm:py-16"><div className="mx-auto max-w-2xl"><p className="text-sm font-semibold text-brand-600">JOIN RELOOP</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Create your account</h1><p className="mt-3 text-muted">Buyers can shop. Shop owners can shop too, and request approval to submit stock to ReLoop.</p>
    <div className="mt-8 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setRole("buyer")} className={`rounded-2xl border p-5 text-left ${role === "buyer" ? "border-brand-600 bg-brand-50" : "border-line bg-surface"}`}><span className="font-semibold">I'm a buyer</span><p className="mt-1 text-sm text-muted">Browse products and manage orders.</p></button><button type="button" onClick={() => setRole("shop_owner")} className={`rounded-2xl border p-5 text-left ${role === "shop_owner" ? "border-brand-600 bg-brand-50" : "border-line bg-surface"}`}><span className="font-semibold">I'm a shop owner</span><p className="mt-1 text-sm text-muted">Buy products and apply to submit electronics for review.</p></button></div>
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-7"><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">Full name *<input className={inputClass} required maxLength={100} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} autoComplete="name" /></label><label className="grid gap-1.5 text-sm font-medium">Phone number *<input className={inputClass} required type="tel" maxLength={20} value={form.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" /></label><label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Email address *<input className={inputClass} required type="email" maxLength={254} value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" /></label><label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Password *<input className={inputClass} required type="password" minLength={8} maxLength={128} value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete="new-password" /><span className="text-xs text-muted">Use at least 8 characters.</span></label></div>
    {role === "shop_owner" && <div className="space-y-4 border-t border-line pt-4"><h2 className="font-semibold">Business details</h2><label className="grid gap-1.5 text-sm font-medium">Shop / business name *<input className={inputClass} required maxLength={120} value={form.shopName} onChange={(e) => update("shopName", e.target.value)} /></label><label className="grid gap-1.5 text-sm font-medium">GSTIN *<input className={inputClass} required maxLength={15} minLength={15} value={form.gstin} onChange={(e) => update("gstin", e.target.value.toUpperCase())} placeholder="15-character GSTIN" autoCapitalize="characters" /></label><label className="grid gap-1.5 text-sm font-medium">Business address *<textarea className={`${inputClass} min-h-20 py-3`} required maxLength={300} value={form.businessAddress} onChange={(e) => update("businessAddress", e.target.value)} /></label><p className="text-sm text-muted">Shop owner access starts as pending. GSTIN submission is not itself proof of verification; ReLoop will review it.</p></div>}
    {error && <p role="alert" className="rounded-lg bg-danger/5 p-3 text-sm text-danger">{error}</p>}{message && <p role="status" className="rounded-lg bg-grade-a-bg p-3 text-sm">{message}</p>}<Button type="submit" size="lg" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button><p className="text-sm text-muted">Already registered? <Link className="font-semibold text-brand-600 underline" href="/login">Log in</Link></p></form></div></Container>;
}
