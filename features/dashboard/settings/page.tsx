"use client";

import { PageTitle } from "@/features/dashboard/primitives";
import { BrandingSettings } from "./branding-settings";
import { SettingsHeaderActions } from "./header-actions";
import { PaletteSettings } from "./palette-settings";
import { SettingsPreview } from "./settings-preview";
import { useSettingsPage } from "./use-settings-page";

export function SettingsPage() {
  const controller = useSettingsPage();

  return (
    <div className="px-6 py-6">
      <PageTitle
        actions={<SettingsHeaderActions controller={controller} />}
        description="تخصيص ألوان اللوحة وبيانات البراند الظاهرة في القائمة."
        title="الإعدادات"
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[360px_1fr]">
        <SettingsPreview controller={controller} />
        <div className="space-y-4">
          <PaletteSettings controller={controller} />
          <BrandingSettings controller={controller} />
        </div>
      </div>
    </div>
  );
}
