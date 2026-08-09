"use client";

import { useT } from "@/lib/i18n";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BlobMark } from "./icons";
import { LegalNotice } from "./LegalNotice";
import { ProviderSignInButtons } from "./ProviderSignInButtons";

export function SignInDialog() {
  const t = useT();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="press rounded-lg border border-line px-3 py-1 text-sm hover:bg-surface-2"
        >
          {t("auth.signIn")}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BlobMark size={20} className="text-accent" />
            {t("auth.dialog.title")}
          </DialogTitle>
          <DialogDescription>{t("auth.syncHint")}</DialogDescription>
        </DialogHeader>
        <ProviderSignInButtons />
        {/* links leave the page while the header-mounted dialog stays open — close it on click */}
        <LegalNotice
          wrapLink={(link, key) => (
            <DialogClose key={key} asChild>
              {link}
            </DialogClose>
          )}
        />
        <p className="text-xs text-sub">{t("auth.localNote")}</p>
      </DialogContent>
    </Dialog>
  );
}
