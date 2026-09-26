"use client";

import { useState } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  addShopCategory,
  addShopItem,
  clearShopItemStock,
  deleteShopCategory,
  deleteShopItem,
  setShopItemFrame,
  setShopItemIcon,
  updateShopCategory,
  updateShopItem,
  type ShopCategoryRecord,
  type ShopItemRecord,
} from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import {
  isEventEndingSoon,
  isWithinEventWindow,
} from "@/features/dailies/period";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { DragHandle, SortableItem, SortableList } from "@/components/SortableList";
import { ItemFramePicker, ItemIconPicker } from "./ItemIcon";
import { ShopTemplateBrowser } from "./ShopTemplateBrowser";
import {
  groupItemsByCategory,
  moveCategory,
  reorderWithinGroup,
} from "./catalog-groups";

const MAX_NAME_LENGTH = 100;
const MAX_PRICE = 9_999_999;
/** in-game weekly limits reach the thousands (Mora Coin: 5,000) */
const MAX_STOCK = 99_999;

/** Category names seen in-game — offered on first run, freely editable after. */
export const STARTER_CATEGORIES = ["Growth", "Kafra Shop"];

/** Tab id for items whose category no longer exists — shown only while any exist. */
const ORPHANS_TAB = "__orphans__";

/**
 * One column template for the header and every item row, so the fields line
 * up instead of drifting per row. The leading column holds the drag handle;
 * the category column is how an item moves to another shelf. Mobile falls
 * back to wrapping flex — the columns don't fit a phone.
 */
const ROW_GRID =
  "flex flex-wrap items-center gap-2 sm:grid sm:grid-cols-[auto_auto_auto_minmax(0,1fr)_9rem_6.5rem_7rem_6rem_auto]";

/**
 * The create row belongs to the open category, so it has neither a drag
 * handle nor a category column. Kept as a full literal (not derived from
 * ROW_GRID) because Tailwind only picks up classes it can read verbatim.
 */
const CREATE_ROW_GRID =
  "flex flex-wrap items-center gap-2 sm:grid sm:grid-cols-[auto_auto_minmax(0,1fr)_6.5rem_7rem_6rem_auto]";

function clampInt(value: number, max: number): number {
  return Math.max(1, Math.min(max, Math.floor(value)));
}

/**
 * The shop editor, laid out like the shop itself: a category strip on top and
 * the open category's items below, so a new item lands where you're looking
 * and the category's own settings (name, order, sale end) sit right above its
 * rows — no second dialog. A category past its sale end stays here, struck
 * through, so it can be extended or deleted; the planner stops showing it.
 */
