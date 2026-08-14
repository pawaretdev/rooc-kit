"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  addShopCategory,
  deleteShopCategory,
  updateShopCategory,
  type ShopCategoryRecord,
  type ShopItemRecord,
} from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const MAX_NAME_LENGTH = 100;

/** Category names seen in-game — offered on first run, freely editable after. */
export const STARTER_CATEGORIES = ["Growth", "Kafra Shop"];

/** Category management: rename inline, add, delete cascades (with confirm). */
export function CategoriesDialog({
  open,
  onClose,
  categories,
  items,
}: {
  open: boolean;
  onClose: () => void;
  categories: ShopCategoryRecord[];
  items: ShopItemRecord[];
}) {
  const t = useT();
  const [newCategory, setNewCategory] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    void addShopCategory(name);
    setNewCategory("");
  };

  const itemCount = (categoryId: string) =>
    items.filter((item) => item.categoryId === categoryId).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("shop.manageCategories")}</DialogTitle>
        </DialogHeader>

        {categories.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-4 text-center">
            <p className="mb-3 text-sm text-sub">{t("shop.emptyCatalog")}</p>
            <Button
              size="sm"
              onClick={() => {
                void (async () => {
                  for (const name of STARTER_CATEGORIES) {
                    await addShopCategory(name);
                  }
                })();
              }}
            >
              <Plus className="size-3.5" />
              {t("shop.starterCategories")}
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-line/60">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-2 py-2">
                <Input
                  defaultValue={category.name}
                  maxLength={MAX_NAME_LENGTH}
                  aria-label={t("shop.categoryName")}
                  className="h-8 min-w-0 flex-1"
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name && name !== category.name) {
                      void updateShopCategory(category.id, { name });
                    } else {
                      e.target.value = category.name;
                    }
                  }}
                />
                <span className="font-mono text-xs text-sub tabular-nums">
                  ×{itemCount(category.id)}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("shop.deleteCategory")}
                  className="text-danger hover:text-danger"
                  onClick={() => setConfirmDeleteId(category.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="flex items-center gap-2 border-t border-line pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            addCategory();
          }}
        >
          <Input
            value={newCategory}
            maxLength={MAX_NAME_LENGTH}
            placeholder={t("shop.categoryName")}
            aria-label={t("shop.categoryName")}
            className="h-8 min-w-0 flex-1"
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={!newCategory.trim()}>
            <Plus className="size-3.5" />
            {t("shop.addCategory")}
          </Button>
        </form>

        <AlertDialog
          open={confirmDeleteId !== null}
          onOpenChange={(o) => {
            if (!o) setConfirmDeleteId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("shop.deleteCategory")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("shop.deleteCategoryConfirm").replace(
                  "{n}",
                  String(confirmDeleteId ? itemCount(confirmDeleteId) : 0),
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDeleteId) void deleteShopCategory(confirmDeleteId);
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
