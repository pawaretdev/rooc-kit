"use client";

import { useT } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GoldCalendar, type GoldCalendarProps } from "./GoldCalendar";

/** The gold calendar behind the "History" button on /dailies. */
export function GoldCalendarDialog({
  open,
  onClose,
  ...calendar
}: {
  open: boolean;
  onClose: () => void;
} & GoldCalendarProps) {
  const t = useT();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("gold.calendarTitle")}</DialogTitle>
          <DialogDescription>{t("gold.calendarHint")}</DialogDescription>
        </DialogHeader>
        {/* the content unmounts with the dialog, so every opening starts
            fresh: the page's ID, this month, nothing selected */}
        <GoldCalendar {...calendar} />
      </DialogContent>
    </Dialog>
  );
}
