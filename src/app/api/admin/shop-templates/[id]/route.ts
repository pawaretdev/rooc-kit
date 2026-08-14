import { eq } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/admin-api";
import { db } from "@/lib/db/client";
import { goldShopCategories, goldShopTemplates } from "@/lib/db/schema";

const MAX_NAME_LENGTH = 100;
const MAX_PRICE = 9_999_999;
/** in-game weekly limits reach the thousands (Mora Coin: 5,000) */
const MAX_STOCK = 99_999;

type TemplatePatch = Partial<{
  name: string;
  categoryId: string;
  /** null = Unlimited */
  stock: number | null;
  price: number;
  sortOrder: number;
  published: boolean;
}>;

/** Partial update — only whitelisted fields, null when anything is malformed. */
function parseTemplatePatch(raw: unknown): TemplatePatch | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const patch: TemplatePatch = {};
  if (r.name !== undefined) {
    if (
      typeof r.name !== "string" ||
      r.name.trim().length === 0 ||
      r.name.trim().length > MAX_NAME_LENGTH
    ) {
      return null;
    }
    patch.name = r.name.trim();
  }
  if (r.categoryId !== undefined) {
    if (typeof r.categoryId !== "string" || r.categoryId.length === 0) {
      return null;
    }
    patch.categoryId = r.categoryId;
  }
  if (r.stock !== undefined) {
    if (
      r.stock !== null &&
      (typeof r.stock !== "number" ||
        !Number.isInteger(r.stock) ||
        r.stock < 1 ||
        r.stock > MAX_STOCK)
    ) {
      return null;
    }
    patch.stock = r.stock as number | null;
  }
  if (r.price !== undefined) {
    if (
      typeof r.price !== "number" ||
      !Number.isInteger(r.price) ||
      r.price < 0 ||
      r.price > MAX_PRICE
    ) {
      return null;
    }
    patch.price = r.price;
  }
  if (r.sortOrder !== undefined) {
    if (typeof r.sortOrder !== "number" || !Number.isFinite(r.sortOrder)) {
      return null;
    }
    patch.sortOrder = r.sortOrder;
  }
  if (r.published !== undefined) {
    if (typeof r.published !== "boolean") return null;
    patch.published = r.published;
  }
  if (Object.keys(patch).length === 0) return null;
  return patch;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  let patch;
  try {
    patch = parseTemplatePatch(await req.json());
  } catch {
    patch = null;
  }
  if (!patch) {
    return Response.json({ error: "invalid template payload" }, { status: 400 });
  }

  if (patch.categoryId !== undefined) {
    const category = await db
      .select({ id: goldShopCategories.id })
      .from(goldShopCategories)
      .where(eq(goldShopCategories.id, patch.categoryId));
    if (category.length === 0) {
      return Response.json({ error: "unknown category" }, { status: 400 });
    }
  }

  const { id } = await params;
  const [row] = await db
    .update(goldShopTemplates)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(goldShopTemplates.id, id))
    .returning();
  if (!row) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json({ template: row });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const rows = await db
    .delete(goldShopTemplates)
    .where(eq(goldShopTemplates.id, id))
    .returning({ id: goldShopTemplates.id });
  if (rows.length === 0) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
