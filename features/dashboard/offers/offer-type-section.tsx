"use client";

import { cn } from "@/lib/utils";
import { FormCard } from "../primitives";
import { offerTypeOptions } from "./domain";
import { OfferKindSettings } from "./offer-kind-settings";
import { PackageSettings } from "./package-settings";
import type { CreateOfferFormController } from "./use-create-offer-form";

export function OfferTypeSection({ form }: { form: CreateOfferFormController }) {
  const { state } = form;
  return (
    <FormCard title="نوع العرض">
      <div>
        <div className="mb-3 text-sm font-medium">نوع العرض *</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {offerTypeOptions.map((option) => {
            const Icon = option.icon;
            const active = state.selectedType === option.label;
            const disabled = Boolean(option.disabled);
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => form.selectType(option.label)}
                className={cn(
                  "flex h-16 items-center gap-3 rounded-md border bg-background px-3 text-sm font-semibold shadow-sm transition hover:border-primary/40 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-background",
                  active && "border-primary bg-primary/10 text-primary",
                )}
              >
                <span className={cn("flex size-9 items-center justify-center rounded-md", option.bg, option.accent)}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{option.label}</span>
                  {disabled ? (
                    <span className="mt-0.5 block text-[10px] font-semibold text-muted-foreground">معطل حاليا</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {state.selectedType === "باكج" ? <PackageSettings form={form} /> : <OfferKindSettings form={form} />}
    </FormCard>
  );
}
