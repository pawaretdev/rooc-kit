"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  FolderCog,
  Infinity as InfinityIcon,
  Plus,
  Store,
  Trash2,
} from "lucide-react";
import {
  DragHandle,
  SortableItem,
  SortableList,
} from "@/components/SortableList";
import { StatTile } from "@/features/admin/StatTile";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryTabs, ShopCardGrid, ShopItemCard } from "../ShopGrid";

interface AdminCategory {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminTemplate {
  id: string;
  name: string;
  categoryId: string;
  /** null = Unlimited */
  stock: number | null;
  price: number;
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

const MAX_NAME_LENGTH = 100;
const MAX_PRICE = 9_999_999;
/** in-game weekly limits reach the thousands (Mora Coin: 5,000) */
const MAX_STOCK = 99_999;

function clampPrice(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_PRICE, Math.round(value)));
}

function clampStock(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(MAX_STOCK, Math.round(value)));
}

type Status = "loading" | "idle" | "busy" | "error";

async function fetchCategories(): Promise<AdminCategory[]> {
  const res = await fetch("/api/admin/shop-categories");
  if (!res.ok) throw new Error("failed");
  const body = (await res.json()) as { categories: AdminCategory[] };
  return body.categories;
}

async function fetchTemplates(): Promise<AdminTemplate[]> {
  const res = await fetch("/api/admin/shop-templates");
  if (!res.ok) throw new Error("failed");
  const body = (await res.json()) as { templates: AdminTemplate[] };
  return body.templates;
}

/** Stock editor — number input, or the ∞ toggle once it's marked Unlimited. */
function StockCell({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (next: number | null) => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(value !== null);

  if (!editing) {
    return (
      <span className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("shop.unlimited")}
          title={t("shop.unlimited")}
          className="text-accent hover:text-accent"
          onClick={() => setEditing(true)}
        >
          <InfinityIcon className="size-3.5" />
        </Button>
        <span className="text-sm text-sub">{t("shop.unlimited")}</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_STOCK}
        key={value ?? "new"}
        defaultValue={value ?? 1}
        aria-label={t("shop.stock")}
        className="h-8 w-16 min-w-0"
        onBlur={(e) => {
          const next = clampStock(Number(e.target.value));
          e.target.value = String(next);
          if (next !== value) onCommit(next);
        }}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("shop.unlimited")}
        title={t("shop.unlimited")}
        onClick={() => {
          setEditing(false);
          onCommit(null);
        }}
      >
        <InfinityIcon className="size-3.5" />
      </Button>
    </span>
  );
}

type ConfirmDelete =
  | { kind: "template"; row: AdminTemplate }
  | { kind: "category"; row: AdminCategory }
  | null;

/**
 * Super-admin CRUD for suggested Gold Shop items. Categories are entities of
 * their own — created first (right column), then items bind to one — and the
 * preview card renders the catalog exactly like the player-facing shop grid.
 * The /admin layout gates access server-side; every API call is re-checked.
 */