export function CatalogDialog({
  open,
  onClose,
  categories,
  items,
  initialCategoryId,
}: {
  open: boolean;
  onClose: () => void;
  categories: ShopCategoryRecord[];
  items: ShopItemRecord[];
  /** the category the planner was showing — the editor opens on the same shelf */
  initialCategoryId?: string;
}) {
  const t = useT();
  // A tab chosen inside the dialog. Cleared on close, so reopening lands on
  // whatever the planner is showing rather than on last time's shelf.
  const [tabOverride, setTabOverride] = useState<string | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<string | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<
    string | null
  >(null);

  const groups = groupItemsByCategory(categories, items);
  const orphans = groups.find((g) => g.category === null)?.items ?? [];
  const wanted = tabOverride ?? initialCategoryId;
  const activeId =
    wanted === ORPHANS_TAB && orphans.length > 0
      ? ORPHANS_TAB
      : (categories.find((c) => c.id === wanted)?.id ??
        categories[0]?.id ??
        (orphans.length > 0 ? ORPHANS_TAB : null));
  const activeCategory = categories.find((c) => c.id === activeId) ?? null;
  const activeItems =
    activeId === ORPHANS_TAB
      ? orphans
      : (groups.find((g) => g.category?.id === activeId)?.items ?? []);
  const itemCount = (categoryId: string) =>
    groups.find((g) => g.category?.id === categoryId)?.items.length ?? 0;

  // Optimistic order isn't needed — Dexie liveQuery re-emits fast enough, and
  // the patches only touch slots the dropped group already owns.
  const persistOrder = (groupItems: ShopItemRecord[], nextIds: string[]) => {
    void Promise.all(
      reorderWithinGroup(groupItems, nextIds).map(({ id, sortOrder }) =>
        updateShopItem(id, { sortOrder }),
      ),
    );
  };
  const shiftCategory = (id: string, delta: -1 | 1) => {
    void Promise.all(
      moveCategory(categories, id, delta).map(({ id, sortOrder }) =>
        updateShopCategory(id, { sortOrder }),
      ),
    );
  };

  const close = () => {
    setTabOverride(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-4xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("shop.editShop")}</DialogTitle>
        </DialogHeader>

        {categories.length === 0 ? (
          <EmptyCatalog onCreated={setTabOverride} />
        ) : (
          <>
            <CategoryStrip
              categories={categories}
              activeId={activeId}
              orphanCount={orphans.length}
              onSelect={setTabOverride}
              onCreated={setTabOverride}
            />
            {activeCategory ? (
              <CategoryPanel
                category={activeCategory}
                position={categories.findIndex((c) => c.id === activeCategory.id)}
                count={categories.length}
                items={activeItems}
                categories={categories}
                onMove={(delta) => shiftCategory(activeCategory.id, delta)}
                onDelete={() => setConfirmDeleteCategory(activeCategory.id)}
                onDeleteItem={setConfirmDeleteItem}
                onReorder={(nextIds) => persistOrder(activeItems, nextIds)}
              />
            ) : activeId === ORPHANS_TAB ? (
              <section
                aria-label={t("shop.noCategory")}
                className="space-y-3 rounded-xl border border-dashed border-line p-3"
              >
                <p className="text-xs text-sub">{t("shop.orphanItemsHint")}</p>
                <ItemsTable
                  items={orphans}
                  categories={categories}
                  onDeleteItem={setConfirmDeleteItem}
                  onReorder={(nextIds) => persistOrder(orphans, nextIds)}
                />
              </section>
            ) : null}
          </>
        )}

        <ShopTemplateBrowser />

        <AlertDialog
          open={confirmDeleteItem !== null}
          onOpenChange={(o) => {
            if (!o) setConfirmDeleteItem(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("shop.deleteItem")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("shop.deleteItemConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDeleteItem) void deleteShopItem(confirmDeleteItem);
                  setConfirmDeleteItem(null);
                }}
              >
                {t("common.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={confirmDeleteCategory !== null}
          onOpenChange={(o) => {
            if (!o) setConfirmDeleteCategory(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("shop.deleteCategory")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("shop.deleteCategoryConfirm").replace(
                  "{n}",
                  String(confirmDeleteCategory ? itemCount(confirmDeleteCategory) : 0),
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDeleteCategory) {
                    void deleteShopCategory(confirmDeleteCategory);
                  }
                  setConfirmDeleteCategory(null);
                }}
              >
                {t("common.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

/** No categories yet: offer the in-game starters, or a name of your own. */
function EmptyCatalog({ onCreated }: { onCreated: (id: string) => void }) {
  const t = useT();
  return (
    <div className="rounded-xl border border-line bg-surface p-4 text-center">
      <p className="mb-3 text-sm text-sub">{t("shop.emptyCatalog")}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            void (async () => {
              let first: string | undefined;
              for (const name of STARTER_CATEGORIES) {
                const id = await addShopCategory(name);
                first ??= id;
              }
              if (first) onCreated(first);
            })();
          }}
        >
          <Plus className="size-3.5" />
          {t("shop.starterCategories")}
        </Button>
        <AddCategoryControl onCreated={onCreated} />
      </div>
    </div>
  );
}

/**
 * The shelf switcher, styled like the planner's own CategoryTabs so the editor
 * reads as the same shop. A limited-time category carries a clock; one past
 * its end is struck through; one on its last day gets the dailies' pulsing dot.
 */
function CategoryStrip({
  categories,
  activeId,
  orphanCount,
  onSelect,
  onCreated,
}: {
  categories: ShopCategoryRecord[];
  activeId: string | null;
  orphanCount: number;
  onSelect: (id: string) => void;
  onCreated: (id: string) => void;
}) {
  const t = useT();
  const tabClass = (active: boolean) =>
    `press flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm ${
      active
        ? "bg-accent font-semibold text-accent-ink"
        : "text-sub hover:bg-surface-2 hover:text-ink"
    }`;
  return (
    <div
      role="group"
      aria-label={t("shop.categories")}
      className="flex flex-wrap items-center gap-1.5"
    >
      {categories.map((category) => {
        const active = category.id === activeId;
        const onSale = isWithinEventWindow({ eventEnd: category.eventEnd });
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(category.id)}
            className={`${tabClass(active)} ${onSale ? "" : "line-through opacity-60"}`}
          >
            {category.name}
            {category.eventEnd && onSale && (
              <CalendarClock className="size-3 shrink-0 opacity-80" aria-hidden />
            )}
            {isEventEndingSoon(category.eventEnd) && (
              <span
                aria-label={t("shop.categoryEndsToday")}
                title={t("shop.categoryEndsToday")}
                className="size-1.5 shrink-0 animate-pulse rounded-full bg-danger"
              />
            )}
          </button>
        );
      })}
      {orphanCount > 0 && (
        <button
          type="button"
          aria-pressed={activeId === ORPHANS_TAB}
          onClick={() => onSelect(ORPHANS_TAB)}
          className={`${tabClass(activeId === ORPHANS_TAB)} italic`}
        >
          {t("shop.noCategory")}
          <span className="font-mono text-xs not-italic tabular-nums">
            ×{orphanCount}
          </span>
        </button>
      )}
      <span className="ml-auto">
        <AddCategoryControl onCreated={onCreated} />
      </span>
    </div>
  );
}

/** "+ Add category" that unfolds into a name box; Enter creates and opens it. */
function AddCategoryControl({ onCreated }: { onCreated: (id: string) => void }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  const reset = () => {
    setName("");
    setEditing(false);
  };

  if (!editing) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="rounded-lg"
        onClick={() => setEditing(true)}
      >
        <Plus className="size-3.5" />
        {t("shop.addCategory")}
      </Button>
    );
  }
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        void addShopCategory(trimmed).then(onCreated);
        reset();
      }}
    >
      <Input
        autoFocus
        value={name}
        maxLength={MAX_NAME_LENGTH}
        placeholder={t("shop.categoryName")}
        aria-label={t("shop.categoryName")}
        className="h-8 w-40"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") reset();
        }}
      />
      <Button
        type="submit"
        size="icon-sm"
        aria-label={t("shop.addCategory")}
        disabled={!name.trim()}
      >
        <Plus className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("common.cancel")}
        onClick={reset}
      >
        <X className="size-3.5" />
      </Button>
    </form>
  );
}

