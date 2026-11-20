import prisma from "../db.server";

/** Render readiness probe: intentionally exposes no database or app details. */
export async function loader() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
