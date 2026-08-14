import { asc } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/admin-api";
import { db } from "@/lib/db/client";
import { goldShopCategories } from "@/lib/db/schema";

const MAX_NAME_LENGTH = 100;

/** All template categories — admin editor listing. */
export async function GET() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const rows = await db
    .select()
    .from(goldShopCategories)
    .orderBy(asc(goldShopCategories.sortOrder), asc(goldShopCategories.createdAt));
  return Response.json({ categories: rows });
}

export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  let name: string | null = null;
  try {
    const raw = (await req.json()) as Record<string, unknown>;
    if (
      typeof raw.name === "string" &&
      raw.name.trim().length > 0 &&
      raw.name.trim().length <= MAX_NAME_LENGTH
    ) {
      name = raw.name.trim();
    }
  } catch {
    name = null;
  }
  if (!name) {
    return Response.json({ error: "invalid category payload" }, { status: 400 });
  }

  const existing = await db
    .select({ sortOrder: goldShopCategories.sortOrder })
    .from(goldShopCategories);
  const sortOrder =
    existing.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1;

  const [row] = await db
    .insert(goldShopCategories)
    .values({ name, sortOrder })
    .returning();
  return Response.json({ category: row });
}
