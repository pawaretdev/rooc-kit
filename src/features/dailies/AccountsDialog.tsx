"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  addGameAccount,
  deleteGameAccount,
  renameGameAccount,
  type GameAccountRecord,
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

/** Accounts-only management modal: rename inline, add, delete with confirm. */
export function AccountsDialog({
  open,
  onClose,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  accounts: GameAccountRecord[];
}) {
  const t = useT();
  const [newAccount, setNewAccount] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const addAccount = () => {
    const name = newAccount.trim();
    if (!name) return;
    void addGameAccount(name);
    setNewAccount("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-md"
        // Radix focuses the first focusable on open — that's the first rename
        // input here, which reads as "editing" when the user only opened the list
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("dailies.manageAccounts")}</DialogTitle>
        </DialogHeader>

        <ul className="divide-y divide-line/60">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center gap-2 py-2">
              <Input
                defaultValue={account.name}
                maxLength={MAX_NAME_LENGTH}
                aria-label={t("dailies.accountName")}
                className="h-8 min-w-0 flex-1"
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== account.name) {
                    void renameGameAccount(account.id, name);
                  } else {
                    e.target.value = account.name;
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("dailies.deleteAccount")}
                className="text-danger hover:text-danger"
                onClick={() => setConfirmDeleteId(account.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="flex items-center gap-2 border-t border-line pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            addAccount();
          }}
        >
          <Input
            value={newAccount}
            maxLength={MAX_NAME_LENGTH}
            placeholder={t("dailies.accountName")}
            aria-label={t("dailies.accountName")}
            className="h-8 min-w-0 flex-1"
            onChange={(e) => setNewAccount(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={!newAccount.trim()}>
            <Plus className="size-3.5" />
            {t("dailies.add")}
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
              <AlertDialogTitle>{t("dailies.deleteAccount")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("dailies.deleteAccountConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDeleteId) void deleteGameAccount(confirmDeleteId);
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