export function ShopTemplateAdmin() {
  const t = useT();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newPrice, setNewPrice] = useState(0);
  const [newStock, setNewStock] = useState(1);
  const [newUnlimited, setNewUnlimited] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete>(null);
  const [previewTab, setPreviewTab] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cats, tpls] = await Promise.all([
          fetchCategories(),
          fetchTemplates(),
        ]);
        if (!cancelled) {
          setCategories(cats);
          setTemplates(tpls);
          setStatus("idle");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = async () => {
    const [cats, tpls] = await Promise.all([fetchCategories(), fetchTemplates()]);
    setCategories(cats);
    setTemplates(tpls);
  };

  const mutate = async (run: () => Promise<Response>): Promise<boolean> => {
    setStatus("busy");
    try {
      const res = await run();
      if (!res.ok) throw new Error();
      await refetch();
      setStatus("idle");
      return true;
    } catch {
      setStatus("error");
      return false;
    }
  };

  // --- categories ---

  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const ok = await mutate(() =>
      fetch("/api/admin/shop-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    );
    if (ok) setNewCategoryName("");
  };

  const updateCategory = (id: string, patch: Partial<AdminCategory>) =>
    void mutate(() =>
      fetch(`/api/admin/shop-categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    );

  const removeCategory = (id: string) =>
    void mutate(() =>
      fetch(`/api/admin/shop-categories/${id}`, { method: "DELETE" }),
    );

  const reorderCategories = async (nextIds: string[]) => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const ordered = nextIds.flatMap((id) => byId.get(id) ?? []);
    const orders = categories.map((c) => c.sortOrder).sort((a, b) => a - b);
    setCategories(ordered.map((c, i) => ({ ...c, sortOrder: orders[i] })));
    setStatus("busy");
    try {
      for (const [i, c] of ordered.entries()) {
        if (c.sortOrder === orders[i]) continue;
        const res = await fetch(`/api/admin/shop-categories/${c.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: orders[i] }),
        });
        if (!res.ok) throw new Error();
      }
      await refetch();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  // --- templates ---

  const createTemplate = async () => {
    const name = newName.trim();
    if (!name || !newCategoryId) return;
    const ok = await mutate(() =>
      fetch("/api/admin/shop-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          categoryId: newCategoryId,
          price: newPrice,
          stock: newUnlimited ? null : newStock,
        }),
      }),
    );
    if (ok) {
      setNewName("");
      setNewPrice(0);
      setNewStock(1);
      setNewUnlimited(false);
    }
  };

  const updateTemplate = (id: string, patch: Partial<AdminTemplate>) =>
    void mutate(() =>
      fetch(`/api/admin/shop-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    );

  const removeTemplate = (id: string) =>
    void mutate(() =>
      fetch(`/api/admin/shop-templates/${id}`, { method: "DELETE" }),
    );

  /**
   * Drop applies optimistically (the row is already where the user let go),
   * then persists the reshuffled sortOrder values row by row.
   */
  const reorderTemplates = async (nextIds: string[]) => {
    const byId = new Map(templates.map((tpl) => [tpl.id, tpl]));
    const ordered = nextIds.flatMap((id) => byId.get(id) ?? []);
    const orders = templates.map((tpl) => tpl.sortOrder).sort((a, b) => a - b);
    setTemplates(ordered.map((tpl, i) => ({ ...tpl, sortOrder: orders[i] })));
    setStatus("busy");
    try {
      for (const [i, tpl] of ordered.entries()) {
        if (tpl.sortOrder === orders[i]) continue;
        const res = await fetch(`/api/admin/shop-templates/${tpl.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: orders[i] }),
        });
        if (!res.ok) throw new Error();
      }
      await refetch();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  /**
   * Dragging inside the preview reorders only the shown category: the dropped
   * sequence takes over that category's own sortOrder slots, so every other
   * category keeps the positions it had.
   */
  const reorderPreview = async (nextIds: string[]) => {
    const byId = new Map(previewItems.map((tpl) => [tpl.id, tpl]));
    const ordered = nextIds.flatMap((id) => byId.get(id) ?? []);
    const slots = previewItems.map((tpl) => tpl.sortOrder).sort((a, b) => a - b);
    const patched = new Map(ordered.map((tpl, i) => [tpl.id, slots[i]]));
    setTemplates((prev) =>
      prev
        .map((tpl) => {
          const next = patched.get(tpl.id);
          return next === undefined ? tpl : { ...tpl, sortOrder: next };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder),
    );
    setStatus("busy");
    try {
      for (const [i, tpl] of ordered.entries()) {
        if (tpl.sortOrder === slots[i]) continue;
        const res = await fetch(`/api/admin/shop-templates/${tpl.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: slots[i] }),
        });
        if (!res.ok) throw new Error();
      }
      await refetch();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const publishedCount = templates.filter((tpl) => tpl.published).length;
  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "—";
  const templateCount = (categoryId: string) =>
    templates.filter((tpl) => tpl.categoryId === categoryId).length;

  // Preview mirrors the player-facing grid; drafts render dimmed with a tag.
  const previewCategories = categories.filter(
    (c) => templateCount(c.id) > 0,
  );
  const activePreviewId =
    previewCategories.find((c) => c.id === previewTab)?.id ??
    previewCategories[0]?.id;
  const previewItems = templates.filter(
    (tpl) => tpl.categoryId === activePreviewId,
  );

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-extrabold tracking-tight">
          {t("admin.shopTemplates")}
        </h2>
        <p className="mt-0.5 max-w-prose text-sm text-sub">
          {t("admin.shopTemplatesHint")}
        </p>
      </header>

      {status === "error" && (
        <p className="text-sm font-medium text-danger">{t("admin.saveError")}</p>
      )}
      {status === "loading" ? (
        <p className="text-sm text-sub">{t("common.loading")}</p>
      ) : (
        <>
          <div className="grid max-w-md grid-cols-3 gap-3">
            <StatTile label={t("admin.total")} value={templates.length} />
            <StatTile
              label={t("admin.published")}
              value={publishedCount}
              tone="text-gold"
            />
            <StatTile
              label={t("admin.draft")}
              value={templates.length - publishedCount}
              tone="text-sub"
            />
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            {/* the item editor — one frame: header, create toolbar, table */}
            <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface">
              <header className="flex items-center gap-2 border-b border-line px-4 py-3">
                <Store className="size-4 text-gold" />
                <h3 className="text-sm font-bold">{t("shop.catalog")}</h3>
              </header>

              <form
                className="flex w-full flex-wrap items-center gap-2 border-b border-line bg-surface-2/30 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void createTemplate();
                }}
              >
                <Input
                  value={newName}
                  maxLength={MAX_NAME_LENGTH}
                  placeholder={t("shop.itemName")}
                  aria-label={t("shop.itemName")}
                  className="h-8 min-w-40 flex-1"
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                  <SelectTrigger
                    aria-label={t("shop.category")}
                    className="h-8 w-36"
                  >
                    <SelectValue placeholder={t("shop.category")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_PRICE}
                  key={newPrice}
                  defaultValue={newPrice}
                  aria-label={t("shop.price")}
                  title={t("shop.price")}
                  className="h-8 w-24"
                  onBlur={(e) => {
                    const next = clampPrice(Number(e.target.value));
                    e.target.value = String(next);
                    setNewPrice(next);
                  }}
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_STOCK}
                  key={newStock}
                  defaultValue={newStock}
                  disabled={newUnlimited}
                  aria-label={t("shop.stock")}
                  title={t("shop.stock")}
                  className="h-8 w-16"
                  onBlur={(e) => {
                    const next = clampStock(Number(e.target.value));
                    e.target.value = String(next);
                    setNewStock(next);
                  }}
                />
                <label className="flex shrink-0 items-center gap-1.5 text-sm text-sub">
                  <Checkbox
                    checked={newUnlimited}
                    onCheckedChange={(checked) =>
                      setNewUnlimited(checked === true)
                    }
                  />
                  {t("shop.unlimited")}
                </label>
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    status === "busy" || !newName.trim() || !newCategoryId
                  }
                >
                  <Plus className="size-3.5" />
                  {t("admin.newTemplate")}
                </Button>
              </form>

              <SortableList
                ids={templates.map((tpl) => tpl.id)}
                onReorder={(nextIds) => void reorderTemplates(nextIds)}
              >
                {/* dims while a save is in flight — the only feedback for a
                    mutation that changes nothing visible until it returns */}
                <div
                  className={`w-full transition-opacity duration-200 ${
                    status === "busy" ? "opacity-60" : ""
                  }`}
                >
                  {/* table-fixed: columns keep their declared widths and the
                      name column absorbs the rest — never scrolls sideways */}
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-line text-left">
                        <th className="w-10 px-2 py-2.5" />
                        <th className="px-2 py-2.5 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
                          {t("shop.itemName")}
                        </th>
                        <th className="w-36 px-2 py-2.5 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
                          {t("shop.category")}
                        </th>
                        <th className="w-36 px-2 py-2.5 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
                          {t("shop.stock")}
                        </th>
                        <th className="w-28 px-2 py-2.5 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
                          {t("shop.price")}
                        </th>
                        <th className="w-32 px-2 py-2.5 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
                          {t("admin.status")}
                        </th>
                        <th className="w-10 px-2 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {templates.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-8 text-center text-sub"
                          >
                            {categories.length === 0
                              ? t("admin.noCategoriesYet")
                              : t("shop.templatesEmpty")}
                          </td>
                        </tr>
                      )}
                      {templates.map((tpl, i) => (
                        <SortableItem
                          key={tpl.id}
                          id={tpl.id}
                          as="tr"
                          // opacity-only stagger: a transform animation would
                          // override dnd-kit's inline transform while dragging
                          style={{ "--stagger-i": i } as React.CSSProperties}
                          className="animate-stagger-in transition-colors hover:bg-surface-2/40"
                        >
                          {({ handleProps }) => (
                            <>
                              <td className="px-2 py-2">
                                <DragHandle
                                  label={t("dailies.dragToReorder")}
                                  {...handleProps}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Input
                                  defaultValue={tpl.name}
                                  maxLength={MAX_NAME_LENGTH}
                                  aria-label={t("shop.itemName")}
                                  className="h-8 border-transparent bg-transparent px-2 hover:border-line focus-visible:border-line"
                                  onBlur={(e) => {
                                    const name = e.target.value.trim();
                                    if (name && name !== tpl.name) {
                                      updateTemplate(tpl.id, { name });
                                    } else {
                                      e.target.value = tpl.name;
                                    }
                                  }}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Select
                                  value={tpl.categoryId}
                                  onValueChange={(categoryId) =>
                                    updateTemplate(tpl.id, { categoryId })
                                  }
                                >
                                  <SelectTrigger
                                    aria-label={t("shop.category")}
                                    className="h-8 w-full"
                                  >
                                    <SelectValue>
                                      {categoryName(tpl.categoryId)}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map((category) => (
                                      <SelectItem
                                        key={category.id}
                                        value={category.id}
                                      >
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-2 py-2">
                                <StockCell
                                  value={tpl.stock}
                                  onCommit={(stock) =>
                                    updateTemplate(tpl.id, { stock })
                                  }
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={MAX_PRICE}
                                  key={tpl.price}
                                  defaultValue={tpl.price}
                                  aria-label={t("shop.price")}
                                  className="h-8 w-full min-w-0 font-mono tabular-nums text-gold"
                                  onBlur={(e) => {
                                    const next = clampPrice(
                                      Number(e.target.value),
                                    );
                                    e.target.value = String(next);
                                    if (next !== tpl.price) {
                                      updateTemplate(tpl.id, { price: next });
                                    }
                                  }}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Button
                                  variant={tpl.published ? "default" : "outline"}
                                  size="sm"
                                  disabled={status === "busy"}
                                  onClick={() =>
                                    updateTemplate(tpl.id, {
                                      published: !tpl.published,
                                    })
                                  }
                                >
                                  {tpl.published ? (
                                    <Eye className="size-3.5" />
                                  ) : (
                                    <EyeOff className="size-3.5" />
                                  )}
                                  {t(
                                    tpl.published
                                      ? "admin.published"
                                      : "admin.draft",
                                  )}
                                </Button>
                              </td>
                              <td className="px-2 py-2">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={status === "busy"}
                                  aria-label={t("shop.deleteItem")}
                                  className="text-danger hover:text-danger"
                                  onClick={() =>
                                    setConfirmDelete({
                                      kind: "template",
                                      row: tpl,
                                    })
                                  }
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </td>
                            </>
                          )}
                        </SortableItem>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SortableList>
            </section>

            {/* categories — created first, items bind to one */}
            <section className="overflow-hidden rounded-xl border border-line bg-surface">
                <header className="flex items-center gap-2 border-b border-line px-4 py-3">
                  <FolderCog className="size-4 text-sub" />
                  <h3 className="text-sm font-bold">{t("shop.categories")}</h3>
                </header>
                <div className="p-3">
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void createCategory();
                    }}
                  >
                    <Input
                      value={newCategoryName}
                      maxLength={MAX_NAME_LENGTH}
                      placeholder={t("shop.categoryName")}
                      aria-label={t("shop.categoryName")}
                      className="h-8 min-w-0 flex-1"
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={status === "busy" || !newCategoryName.trim()}
                    >
                      <Plus className="size-3.5" />
                      {t("shop.addCategory")}
                    </Button>
                  </form>
                  {categories.length === 0 ? (
                    <p className="pt-3 text-sm text-sub">
                      {t("admin.noCategoriesYet")}
                    </p>
                  ) : (
                    <ul className="mt-1 divide-y divide-line/60">
                      <SortableList
                        ids={categories.map((c) => c.id)}
                        onReorder={(nextIds) => void reorderCategories(nextIds)}
                      >
                        {categories.map((category) => (
                          <SortableItem
                            key={category.id}
                            id={category.id}
                            className="flex items-center gap-2 py-1.5"
                          >
                            {({ handleProps }) => (
                              <>
                                <DragHandle
                                  label={t("dailies.dragToReorder")}
                                  {...handleProps}
                                />
                                <Input
                                  defaultValue={category.name}
                                  maxLength={MAX_NAME_LENGTH}
                                  aria-label={t("shop.categoryName")}
                                  className="h-8 min-w-0 flex-1 border-transparent bg-transparent px-2 hover:border-line focus-visible:border-line"
                                  onBlur={(e) => {
                                    const name = e.target.value.trim();
                                    if (name && name !== category.name) {
                                      updateCategory(category.id, { name });
                                    } else {
                                      e.target.value = category.name;
                                    }
                                  }}
                                />
                                <span className="font-mono text-xs text-sub tabular-nums">
                                  ×{templateCount(category.id)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={status === "busy"}
                                  aria-label={t("shop.deleteCategory")}
                                  className="text-danger hover:text-danger"
                                  onClick={() =>
                                    setConfirmDelete({
                                      kind: "category",
                                      row: category,
                                    })
                                  }
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </>
                            )}
                          </SortableItem>
                        ))}
                      </SortableList>
                    </ul>
                  )}
                </div>
              </section>

          </div>

          {/* live preview — full width at the bottom, the same grid the player
              page renders. Cards drag here too, so the shop can be arranged
              while looking at it rather than by reading the table. */}
          <section className="overflow-hidden rounded-xl border border-line bg-surface">
            <header className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Eye className="size-4 text-accent" />
              <div>
                <h3 className="text-sm font-bold">{t("admin.preview")}</h3>
                <p className="text-xs text-sub">{t("admin.previewHint")}</p>
              </div>
            </header>
            <div className="space-y-3 p-4">
              {previewCategories.length === 0 || !activePreviewId ? (
                <p className="py-2 text-center text-sm text-sub">
                  {t("shop.templatesEmpty")}
                </p>
              ) : (
                <>
                  <CategoryTabs
                    categories={previewCategories}
                    activeId={activePreviewId}
                    onSelect={setPreviewTab}
                  />
                  <SortableList
                    layout="grid"
                    ids={previewItems.map((tpl) => tpl.id)}
                    onReorder={(nextIds) => void reorderPreview(nextIds)}
                  >
                    <ShopCardGrid>
                      {previewItems.map((tpl) => (
                        <SortableItem key={tpl.id} id={tpl.id} as="div">
                          {({ handleProps, isDragging }) => (
                            <div
                              {...handleProps}
                              title={t("dailies.dragToReorder")}
                              className={`touch-none ${
                                isDragging ? "cursor-grabbing" : "cursor-grab"
                              }`}
                            >
                              <ShopItemCard
                                item={{
                                  id: tpl.id,
                                  name: tpl.name,
                                  stock: tpl.stock ?? undefined,
                                  price: tpl.price,
                                }}
                                dimmed={!tpl.published}
                                badge={
                                  !tpl.published ? (
                                    <span className="absolute top-1 right-1 rounded-md border border-line bg-surface px-1.5 py-px font-mono text-[9px] font-bold tracking-wider text-sub uppercase">
                                      {t("admin.draft")}
                                    </span>
                                  ) : undefined
                                }
                              />
                            </div>
                          )}
                        </SortableItem>
                      ))}
                    </ShopCardGrid>
                  </SortableList>
                </>
              )}
            </div>
          </section>
        </>
      )}

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDelete?.row.name}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                confirmDelete?.kind === "category"
                  ? "admin.deleteCategoryConfirm"
                  : "admin.deleteConfirm",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete?.kind === "template") {
                  removeTemplate(confirmDelete.row.id);
                } else if (confirmDelete?.kind === "category") {
                  removeCategory(confirmDelete.row.id);
                }
                setConfirmDelete(null);
              }}
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
