"use client";

import { useState } from "react";
import { FolderCog, Plus, Trash2 } from "lucide-react";
import {
  addShopItem,
  clearShopItemStock,
  deleteShopItem,
  updateShopItem,
  type ShopCategoryRecord,
  type ShopItemRecord,
} from "@/lib/local-db";
import { useT } from "@/lib/i18n";
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
import { ShopTemplateBrowser } from "./ShopTemplateBrowser";

const MAX_NAME_LENGTH = 100;
const MAX_PRICE = 9_999_999;
/** in-game weekly limits reach the thousands (Mora Coin: 5,000) */
const MAX_STOCK = 99_999;

/**
 * One column template for the header, the create row, and every item row, so
 * the fields line up instead of drifting per row. Mobile falls back to wrapping
 * flex — the columns don't fit a phone.
 */
const ROW_GRID =
  "flex flex-wrap items-center gap-2 sm:grid sm:grid-cols-[auto_minmax(0,1fr)_9rem_6.5rem_7rem_6rem_auto]";

function clampInt(value: number, max: number): number {
  return Math.max(1, Math.min(max, Math.floor(value)));
}

/** Catalog editor: add items, inline-edit, reorder, delete — plus suggestions. */
export function CatalogDialog({
  open,
  onClose,
  categories,
  items,
  onManageCategories,
}: {
  open: boolean;
  onClose: () => void;
  categories: ShopCategoryRecord[];
  items: ShopItemRecord[];
  onManageCategories: () => void;
}) {
  const t = useT();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Optimistic order isn't needed — Dexie liveQuery re-emits fast enough, and
  // persistOrder writes the dropped sequence onto the rows' existing slots.
  const persistOrder = (nextIds: string[]) => {
    const slots = items.map((item) => item.sortOrder).sort((a, b) => a - b);
    void Promise.all(
      nextIds.map((id, index) => {
        const item = items.find((i) => i.id === id);
        return item && item.sortOrder !== slots[index]
          ? updateShopItem(id, { sortOrder: slots[index] })
          : Promise.resolve();
      }),
    );
  };

  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-4xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("shop.catalog")}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={onManageCategories}
            >
              <FolderCog className="size-3.5" />
              {t("shop.manageCategories")}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <AddItemForm categories={categories} onManageCategories={onManageCategories} />

        {items.length > 0 && (
          <>
            {/* column headers — the inputs carry no visible labels of their own */}
            <div
              className={`${ROW_GRID} hidden px-1 font-mono text-[10px] font-bold tracking-wider text-sub uppercase sm:grid`}
            >
              <span />
              <span>{t("shop.itemName")}</span>
              <span>{t("shop.category")}</span>
              <span>{t("shop.price")}</span>
              <span />
              <span>{t("shop.stock")}</span>
              <span />
            </div>
            <ul className="divide-y divide-line/60">
              <SortableList ids={items.map((i) => i.id)} onReorder={persistOrder}>
                {items.map((item) => {
                  const unlimited = item.stock === undefined;
                  return (
                    <SortableItem
                      key={item.id}
                      id={item.id}
                      className={`${ROW_GRID} py-2`}
                    >
                      {({ handleProps }) => (
                        <>
                          <DragHandle
                            label={t("dailies.dragToReorder")}
                            {...handleProps}
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
                              <SelectValue>
                                {categoryName(item.categoryId)}
                              </SelectValue>
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
                              if (
                                Number.isFinite(price) &&
                                price >= 0 &&
                                price !== item.price
                              ) {
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
                            <Label
                              htmlFor={`unlimited-${item.id}`}
                              className="text-xs text-sub"
                            >
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
                              if (
                                Number.isFinite(stock) &&
                                stock >= 1 &&
                                stock !== item.stock
                              ) {
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
                            onClick={() => setConfirmDeleteId(item.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </SortableItem>
                  );
                })}
              </SortableList>
            </ul>
          </>
        )}

        <ShopTemplateBrowser />

        <AlertDialog
          open={confirmDeleteId !== null}
          onOpenChange={(o) => {
            if (!o) setConfirmDeleteId(null);
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
                  if (confirmDeleteId) void deleteShopItem(confirmDeleteId);
                  setConfirmDeleteId(null);
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

function AddItemForm({
  categories,
  onManageCategories,
}: {
  categories: ShopCategoryRecord[];
  onManageCategories: () => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [unlimited, setUnlimited] = useState(false);
  const [stock, setStock] = useState("1");

  const chosenCategory = categories.find((c) => c.id === categoryId);
  const parsedPrice = Math.floor(Number(price));
  const parsedStock = Math.floor(Number(stock));
  const valid =
    name.trim().length > 0 &&
    chosenCategory !== undefined &&
    Number.isFinite(parsedPrice) &&
    parsedPrice >= 0 &&
    (unlimited || (Number.isFinite(parsedStock) && parsedStock >= 1));

  const create = () => {
    if (!valid || !chosenCategory) return;
    void addShopItem({
      name: name.trim(),
      categoryId: chosenCategory.id,
      price: Math.min(parsedPrice, MAX_PRICE),
      ...(unlimited ? {} : { stock: clampInt(parsedStock, MAX_STOCK) }),
    });
    setName("");
    setPrice("");
  };

  // No categories yet — the item form can't do anything useful; route to setup.
  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-4 text-center">
        <p className="mb-3 text-sm text-sub">{t("shop.emptyCatalog")}</p>
        <Button size="sm" onClick={onManageCategories}>
          <FolderCog className="size-3.5" />
          {t("shop.manageCategories")}
        </Button>
      </div>
    );
  }

  return (
    <form
      className={`${ROW_GRID} rounded-xl border border-line bg-surface-2/40 p-3`}
      onSubmit={(e) => {
        e.preventDefault();
        create();
      }}
    >
      {/* spacer keeping the create row on the same columns as the item rows */}
      <span className="hidden sm:block sm:w-8" />
      <Input
        value={name}
        maxLength={MAX_NAME_LENGTH}
        placeholder={t("shop.itemName")}
        aria-label={t("shop.itemName")}
        className="h-8 min-w-0 flex-1"
        onChange={(e) => setName(e.target.value)}
      />
      <Select value={categoryId} onValueChange={setCategoryId}>
        <SelectTrigger
          aria-label={t("shop.category")}
          className="h-8 w-32 sm:w-full"
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
