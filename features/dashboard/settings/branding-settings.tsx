"use client";

import { useRef, type ChangeEvent } from "react";
import { ImagePlus, Store } from "lucide-react";

import { useDashboardI18n } from "@/features/dashboard/i18n";
import { Button, Input } from "@/features/dashboard/primitives";
import { SettingBlock } from "./setting-block";
import type { SettingsPageController } from "./use-settings-page";

export function BrandingSettings({
  controller,
}: {
  controller: SettingsPageController;
}) {
  const { t } = useDashboardI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function selectLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    controller.selectLogo(file);
  }

  return (
    <SettingBlock
      icon={<Store className="size-4" />}
      title="اللوجو واسم البراند"
    >
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium">
          اسم البراند
          <Input
            data-testid="dashboard-brand-name-input"
            onChange={(event) =>
              controller.updateDraft({ brandName: event.target.value })
            }
            placeholder={t("brand.name")}
            value={controller.draft.brandName}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          الوصف الظاهر تحت اللوجو
          <Input
            data-testid="dashboard-brand-tagline-input"
            onChange={(event) =>
              controller.updateDraft({ branchName: event.target.value })
            }
            placeholder={t("branch.default")}
            value={controller.draft.branchName}
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={selectLogo}
            type="file"
          />
          <Button
            disabled={controller.isSavingSettings}
            onClick={() => fileInputRef.current?.click()}
            type="button"
            variant="outline"
          >
            <ImagePlus className="size-4" />
            تغيير اللوجو
          </Button>
          {controller.hasServerLogo ? (
            <Button
              className="text-destructive hover:text-destructive"
              disabled={controller.isSavingSettings}
              onClick={() => void controller.removeLogo()}
              type="button"
              variant="outline"
            >
              حذف اللوجو
            </Button>
          ) : null}
        </div>
      </div>
    </SettingBlock>
  );
}
