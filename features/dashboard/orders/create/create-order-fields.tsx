"use client";

import { Loader2, Plus, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppSelect, Badge, Button, Field, Input } from "../../primitives";
import { paymentMethodOptions } from "../constants";
import { addressLabel, customerDisplayName } from "../create-domain";
import { money } from "../formatters";
import { SummaryPill } from "../summary";
import type { useCreateOrder } from "./use-create-order";

type CreateOrderState = ReturnType<typeof useCreateOrder>;

export function CreateOrderFields({ state }: { state: CreateOrderState }) {
  const address = state.selectedAddressRecord;
  const deliveryTypeLabel = address
    ? state.isGeneralAddress
      ? "دليفري"
      : address.delivery_area
        ? "مدينة ثابتة"
        : "دليفري"
    : "-";
  const deliveryPriceLabel = address
    ? address.delivery_area
      ? money(address.delivery_price_preview ?? address.delivery_area.delivery_price)
      : "يحدد لاحقاً"
    : "-";

  return (
    <>
      <Field label="العميل">
        <input required type="hidden" value={state.selectedUser} readOnly />
        <button
          type="button"
          onClick={() => state.setCustomerPickerOpen(true)}
          className={cn(
            "flex h-14 w-full items-center justify-between gap-3 rounded-md border bg-input px-3 py-2 text-start text-sm shadow-sm transition hover:border-primary/45 hover:bg-accent/60",
            !state.selectedCustomer && "text-muted-foreground",
          )}
        >
          <span className="min-w-0">
            <span className="block truncate font-semibold">
              {state.selectedCustomer ? customerDisplayName(state.selectedCustomer) : "اختر العميل"}
            </span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              {state.selectedCustomer
                ? [
                    state.selectedCustomer.username ? `@${state.selectedCustomer.username}` : "",
                    state.selectedCustomer.phone,
                  ].filter(Boolean).join(" - ")
                : "ابحث بالاسم أو اسم المستخدم"}
            </span>
          </span>
          <Search className="size-4 shrink-0 text-primary" />
        </button>
      </Field>

      <Field label="عنوان التوصيل">
        <input required type="hidden" value={state.selectedAddress} readOnly />
        <div className="grid gap-2">
          <div className="flex gap-2">
            <AppSelect
              value={state.selectedAddress}
              onValueChange={state.selectAddress}
              placeholder="اختر العنوان"
              ariaLabel="اختيار عنوان التوصيل"
              className="h-12 bg-input"
              disabled={!state.selectedUser}
              options={state.addresses.map((item) => ({ value: String(item.id), label: addressLabel(item) }))}
            />
            <Button type="button" variant="outline" className="h-12 shrink-0" disabled={!state.selectedUser} onClick={() => state.setCreateAddressOpen(!state.createAddressOpen)}>
              <Plus className="size-4" />
              عنوان
            </Button>
          </div>
          {state.createAddressOpen ? (
            <div className="grid gap-2 rounded-md border bg-muted/15 p-3">
              <Input value={state.addressName} onChange={(event) => state.setAddressName(event.target.value)} placeholder="اسم / وصف العنوان" className="h-12" />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={state.savingAddress} onClick={() => { state.setCreateAddressOpen(false); state.setAddressName(""); }}>إلغاء</Button>
                <Button type="button" disabled={state.savingAddress || !state.addressName.trim()} onClick={() => void state.createAddress()}>
                  {state.savingAddress ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  إضافة
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Field>

      {address ? (
        <div className="grid gap-3 rounded-md border bg-muted/10 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={state.isGeneralAddress ? "secondary" : "blue"}>{state.isGeneralAddress ? "جاهز للشحن" : "مدينة خدمة"}</Badge>
            <Badge tone={address.delivery_area ? "green" : "secondary"}>{deliveryTypeLabel}</Badge>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <SummaryPill label="مدينة الخدمة" value={address.service_city?.name_ar?.trim() || address.service_city?.name?.trim() || (address.service_city_id ? `City #${address.service_city_id}` : "-")} />
            <SummaryPill label="منطقة التوصيل" value={address.delivery_area?.name?.trim() || "-"} />
            {address.manual_city?.trim() ? <SummaryPill label="manual_city" value={address.manual_city.trim()} /> : null}
            {address.manual_area?.trim() ? <SummaryPill label="manual_area" value={address.manual_area.trim()} /> : null}
            <SummaryPill label="delivery_type" value={address.delivery_type ? `${address.delivery_type} - ${deliveryTypeLabel}` : deliveryTypeLabel} />
            <SummaryPill label="delivery_price_preview" value={deliveryPriceLabel} />
          </div>
        </div>
      ) : null}

      <Field label="طريقة الدفع">
        <AppSelect value={state.paymentMethod} onValueChange={state.setPaymentMethod} placeholder="طريقة الدفع" ariaLabel="طريقة الدفع" className="h-12 bg-input" options={paymentMethodOptions} />
      </Field>
    </>
  );
}

export function OrderNotesFields({ state }: { state: CreateOrderState }) {
  return (
    <>
      <Field label="ملاحظات">
        <textarea value={state.description} onChange={(event) => state.setDescription(event.target.value)} className="min-h-36 rounded-md border bg-input px-3 py-3 text-sm" />
      </Field>
      <Field label="ملاحظة التوصيل">
        <textarea value={state.deliveryNote} onChange={(event) => state.setDeliveryNote(event.target.value)} className="min-h-24 rounded-md border bg-input px-3 py-3 text-sm" />
      </Field>
    </>
  );
}