/**
 * Everything about one shelf: its settings row (rename, sale end, position,
 * delete), the add form bound to it, and its rows.
 */
function CategoryPanel({
  category,
  position,
  count,
  items,
  categories,
  onMove,
  onDelete,
  onDeleteItem,
  onReorder,
}: {
  category: ShopCategoryRecord;
  position: number;
  count: number;
  items: ShopItemRecord[];
  categories: ShopCategoryRecord[];
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
  onDeleteItem: (id: string) => void;
  onReorder: (nextIds: string[]) => void;
}) {
  const t = useT();
  const onSale = isWithinEventWindow({ eventEnd: category.eventEnd });
  const lastDay = isEventEndingSoon(category.eventEnd);
  const setEnd = (eventEnd: string | undefined) =>
    void updateShopCategory(category.id, { eventEnd });

  return (
    <section
      aria-label={category.name}
      className="space-y-3 rounded-xl border border-line bg-surface-2/40 p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          defaultValue={category.name}
          key={`name:${category.id}:${category.name}`}
          maxLength={MAX_NAME_LENGTH}
          aria-label={t("shop.categoryName")}
          className="h-8 min-w-0 flex-1 basis-40 font-semibold"
          onBlur={(e) => {
            const name = e.target.value.trim();
            if (name && name !== category.name) {
              void updateShopCategory(category.id, { name });
            } else {
              e.target.value = category.name;
            }
          }}
        />
        <label className="flex items-center gap-1.5 text-xs text-sub">
          <CalendarClock className="size-3.5 shrink-0" />
          {t("shop.sellsUntil")}
          <Input
            type="datetime-local"
            defaultValue={category.eventEnd ?? ""}
            key={`end:${category.id}:${category.eventEnd ?? ""}`}
            aria-label={t("shop.sellsUntil")}
            className="h-8 w-44"
            // a datetime-local value is either complete or "", so a picked
            // value saves at once; clearing commits on blur so a half-edited
            // field doesn't wipe the date mid-keystroke
            onChange={(e) => {
              if (e.target.value && e.target.value !== category.eventEnd) {
                setEnd(e.target.value);
              }
            }}
            onBlur={(e) => {
              if (!e.target.value && category.eventEnd) setEnd(undefined);
            }}
          />
        </label>
        {category.eventEnd && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("shop.clearEndDate")}
            title={t("shop.clearEndDate")}
            onClick={() => setEnd(undefined)}
          >
            <X className="size-3.5" />
          </Button>
        )}
        <span className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-lg"
            aria-label={t("shop.moveCategoryLeft")}
            title={t("shop.moveCategoryLeft")}
            disabled={position <= 0}
            onClick={() => onMove(-1)}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-lg"
            aria-label={t("shop.moveCategoryRight")}
            title={t("shop.moveCategoryRight")}
            disabled={position >= count - 1}
            onClick={() => onMove(1)}
          >
            <ChevronRight className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("shop.deleteCategory")}
            title={t("shop.deleteCategory")}
            className="text-danger hover:text-danger"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </span>
      </div>
      {category.eventEnd && (
        <p className="flex items-center gap-1.5 text-xs text-sub">
          {lastDay && (
            <span
              aria-hidden
              className="size-1.5 shrink-0 animate-pulse rounded-full bg-danger"
            />
          )}
          {!onSale
            ? t("shop.categoryEnded")
            : lastDay
              ? t("shop.categoryEndsToday")
              : t("shop.sellsUntilHint")}
        </p>
      )}

      <AddItemForm categoryId={category.id} />

      <ItemsTable
        items={items}
        categories={categories}
        onDeleteItem={onDeleteItem}
        onReorder={onReorder}
      />
    </section>
  );
}

