"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { PageLoadError, PageLoadingState } from "../../load-error-card";
import { Card, PageTitle } from "../../primitives";
import { marketLabel } from "../create-domain";
import { CreateOrderFields, OrderNotesFields } from "./create-order-fields";
import { CreateOrderSummary } from "./create-order-summary";
import { CustomerPicker } from "./customer-picker";
import { MarketSectionsEditor } from "./market-sections-editor";
import { ProductVariantPicker } from "./product-variant-picker";
import { useCreateOrder } from "./use-create-order";

export function CreateOrderPage() {
  const state = useCreateOrder();
  const selectedVariantId = state.pickerTarget
    ? state.activePickerSection?.lines.find((line) => line.id === state.pickerTarget?.lineId)?.variantId ?? ""
    : "";

  return (
    <div dir="rtl" className="px-6 py-8">
      <PageTitle
        title="إنشاء طلب"
        description="إنشاء طلب لعميل موجود وإرساله لمسار الطلبات الحقيقي"
        size="compact"
        actions={
          <Link href="/orders" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground">
            <ChevronRight className="size-4" />
            الرجوع للطلبات
          </Link>
        }
      />
      {state.loading ? (
        <PageLoadingState className="min-h-64" />
      ) : state.error ? (
        <PageLoadError onRetry={() => void state.loadInitialData()} />
      ) : (
        <form onSubmit={state.submitOrder} className="mt-6 grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="p-5 xl:sticky xl:top-6">
            <div className="grid gap-4">
              <CreateOrderFields state={state} />
              <MarketSectionsEditor state={state} />
              <OrderNotesFields state={state} />
            </div>
          </Card>
          <CreateOrderSummary state={state} />
          <ProductVariantPicker
            open={state.pickerTarget !== null}
            variants={state.filteredVariants}
            allVariantsCount={state.activePickerVariantIds.size}
            selectedVariantId={selectedVariantId}
            query={state.productQuery}
            onQueryChange={state.setProductQuery}
            marketFilter="all"
            onMarketFilterChange={() => undefined}
            marketOptions={state.activePickerMarket ? [{ value: String(state.activePickerMarket.id), label: marketLabel(state.activePickerMarket) }] : []}
            categoryFilter={state.productCategoryFilter}
            onCategoryFilterChange={state.setProductCategoryFilter}
            categoryOptions={state.productCategories}
            availabilityFilter={state.productAvailabilityFilter}
            onAvailabilityFilterChange={state.setProductAvailabilityFilter}
            showMarketFilter={false}
            onClose={state.resetProductPicker}
            onSelect={(variantId) => {
              const variant = state.variants.find((item) => item.id === variantId);
              if (state.pickerTarget && variant) {
                state.updateLine(state.pickerTarget.sectionId, state.pickerTarget.lineId, { variantId, unitPrice: variant.price.toFixed(2) });
              }
              state.resetProductPicker();
            }}
          />
          <CustomerPicker
            open={state.customerPickerOpen}
            customers={state.filteredCustomers}
            allCustomersCount={state.users.length}
            selectedCustomerId={state.selectedUser}
            query={state.customerQuery}
            onQueryChange={state.setCustomerQuery}
            onClose={() => state.setCustomerPickerOpen(false)}
            onSelect={state.selectCustomer}
          />
        </form>
      )}
    </div>
  );
}
