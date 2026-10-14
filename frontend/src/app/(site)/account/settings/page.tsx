"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import {
  myDeletionRequest,
  myProfile,
  myShop,
  requestDeletion,
  updateProfile,
  updateShop,
  withdrawDeletion,
  type DeletionRequest,
} from "@/features/account/api";
import { RequireAccount } from "@/features/account/RequireAccount";
import { accessChanged, getSession, type Access } from "@/lib/auth-client";
import { IS_SIMULATION, isDemoAccount } from "@/lib/environment";

export default function AccountSettingsPage() {
  return (
    <RequireAccount>
      {(access) => (
        <Container className="py-12 sm:py-16">
          <div className="mx-auto grid max-w-3xl gap-8">
            <div>
              <Eyebrow>My ReLoop</Eyebrow>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Profile and settings</h1>
            </div>
            {IS_SIMULATION && isDemoAccount(getSession()?.user.email) && (
              <Notice tone="info" role="note" title="This is a shared demo login">
                Every visitor uses it, so its details can&apos;t be changed and it can&apos;t be
                deleted. The forms below show how it works; saving explains why it stops.
              </Notice>
            )}
            <ProfileForm />
            {access.role === "shop_owner" && <ShopForm access={access} />}
            <DeleteAccount access={access} />
          </div>
        </Container>
      )}
    </RequireAccount>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** Save state for a form: busy, the error, and a success message. */
function useSave() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  async function run(work: () => Promise<string>) {
    setBusy(true);
    setError("");
    setDone("");
    try {
      setDone(await work());
    } catch (e) {
      setError(e instanceof Error ? e.message : "That wasn't saved.");
    } finally {
      setBusy(false);
    }
  }
  const status = (
    <>
      {done && (
        <p role="status" className="text-sm text-success">
          {done}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
  return { busy, run, status };
}

function ProfileForm() {
  const [values, setValues] = useState<{ name: string; phone: string } | null>(null);
  const save = useSave();
  useEffect(() => {
    let alive = true;
    myProfile()
      .then((p) => alive && setValues({ name: p?.full_name ?? "", phone: p?.phone ?? "" }))
      .catch(() => alive && setValues({ name: "", phone: "" }));
    return () => {
      alive = false;
    };
  }, []);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!values) return;
    void save.run(async () => {
      await updateProfile(values.name, values.phone);
      accessChanged(); // the header shows the new name
      return "Saved.";
    });
  }
  return (
    <Section title="Your details">
      {!values ? (
        <p className="mt-4 text-sm text-muted">Loading…</p>
      ) : (
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Your name" htmlFor="profile-name">
            <Input
              id="profile-name"
              autoComplete="name"
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
          </Field>
          <Field
            label="Phone (WhatsApp)"
            htmlFor="profile-phone"
            hint="ReLoop calls or messages you on this number."
          >
            <Input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={(e) => setValues({ ...values, phone: e.target.value })}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={save.busy}>
              {save.busy ? "Saving…" : "Save details"}
            </Button>
            {save.status}
          </div>
        </form>
      )}
    </Section>
  );
}

function ShopForm({ access }: { access: Access }) {
  const [values, setValues] = useState<{ name: string; gstin: string; address: string } | null>(
    null,
  );
  const save = useSave();
  useEffect(() => {
    let alive = true;
    myShop()
      .then(
        (s) =>
          alive &&
          setValues({
            name: s?.shop_name ?? "",
            gstin: s?.gstin ?? "",
            address: s?.business_address ?? "",
          }),
      )
      .catch(() => alive && setValues({ name: "", gstin: "", address: "" }));
    return () => {
      alive = false;
    };
  }, []);
  const checked = access.shop_status !== "pending";
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!values) return;
    void save.run(async () => {
      const status = await updateShop(values.name, values.gstin, values.address);
      accessChanged();
      return status === "pending" && checked
        ? "Saved. A new shop name or GSTIN is checked again, so your shop is back to “being checked” for now."
        : "Saved.";
    });
  }
  return (
    <Section title="Your shop">
      {checked && (
        <p className="mt-2 text-sm text-muted">
          Changing the shop name or GSTIN sends your shop back for checking before you can submit
          more items. The address doesn&apos;t.
        </p>
      )}
      {!values ? (
        <p className="mt-4 text-sm text-muted">Loading…</p>
      ) : (
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Shop name" htmlFor="shop-name">
            <Input
              id="shop-name"
              autoComplete="organization"
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
          </Field>
          <Field
            label="GSTIN"
            htmlFor="shop-gstin"
            hint="Leave empty if the shop isn't GST-registered."
          >
            <Input
              id="shop-gstin"
              value={values.gstin}
              maxLength={15}
              onChange={(e) => setValues({ ...values, gstin: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="Shop address" htmlFor="shop-address" className="sm:col-span-2">
            <Textarea
              id="shop-address"
              autoComplete="street-address"
              value={values.address}
              onChange={(e) => setValues({ ...values, address: e.target.value })}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={save.busy}>
              {save.busy ? "Saving…" : "Save shop details"}
            </Button>
            {save.status}
          </div>
        </form>
      )}
    </Section>
  );
}

function DeleteAccount({ access }: { access: Access }) {
  const [request, setRequest] = useState<DeletionRequest | null | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const save = useSave();
  useEffect(() => {
    let alive = true;
    myDeletionRequest()
      .then((r) => alive && setRequest(r))
      .catch(() => alive && setRequest(null));
    return () => {
      alive = false;
    };
  }, []);
  const team = access.is_staff || access.is_admin;
  return (
    <Section title="Delete my account and data">
      <div className="mt-2 grid gap-2 text-sm text-ink-soft">
        <p>
          An admin deletes your account, profile
          {access.role === "shop_owner" ? ", shop details" : ""} and notifications within 30 days of
          your request. Records ReLoop must keep (items bought from you and what we paid, for tax
          and e-waste records) stay, with your name replaced by “Deleted account”. Your requests
          keep only their stage.
        </p>
        <p>
          Requests you sent without logging in can&apos;t be linked to your account; they are
          deleted 12 months after they close.
        </p>
      </div>
      {request === undefined ? (
        <p className="mt-4 text-sm text-muted">Loading…</p>
      ) : request?.status === "open" ? (
        <div className="mt-4 grid gap-3">
          <Notice tone="info" role="status" title="Your request is with ReLoop">
            Sent on{" "}
            {new Date(request.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            . An admin handles it within 30 days. You can still use your account until then.
          </Notice>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              disabled={save.busy}
              onClick={() =>
                void save.run(async () => {
                  await withdrawDeletion();
                  setRequest(await myDeletionRequest());
                  return "Your request is withdrawn. Nothing will be deleted.";
                })
              }
            >
              Withdraw my request
            </Button>
            {save.status}
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {request?.status === "refused" && (
            <Notice tone="warning" title="An earlier request wasn't carried out">
              {request.note}
            </Notice>
          )}
          {team && (
            <Notice tone="info">
              You&apos;re on the hub team. An admin removes you from the team before your account
              can be deleted.
            </Notice>
          )}
          {!confirming ? (
            <Button
              variant="secondary"
              className="justify-self-start"
              onClick={() => setConfirming(true)}
            >
              Ask ReLoop to delete my account
            </Button>
          ) : (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void save.run(async () => {
                  await requestDeletion(reason);
                  setRequest(await myDeletionRequest());
                  setConfirming(false);
                  return "Your request is sent.";
                });
              }}
            >
              <Field label="Anything we should know? (optional)" htmlFor="delete-reason">
                <Textarea
                  id="delete-reason"
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" variant="dark" disabled={save.busy}>
                  {save.busy ? "Sending…" : "Send my deletion request"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
          {save.status}
        </div>
      )}
    </Section>
  );
}
