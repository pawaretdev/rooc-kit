import { asc, eq } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/admin-api";
import { db } from "@/lib/db/client";
import { goldShopCategories, goldShopTemplates } from "@/lib/db/schema";

const MAX_NAME_LENGTH = 100;
const MAX_PRICE = 9_999_999;
/** in-game weekly limits reach the thousands (Mora Coin: 5,000) */
const MAX_STOCK = 99_999;

function isValidName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= MAX_NAME_LENGTH
  );
}

function parseTemplateInput(raw: unknown): {
  name: string;
  categoryId: string;
  stock: number | null;
  price: number;
} | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isValidName(r.name)) return null;
  if (typeof r.categoryId !== "string" || r.categoryId.length === 0) return null;
  if (
    typeof r.price !== "number" ||
    !Number.isInteger(r.price) ||
    r.price < 0 ||
    r.price > MAX_PRICE
  ) {
    return null;
  }
  if (
    r.stock != null &&
    (typeof r.stock !== "number" ||
      !Number.isInteger(r.stock) ||
      r.stock < 1 ||
      r.stock > MAX_STOCK)
  ) {
    return null;
  }
  return {
    name: r.name.trim(),
    categoryId: r.categoryId,
    stock: (r.stock as number | undefined) ?? null,
    price: r.price,
  };
}

/** All templates including drafts — admin editor listing. */
export async function GET() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const rows = await db
    .select()
    .from(goldShopTemplates)
    .orderBy(asc(goldShopTemplates.sortOrder), asc(goldShopTemplates.createdAt));
  return Response.json({ templates: rows });
}

export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  let input;
  try {
    input = parseTemplateInput(await req.json());
  } catch {
    input = null;
  }
  if (!input) {
    return Response.json({ error: "invalid template payload" }, { status: 400 });
  }

  const category = await db
    .select({ id: goldShopCategories.id })
    .from(goldShopCategories)
    .where(eq(goldShopCategories.id, input.categoryId));
  if (category.length === 0) {
    return Response.json({ error: "unknown category" }, { status: 400 });
  }

  const existing = await db
    .select({ sortOrder: goldShopTemplates.sortOrder })
    .from(goldShopTemplates);
  const sortOrder =
    existing.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1;

  const [row] = await db
    .insert(goldShopTemplates)
    .values({ ...input, sortOrder })
    .returning();
  return Response.json({ template: row });
}
