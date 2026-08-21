"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ItemRow } from "../types";
import { itemShopLabel, itemVisibilityLabel } from "./domain";
import { ActiveToggleButton, PriceCell, ProductIdentity, RowActions } from "./items-components";
import { itemCheckboxClass } from "./types";

export function ItemsMobileCards({
  rows,
  selectedRows,
  onToggleSelected,
  onToggleActive,
  onView,
  onDelete,
  onRestore,
}: {
  rows: ItemRow[];
  selectedRows: Set<string>;
  onToggleSelected: (rowIndex: string) => void;
  onToggleActive: (row: ItemRow, active: boolean) => void;
  onView: (row: ItemRow) => void;
  onDelete: (rowId: string) => void;
  onRestore: (row: ItemRow) => void;
}) {
  return (
    <div className="mt-4 grid min-w-0 gap-3 lg:hidden">
      {rows.map((row) => (
        <article
          key={row.id}
          className="min-w-0 overflow-hidden rounded-md border bg-card p-3 text-card-foreground shadow-sm"
        >
          <div className="flex items-start gap-3">
            {!row.archived ? (
              <button
                type="button"
                role="checkbox"
                aria-checked={selectedRows.has(row.index)}
                data-state={selectedRows.has(row.index) ? "checked" : "unchecked"}
                value="on"
                aria-label="تحديد الصف"
                className={cn(itemCheckboxClass, "mt-3")}
                onClick={() => onToggleSelected(row.index)}
              >
                {selectedRows.has(row.index) ? <Check className="size-3" /> : null}
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <ProductIdentity row={row} compact />
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {row.description}
                  </p>
                </div>
                <RowActions
                  row={row}
                  onView={() => onView(row)}
                  onDelete={() => onDelete(row.id)}
                  onRestore={() => onRestore(row)}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-muted-foreground">الفئة الداخلية</div>
                  <div className="mt-1 truncate font-medium">{row.category}</div>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-muted-foreground">المحل</div>
                  <div className="mt-1 truncate font-medium">{itemShopLabel(row)}</div>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-muted-foreground">السعر</div>
                  <div className="mt-1">
                    <PriceCell price={row.price} />
                  </div>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-muted-foreground">الظهور</div>
                  <div className="mt-1 line-clamp-1 font-medium">
                    {itemVisibilityLabel(row)}
                  </div>
                </div>
              </div>
              {!row.archived ? <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                <ActiveToggleButton
                  active={row.active}
                  onToggle={(active) => onToggleActive(row, active)}
                />
              </div> : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

