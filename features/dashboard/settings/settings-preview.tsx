"use client";

import { DashboardImage } from "@/features/dashboard/dashboard-image";
import { Card } from "@/features/dashboard/primitives";
import type { SettingsPageController } from "./use-settings-page";

export function SettingsPreview({
  controller,
}: {
  controller: SettingsPageController;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/20 px-5 py-6">
        <div className="mx-auto flex size-20 items-center justify-center overflow-hidden rounded-xl border bg-background">
          <DashboardImage
            alt={controller.brandName}
            className="size-full"
            height={80}
            src={controller.logo}
            unoptimized={controller.logo.startsWith("blob:")}
            width={80}
          />
        </div>
        <div className="mt-4 text-center text-xl font-bold">
          {controller.brandName}
        </div>
        <div className="mt-1 text-center text-sm text-muted-foreground">
          {controller.branchName}
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div className="rounded-lg border bg-background p-3">
          <div className="text-xs text-muted-foreground">اللون الحالي</div>
          <div className="mt-2 flex gap-2">
            {controller.selectedSwatches.map((swatch) => (
              <span
                key={swatch}
                className="size-8 rounded-md border"
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
        </div>
        {controller.status ? (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            {controller.status}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
