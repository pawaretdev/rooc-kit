import { eq } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/admin-api";
import { db } from "@/lib/db/client";
import { goldShopCategories } from "@/lib/db/schema";

const MAX_NAME_LENGTH = 100;

type CategoryPatch = Partial<{ name: string; sortOrder: number }>;

function parseCategoryPatch(raw: unknown): CategoryPatch | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const patch: CategoryPatch = {};
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
  if (r.sortOrder !== undefined) {
    if (typeof r.sortOrder !== "number" || !Number.isFinite(r.sortOrder)) {
      return null;
    }
    patch.sortOrder = r.sortOrder;
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
    patch = parseCategoryPatch(await req.json());
  } catch {
    patch = null;
  }
  if (!patch) {
    return Response.json({ error: "invalid category payload" }, { status: 400 });
  }

  const { id } = await params;
  const [row] = await db
    .update(goldShopCategories)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(goldShopCategories.id, id))
    .returning();
  if (!row) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json({ category: row });
}

/** Deleting a category cascades to its templates (FK on delete cascade). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const rows = await db
    .delete(goldShopCategories)
    .where(eq(goldShopCategories.id, id))
    .returning({ id: goldShopCategories.id });
  if (rows.length === 0) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
