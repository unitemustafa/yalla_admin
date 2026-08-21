"use client";

import { Loader2, RotateCcw, Save } from "lucide-react";

import { Button } from "@/features/dashboard/primitives";
import type { SettingsPageController } from "./use-settings-page";

export function SettingsHeaderActions({
  controller,
}: {
  controller: SettingsPageController;
}) {
  const disabled =
    controller.isLoadingSettings || controller.isSavingSettings;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        disabled={disabled}
        onClick={() => void controller.reset()}
        type="button"
        variant="outline"
      >
        <RotateCcw className="size-4" />
        رجوع للافتراضي
      </Button>
      <Button
        data-testid="save-dashboard-settings"
        disabled={disabled}
        onClick={() => void controller.save()}
        type="button"
      >
        {controller.isSavingSettings ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        {controller.isSavingSettings ? "جاري الحفظ..." : "حفظ الإعدادات"}
      </Button>
    </div>
  );
}
