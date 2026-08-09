"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { DiscordMark, GoogleMark } from "./icons";

type Provider = "discord" | "google";

/** The Discord / Google buttons shared by the sign-in dialog and the auth gate. */
export function ProviderSignInButtons() {
  const t = useT();
  const [pending, setPending] = useState<Provider | null>(null);
  const [failed, setFailed] = useState(false);

  async function start(provider: Provider) {
    setFailed(false);
    setPending(provider);
    try {
      await signIn(provider);
    } catch {
      setFailed(true);
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="lg"
        className="press rounded-lg"
        disabled={pending !== null}
        onClick={() => start("discord")}
      >
        <DiscordMark />
        {pending === "discord"
          ? t("common.loading")
          : t("auth.signInWith.discord")}
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="press rounded-lg"
        disabled={pending !== null}
        onClick={() => start("google")}
      >
        <GoogleMark />
        {pending === "google"
          ? t("common.loading")
          : t("auth.signInWith.google")}
      </Button>
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {t("auth.error")}
        </p>
      )}
    </div>
  );
}
