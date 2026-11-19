import crypto from "node:crypto";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

type CartPayload = { token?: string; currency?: string; total_price?: number; items?: Array<{ variant_id?: number; product_id?: number; title?: string; quantity?: number; final_price?: number; image?: string }> };

export async function action({ request }: { request: Request }) {
  await authenticate.public.appProxy(request);
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const cart = await request.json() as CartPayload;
  const claimSecret = request.headers.get("x-fashionpur-cart-claim");
  if (!cart.token || !claimSecret || claimSecret.length < 32 || !Array.isArray(cart.items)) return new Response("Invalid cart", { status: 400 });
  const lines = cart.items.filter((item) => item.variant_id && item.title).map((item) => ({ id: crypto.randomUUID(), variantId: String(item.variant_id), productId: item.product_id ? String(item.product_id) : null, title: item.title!, quantity: Math.max(0, item.quantity ?? 0), unitPrice: item.final_price == null ? null : item.final_price / 100, imageUrl: item.image ?? null }));
  await prisma.$transaction(async (tx) => {
    const saved = await tx.customerCart.upsert({ where: { shopifyCartToken: cart.token! }, create: { id: crypto.randomUUID(), shopifyCartToken: cart.token!, claimSecretHash: crypto.createHash("sha256").update(claimSecret).digest("hex"), currencyCode: cart.currency ?? null, totalAmount: (cart.total_price ?? 0) / 100, status: "active", lastActivityAt: new Date() }, update: { currencyCode: cart.currency ?? null, totalAmount: (cart.total_price ?? 0) / 100, status: "active", lastActivityAt: new Date() } });
    await tx.customerCartLine.deleteMany({ where: { cartId: saved.id } });
    if (lines.length) await tx.customerCartLine.createMany({ data: lines.map((line) => ({ ...line, cartId: saved.id })) });
  });
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
