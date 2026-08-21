import type { ComponentPropsWithoutRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./actions";

export function DataTable({
  headers,
  rows,
  rowHeight = "normal",
  minWidth = 980,
  onRowClick,
  columnWidths,
  getRowProps,
  getCellProps,
}: {
  headers: React.ReactNode[];
  rows: React.ReactNode[][];
  rowHeight?: "compact" | "normal" | "tall";
  minWidth?: number;
  onRowClick?: () => void;
  columnWidths?: number[];
  getRowProps?: (
    rowIndex: number,
    row: React.ReactNode[],
  ) => ComponentPropsWithoutRef<"tr"> | undefined;
  getCellProps?: (
    rowIndex: number,
    cellIndex: number,
    row: React.ReactNode[],
  ) => ComponentPropsWithoutRef<"td"> | undefined;
}) {
  const rowClass =
    rowHeight === "compact"
      ? "h-[47px]"
      : rowHeight === "tall"
        ? "h-[57px]"
        : "h-[53px]";

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full caption-bottom text-sm"
        style={{ minWidth, tableLayout: columnWidths ? "fixed" : undefined }}
      >
        {columnWidths ? (
          <colgroup>
            {columnWidths.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
        ) : null}
        <thead>
          <tr className="h-10 border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            {headers.map((header, index) => (
              <th
                key={index}
                className="h-10 px-2 text-start align-middle text-xs font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const rowProps = getRowProps?.(rowIndex, row);

            return (
              <tr
                key={rowIndex}
                {...rowProps}
                onClick={rowProps?.onClick ?? onRowClick}
                className={cn(
                  rowClass,
                  "border-b transition-colors hover:bg-muted/40",
                  onRowClick && "cursor-pointer",
                  rowProps?.className,
                )}
              >
                {row.map((cell, cellIndex) => {
                  if (cell === null) {
                    return null;
                  }

                  const cellProps = getCellProps?.(rowIndex, cellIndex, row);

                  return (
                    <td
                      key={cellIndex}
                      {...cellProps}
                      className={cn(
                        "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5",
                        cellIndex === 0 && "p-0",
                        cellProps?.className,
                      )}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  text,
  pages,
  previousDisabled = true,
  nextDisabled = false,
  onPrevious,
  onNext,
}: {
  text: string;
  pages: string;
  perPage?: string;
  showPerPage?: boolean;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="flex min-h-[53px] flex-col gap-3 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:py-0">
      <div className="flex flex-wrap items-center gap-3">
        <span>{text}</span>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={previousDisabled}
          onClick={onPrevious}
        >
          <ChevronRight className="size-4" />
        </Button>
        <span>{pages}</span>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={nextDisabled}
          onClick={onNext}
        >
          <ChevronLeft className="size-4" />
        </Button>
      </div>
    </div>
  );
}