/** Column header + one sortable list; the empty state stands in for both. */
function ItemsTable({
  items,
  categories,
  onDeleteItem,
  onReorder,
}: {
  items: ShopItemRecord[];
  categories: ShopCategoryRecord[];
  onDeleteItem: (id: string) => void;
  onReorder: (nextIds: string[]) => void;
}) {
  const t = useT();
  if (items.length === 0) {
    return (
      <p className="py-3 text-center text-sm text-sub">
        {t("shop.noCategoryItems")}
      </p>
    );
  }
  return (
    <div>
      {/* column headers — the inputs carry no visible labels of their own */}
      <div
        className={`${ROW_GRID} hidden px-1 font-mono text-[10px] font-bold tracking-wider text-sub uppercase sm:grid`}
      >
        <span />
        <span>{t("common.icon")}</span>
        <span>{t("common.frame")}</span>
        <span>{t("shop.itemName")}</span>
        <span>{t("shop.category")}</span>
        <span>{t("shop.price")}</span>
        <span />
        <span>{t("shop.stock")}</span>
        <span />
      </div>
      <ul className="divide-y divide-line/60">
        <SortableList ids={items.map((i) => i.id)} onReorder={onReorder}>
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              categories={categories}
              onDelete={() => onDeleteItem(item.id)}
            />
          ))}
        </SortableList>
      </ul>
    </div>
  );
}

/** One editable row; must sit inside its list's SortableList. */
function ItemRow({
  item,
  categories,
  onDelete,
}: {
  item: ShopItemRecord;
  categories: ShopCategoryRecord[];
  onDelete: () => void;
}) {
  const t = useT();
  const unlimited = item.stock === undefined;
  const categoryName =
    categories.find((c) => c.id === item.categoryId)?.name ?? "";

  return (
    <SortableItem id={item.id} className={`${ROW_GRID} py-2`}>
      {({ handleProps }) => (
        <>
          <DragHandle label={t("dailies.dragToReorder")} {...handleProps} />
          <ItemIconPicker
            value={item.icon}
            onChange={(icon) => void setShopItemIcon(item.id, icon)}
          />
          <ItemFramePicker
            value={item.frame}
            onChange={(frame) => void setShopItemFrame(item.id, frame)}
          />
          <Input
            defaultValue={item.name}
            key={`name:${item.name}`}
            maxLength={MAX_NAME_LENGTH}
            aria-label={t("shop.itemName")}
            className="h-8 min-w-0 flex-1"
            onBlur={(e) => {
              const name = e.target.value.trim();
              if (name && name !== item.name) {
                void updateShopItem(item.id, { name });
              } else {
                e.target.value = item.name;
              }
            }}
          />
          {/* changing this moves the item to another shelf */}
          <Select
            value={item.categoryId}
            onValueChange={(categoryId) =>
              void updateShopItem(item.id, { categoryId })
            }
          >
            <SelectTrigger
              aria-label={t("shop.category")}
              className="h-8 w-32 sm:w-full"
            >
              <SelectValue>{categoryName || t("shop.noCategory")}</SelectValue>
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
            defaultValue={String(item.price)}
            key={`price:${item.price}`}
            type="number"
            min={0}
            max={MAX_PRICE}
            inputMode="numeric"
            aria-label={t("shop.price")}
            className="h-8 w-24 font-mono tabular-nums sm:w-full"
            onBlur={(e) => {
              const price = Math.floor(Number(e.target.value));
              if (Number.isFinite(price) && price >= 0 && price !== item.price) {
                void updateShopItem(item.id, {
                  price: Math.min(price, MAX_PRICE),
                });
              } else {
                e.target.value = String(item.price);
              }
            }}
          />
          <span className="flex items-center gap-1.5">
            <Checkbox
              id={`unlimited-${item.id}`}
              checked={unlimited}
              onCheckedChange={(checked) => {
                if (checked === true) {
                  void clearShopItemStock(item.id);
                } else {
                  void updateShopItem(item.id, { stock: 1 });
                }
              }}
            />
            <Label htmlFor={`unlimited-${item.id}`} className="text-xs text-sub">
              {t("shop.unlimited")}
            </Label>
          </span>
          {/* always rendered so the stock column stays aligned */}
          <Input
            defaultValue={item.stock !== undefined ? String(item.stock) : ""}
            key={`stock:${item.stock ?? "unlimited"}`}
            type="number"
            min={1}
            max={MAX_STOCK}
            inputMode="numeric"
            disabled={unlimited}
            placeholder="∞"
            aria-label={t("shop.stock")}
            className="h-8 w-24 font-mono tabular-nums sm:w-full"
            onBlur={(e) => {
              const stock = Math.floor(Number(e.target.value));
              if (Number.isFinite(stock) && stock >= 1 && stock !== item.stock) {
                void updateShopItem(item.id, {
                  stock: clampInt(stock, MAX_STOCK),
                });
              } else {
                e.target.value =
                  item.stock !== undefined ? String(item.stock) : "";
              }
            }}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("shop.deleteItem")}
            className="text-danger hover:text-danger"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </>
      )}
    </SortableItem>
  );
}

