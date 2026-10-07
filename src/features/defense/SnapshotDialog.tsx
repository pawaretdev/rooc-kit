"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MAX_NAME_LENGTH, MAX_NOTE_LENGTH } from "./history";

/** Name + note for a new snapshot, or for renaming an existing one. */
export function SnapshotDialog({
  open,
  mode,
  initialName,
  initialNote,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "save" | "edit";
  initialName: string;
  initialNote: string;
  onClose: () => void;
  onSubmit: (name: string, note: string) => Promise<void>;
}) {
  const t = useT();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(mode === "save" ? "def.save.title" : "def.edit.title")}</DialogTitle>
          <DialogDescription>
            {t(mode === "save" ? "def.save.hint" : "def.edit.hint")}
          </DialogDescription>
        </DialogHeader>
        {/* remounted per open so it always starts from the given values */}
        {open && (
          <SnapshotForm
            initialName={initialName}
            initialNote={initialNote}
            submitLabel={t(mode === "save" ? "def.save.submit" : "common.save")}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SnapshotForm({
  initialName,
  initialNote,
  submitLabel,
  onClose,
  onSubmit,
}: {
  initialName: string;
  initialNote: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (name: string, note: string) => Promise<void>;
}) {
  const t = useT();
  const [name, setName] = useState(initialName);
  const [note, setNote] = useState(initialNote);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const trimmed = name.trim();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed || pending) return;
        setPending(true);
        setFailed(false);
        onSubmit(trimmed, note.trim())
          .then(onClose)
          .catch(() => setFailed(true))
          .finally(() => setPending(false));
      }}
    >
      <label className="block space-y-1">
        <span className="text-xs font-medium">{t("def.save.name")}</span>
        <Input
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium">{t("def.save.note")}</span>
        <textarea
          value={note}
          maxLength={MAX_NOTE_LENGTH}
          rows={3}
          placeholder={t("def.save.notePlaceholder")}
          onChange={(e) => setNote(e.target.value)}
          className="w-full resize-y rounded-md border border-line bg-transparent px-3 py-2 text-sm outline-none placeholder:text-sub/70 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 dark:bg-input/30"
          data-slot="textarea"
        />
      </label>
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {t("def.save.failed")}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" className="rounded-lg" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" className="rounded-lg" disabled={!trimmed || pending}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
