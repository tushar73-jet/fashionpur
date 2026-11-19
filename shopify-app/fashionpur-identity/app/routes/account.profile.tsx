import { Form, redirect, useLoaderData } from "react-router";
import { assertCsrf, destroyCustomerSession, noStoreHeaders, requireCustomerSession, sessionTokenFromRequest } from "../services/customer-session.server";
import { getIdentityService } from "../services/identity-runtime.server";

export async function loader({ request }: { request: Request }) {
  const { identity, csrfToken } = requireCustomerSession(request, getIdentityService());
  const headers = noStoreHeaders();
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify({ identity, csrfToken }), { headers });
}

export async function action({ request }: { request: Request }) {
  const service = getIdentityService();
  const session = requireCustomerSession(request, service);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  if (intent === "logout") {
    service.destroySession(sessionTokenFromRequest(request));
    const headers = noStoreHeaders();
    headers.append("Set-Cookie", destroyCustomerSession());
    return redirect("/account/login", { headers });
  }
  assertCsrf(String(form.get("csrf") ?? ""), session.csrfToken);
  if (intent === "profile") {
    service.updateProfile(session.identity.id, { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") });
  } else if (intent === "consent") {
    service.updateMarketingConsent(session.identity.id, form.get("marketingConsent") === "on");
  } else {
    throw new Response("Not found", { status: 404, headers: noStoreHeaders() });
  }
  return redirect("/account/profile", { headers: noStoreHeaders() });
}

export default function Profile() {
  const { identity, csrfToken } = useLoaderData() as Awaited<ReturnType<typeof loader>> extends Response ? { identity: { phone: string; name: string | null; email: string | null; marketingConsent: unknown }; csrfToken: string } : never;
  return (
    <main className="identity-shell">
      <section className="identity-card identity-profile" aria-labelledby="profile-title">
        <p className="identity-kicker">FASHIONPUR ACCOUNT</p>
        <h1 id="profile-title">Your profile</h1>
        <p className="identity-verified">Verified mobile: {identity.phone}</p>
        <Form method="post" className="identity-form">
          <input type="hidden" name="intent" value="profile" /><input type="hidden" name="csrf" value={csrfToken} />
          <label>Name<input name="name" defaultValue={identity.name ?? ""} autoComplete="name" /></label>
          <label>Email<input name="email" type="email" defaultValue={identity.email ?? ""} autoComplete="email" /></label>
          <button type="submit">Save profile</button>
        </Form>
        <Form method="post" className="identity-form identity-consent">
          <input type="hidden" name="intent" value="consent" /><input type="hidden" name="csrf" value={csrfToken} />
          <label className="identity-checkbox"><input name="marketingConsent" type="checkbox" defaultChecked={Boolean(identity.marketingConsent)} /> I want to receive Fashionpur offers on WhatsApp.</label>
          <button type="submit">Save communication preference</button>
        </Form>
        <section className="identity-pending"><h2>Addresses, orders and tracking</h2><p>These connect after Shopify protected customer-data approval and the Phase 2 data migration. Razorpay Magic Checkout is not changed.</p></section>
        <Form method="post"><input type="hidden" name="intent" value="logout" /><button className="identity-secondary" type="submit">Log out</button></Form>
      </section>
    </main>
  );
}