/** Creates into the open category, so there's nothing to pick but the item itself. */
function AddItemForm({ categoryId }: { categoryId: string }) {
  const t = useT();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [frame, setFrame] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [unlimited, setUnlimited] = useState(false);
  const [stock, setStock] = useState("1");

  const parsedPrice = Math.floor(Number(price));
  const parsedStock = Math.floor(Number(stock));
  const valid =
    name.trim().length > 0 &&
    Number.isFinite(parsedPrice) &&
    parsedPrice >= 0 &&
    (unlimited || (Number.isFinite(parsedStock) && parsedStock >= 1));

  const create = () => {
    if (!valid) return;
    void addShopItem({
      name: name.trim(),
      categoryId,
      price: Math.min(parsedPrice, MAX_PRICE),
      ...(unlimited ? {} : { stock: clampInt(parsedStock, MAX_STOCK) }),
      ...(icon ? { icon } : {}),
      ...(frame ? { frame } : {}),
    });
    setName("");
    setIcon(null);
    setFrame(null);
    setPrice("");
  };

  return (
    <form
      className={`${CREATE_ROW_GRID} rounded-xl border border-line bg-surface p-3`}
      onSubmit={(e) => {
        e.preventDefault();
        create();
      }}
    >
      <ItemIconPicker value={icon} onChange={setIcon} />
      <ItemFramePicker value={frame} onChange={setFrame} />
      <Input
        value={name}
        maxLength={MAX_NAME_LENGTH}
        placeholder={t("shop.itemName")}
        aria-label={t("shop.itemName")}
        className="h-8 min-w-0 flex-1"
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        value={price}
        type="number"
        min={0}
        max={MAX_PRICE}
        inputMode="numeric"
        placeholder={t("shop.price")}
        aria-label={t("shop.price")}
        className="h-8 w-24 font-mono tabular-nums sm:w-full"
        onChange={(e) => setPrice(e.target.value)}
      />
      <span className="flex items-center gap-1.5">
        <Checkbox
          id="new-item-unlimited"
          checked={unlimited}
          onCheckedChange={(checked) => setUnlimited(checked === true)}
        />
        <Label htmlFor="new-item-unlimited" className="text-xs text-sub">
          {t("shop.unlimited")}
        </Label>
      </span>
      <Input
        value={unlimited ? "" : stock}
        type="number"
        min={1}
        max={MAX_STOCK}
        inputMode="numeric"
        disabled={unlimited}
        placeholder="∞"
        aria-label={t("shop.stock")}
        className="h-8 w-24 font-mono tabular-nums sm:w-full"
        onChange={(e) => setStock(e.target.value)}
      />
      <Button type="submit" size="sm" disabled={!valid}>
        <Plus className="size-3.5" />
        {t("shop.addItem")}
      </Button>
    </form>
  );
}
