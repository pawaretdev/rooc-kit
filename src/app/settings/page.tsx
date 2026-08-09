import { SettingsPage } from "@/features/settings/SettingsPage";

export const metadata = { title: "Settings — ROOC Kit" };

export default function Settings() {
  return (
    <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
      <SettingsPage />
    </main>
  );
}
