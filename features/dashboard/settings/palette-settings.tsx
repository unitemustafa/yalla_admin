"use client";

import { Check, Paintbrush, Palette } from "lucide-react";

import {
  dashboardCustomPaletteVariables,
  dashboardPalettes,
  type DashboardCustomColors,
} from "@/features/dashboard/customization";
import { Input } from "@/features/dashboard/primitives";
import { cn } from "@/lib/utils";
import { SettingBlock } from "./setting-block";
import type { SettingsPageController } from "./use-settings-page";

const customColorFields: Array<[keyof DashboardCustomColors, string]> = [
  ["primary", "اللون الأساسي"],
  ["surface", "لون التحديد الخفيف"],
  ["accent", "لون مساعد"],
];

export function PaletteSettings({
  controller,
}: {
  controller: SettingsPageController;
}) {
  return (
    <SettingBlock
      collapsible
      icon={<Paintbrush className="size-4" />}
      title="ألوان اللوحة"
    >
      <div className="grid gap-3 md:grid-cols-2">
        {dashboardPalettes.map((palette) => {
          const selected = palette.id === controller.draft.palette;
          return (
            <button
              key={palette.id}
              aria-pressed={selected}
              className={cn(
                "flex min-h-20 items-center justify-between gap-3 rounded-lg border bg-background p-4 text-start transition-colors hover:bg-accent",
                selected && "border-primary bg-primary/10 text-primary",
              )}
              onClick={() =>
                controller.updateDraft({
                  palette: palette.id,
                  customColors: {
                    primary: palette.swatches[0],
                    surface: palette.swatches[1],
                    accent: palette.swatches[2],
                  },
                })
              }
              type="button"
            >
              <span className="font-semibold">{palette.name}</span>
              <span className="flex items-center gap-2">
                {palette.swatches.map((swatch) => (
                  <span
                    key={swatch}
                    className="size-7 rounded-md border shadow-sm"
                    style={{ backgroundColor: swatch }}
                  />
                ))}
                {selected ? <Check className="size-4" /> : null}
              </span>
            </button>
          );
        })}
        <button
          aria-pressed={controller.draft.palette === "custom"}
          className={cn(
            "flex min-h-20 items-center justify-between gap-3 rounded-lg border bg-background p-4 text-start transition-colors hover:bg-accent",
            controller.draft.palette === "custom" &&
              "border-primary bg-primary/10 text-primary",
          )}
          onClick={() => controller.updateDraft({ palette: "custom" })}
          type="button"
        >
          <span className="font-semibold">مخصص</span>
          <span className="flex items-center gap-2">
            {dashboardCustomPaletteVariables(
              controller.draft.customColors,
            ).swatches.map((swatch) => (
              <span
                key={swatch}
                className="size-7 rounded-md border shadow-sm"
                style={{ backgroundColor: swatch }}
              />
            ))}
            {controller.draft.palette === "custom" ? (
              <Check className="size-4" />
            ) : null}
          </span>
        </button>
      </div>

      <div className="mt-4 rounded-lg border bg-background p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Palette className="size-4 text-primary" />
          تخصيص الألوان
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {customColorFields.map(([colorKey, label]) => (
            <label
              key={colorKey}
              className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-sm font-medium"
            >
              {label}
              <div className="flex items-center gap-2">
                <Input
                  aria-label={label}
                  className="h-10 w-12 cursor-pointer p-1"
                  onChange={(event) =>
                    controller.updateCustomColor(colorKey, event.target.value)
                  }
                  type="color"
                  value={controller.draft.customColors[colorKey]}
                />
                <Input
                  className="h-10 font-mono text-xs"
                  dir="ltr"
                  onChange={(event) =>
                    controller.updateCustomColor(colorKey, event.target.value)
                  }
                  value={controller.draft.customColors[colorKey]}
                />
              </div>
            </label>
          ))}
        </div>
      </div>
    </SettingBlock>
  );
}
