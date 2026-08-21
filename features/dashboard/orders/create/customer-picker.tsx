"use client";

import { useEffect } from "react";
import { Check, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatEgyptPhoneForDisplay } from "../../order-display";
import { Button, Input } from "../../primitives";
import type { BackendDashboardUser } from "../../users/api-users";
import { customerDisplayName } from "../create-domain";

type CustomerPickerProps = {
  open: boolean;
  customers: BackendDashboardUser[];
  allCustomersCount: number;
  selectedCustomerId: string;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onSelect: (customerId: string) => void;
};

export function CustomerPicker(props: CustomerPickerProps) {
  useEffect(() => {
    if (!props.open) return;
    const scrollY = window.scrollY;
    const previous = {
      htmlOverflow: document.documentElement.style.overflow,
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.documentElement.style.overflow = previous.htmlOverflow;
      document.body.style.overflow = previous.overflow;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [props.open]);

  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <div role="dialog" aria-modal="true" aria-labelledby="customer-picker-title" className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="customer-picker-title" className="text-base font-bold">اختيار العميل</h2>
            <p className="mt-1 text-sm text-muted-foreground">ابحث بالاسم أو اسم المستخدم أو رقم الهاتف.</p>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={props.onClose} aria-label="إغلاق اختيار العميل" className="size-9 rounded-full bg-muted/30">
            <X className="size-4" />
          </Button>
        </div>
        <div className="border-b bg-muted/15 p-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} placeholder="اسم العميل أو اسم المستخدم..." className="h-11 ps-9" autoFocus />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {props.customers.length > 0 ? (
            <div className="grid gap-2">
              {props.customers.map((customer) => {
                const selected = String(customer.id) === props.selectedCustomerId;
                return (
                  <button key={customer.id} type="button" onClick={() => props.onSelect(String(customer.id))} className={cn("flex min-h-20 items-center justify-between gap-3 rounded-md border bg-card p-4 text-start shadow-sm transition hover:border-primary/45 hover:bg-accent/45", selected && "border-primary/55 bg-primary/10")}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{customerDisplayName(customer)}</span>
                      <span className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        {customer.username ? <span dir="ltr">@{customer.username}</span> : null}
                        {customer.phone ? <span dir="ltr" className="[unicode-bidi:plaintext]">{formatEgyptPhoneForDisplay(customer.phone)}</span> : null}
                        {customer.email ? <span dir="ltr">{customer.email}</span> : null}
                      </span>
                    </span>
                    {selected ? <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"><Check className="size-4" /></span> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border bg-muted/10 px-4 text-center">
              <Search className="mb-3 size-8 text-muted-foreground" />
              <div className="text-sm font-semibold">لا يوجد عملاء مطابقون</div>
            </div>
          )}
        </div>
        <div className="border-t bg-muted/10 px-5 py-3 text-xs text-muted-foreground">
          ظاهر {props.customers.length} من {props.allCustomersCount} عميل
        </div>
      </div>
    </div>
  );
}
