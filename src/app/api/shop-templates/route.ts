import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { goldShopCategories, goldShopTemplates } from "@/lib/db/schema";

/**
 * Public list of published Gold Shop item templates plus the category list —
 * intentionally unauthenticated so anonymous (local-only) users can browse
 * suggestions too. Adoption happens client-side by copying into IndexedDB
 * (category resolved by name); nothing is written here.
 */
export async function GET() {
  const [categories, templates] = await Promise.all([
    db
      .select({
        id: goldShopCategories.id,
        name: goldShopCategories.name,
        sortOrder: goldShopCategories.sortOrder,
      })
      .from(goldShopCategories)
      .orderBy(asc(goldShopCategories.sortOrder), asc(goldShopCategories.createdAt)),
    db
      .select({
        id: goldShopTemplates.id,
        name: goldShopTemplates.name,
        categoryId: goldShopTemplates.categoryId,
        stock: goldShopTemplates.stock,
        price: goldShopTemplates.price,
        icon: goldShopTemplates.icon,
        sortOrder: goldShopTemplates.sortOrder,
      })
      .from(goldShopTemplates)
      .where(eq(goldShopTemplates.published, true))
      .orderBy(asc(goldShopTemplates.sortOrder), asc(goldShopTemplates.createdAt)),
  ]);
  return Response.json({ categories, templates });
}
