"use client";

import { Badge, DataTable } from "../../primitives";
import type { ItemRow } from "../types";
import { itemShopLabel, itemVisibilityLabel } from "./domain";
import {
  ActiveToggleButton,
  InfoPill,
  PriceCell,
  ProductIdentity,
  RowActions,
} from "./items-components";

type ItemsTableProps = {
  loading: boolean;
  onDelete: (rowId: string) => void;
  onRestore: (row: ItemRow) => void;
  onToggleActive: (row: ItemRow, active: boolean) => void;
  onView: (row: ItemRow) => void;
  pageStartIndex: number;
  rows: ItemRow[];
  showArchived: boolean;
  visibleCount: number;
};

export function ItemsTable({
  loading,
  onDelete,
  onRestore,
  onToggleActive,
  onView,
  pageStartIndex,
  rows,
  showArchived,
  visibleCount,
}: ItemsTableProps) {
  return (
    <div className="mt-4 hidden overflow-hidden rounded-md border transition-opacity duration-200 lg:block">
      <DataTable
        minWidth={1162}
        columnWidths={[78, 300, 210, 120, 130, 112, 70, 190]}
        rowHeight="normal"
        headers={[
          "",
          "المنتج",
          "الوصف",
          "المحل",
          "الظهور",
          "السعر",
          showArchived ? "الحالة" : "نشط",
          "",
        ]}
        rows={(loading ? [] : rows).map((row, rowPosition) => [
          <span
            key={`index-${row.index}`}
            className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary"
          >
            {pageStartIndex + rowPosition + 1}
          </span>,
          <div key={`product-${row.index}`} className="min-w-0 py-1.5">
            <ProductIdentity row={row} />
          </div>,
          <div key={`description-${row.index}`} className="min-w-0 py-1.5">
            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
              {row.description}
            </p>
          </div>,
          <div key={`shop-${row.index}`} className="min-w-0">
            <InfoPill>{itemShopLabel(row)}</InfoPill>
          </div>,
          <div key={`visibility-${row.index}`} className="min-w-0">
            <InfoPill>{itemVisibilityLabel(row)}</InfoPill>
          </div>,
          <div key={`price-${row.index}`} className="flex justify-start">
            <PriceCell price={row.price} />
          </div>,
          <div key={`active-wrap-${row.index}`} className="flex items-center gap-3">
            {showArchived ? (
              <Badge tone="blue">مؤرشف</Badge>
            ) : (
              <ActiveToggleButton
                active={row.active}
                onToggle={(active) => onToggleActive(row, active)}
              />
            )}
          </div>,
          <div key={`actions-${row.index}`} className="flex items-center justify-end">
            <RowActions
              row={row}
              onView={() => onView(row)}
              onDelete={() => onDelete(row.id)}
              onRestore={() => onRestore(row)}
            />
          </div>,
        ])}
      />
      {loading ? (
        <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
          جاري تحميل المنتجات...
        </div>
      ) : !visibleCount ? (
        <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
          لا توجد نتائج مطابقة.
        </div>
      ) : null}
    </div>
  );
}
