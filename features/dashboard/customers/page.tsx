"use client";

import { Plus, RefreshCcw, Search } from "lucide-react";

import { Button, Card, Input, PageTitle } from "../primitives";
import { AddCustomerDialog } from "./add-customer-dialog";
import { CustomersList } from "./customers-list";
import {
  CustomerErrorAlert,
  CustomersEmptyState,
  CustomersLoadingState,
  CustomersNoResults,
} from "./customers-states";
import { useCustomersPage } from "./use-customers-page";

export function CustomersPage() {
  const {
    activationUserId,
    addCustomerOpen,
    customerSearch,
    customers,
    filteredCustomers,
    handleActivationChange,
    handleCreateCustomer,
    loadCustomers,
    loadError,
    pageState,
    setAddCustomerOpen,
    setCustomerSearch,
  } = useCustomersPage();
  const isLoading = pageState === "loading";
  const hasError = pageState === "error";
  const hasCustomers = customers.length > 0;

  return (
    <div className="space-y-6 px-6 py-10">
      <PageTitle
        title="العملاء"
        description="إدارة عملاء تطبيق يلا ماركت"
        size="compact"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 text-sm"
              onClick={() => void loadCustomers()}
              disabled={isLoading}
            >
              <RefreshCcw className="size-4" />
              تحديث
            </Button>
            <Button
              className="h-9 px-4 text-sm"
              onClick={() => setAddCustomerOpen(true)}
            >
              <Plus className="size-4" />
              إضافة عميل
            </Button>
          </div>
        }
      />

      <Card className="border-border/70 bg-muted/20 p-4 shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-start">
            <div className="text-2xl font-extrabold">{customers.length}</div>
            <div className="text-xs font-bold text-muted-foreground">
              إجمالي العملاء
            </div>
          </div>
          <div className="relative w-full sm:max-w-[550px]">
            <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
              placeholder="ابحث باليوزر أو الاسم..."
              className="h-11 bg-background/40 pr-11 text-right placeholder:text-muted-foreground/70"
            />
          </div>
        </div>
      </Card>

      {hasError ? (
        <CustomerErrorAlert
          message={loadError ?? "تعذر تحميل العملاء."}
          onRetry={() => void loadCustomers()}
        />
      ) : null}
      {isLoading ? <CustomersLoadingState /> : null}

      {!isLoading && !hasError && !hasCustomers ? (
        <CustomersEmptyState onAdd={() => setAddCustomerOpen(true)} />
      ) : null}

      {!isLoading &&
      !hasError &&
      hasCustomers &&
      filteredCustomers.length === 0 ? (
        <CustomersNoResults query={customerSearch} />
      ) : null}

      {!isLoading && !hasError && filteredCustomers.length > 0 ? (
        <CustomersList
          customers={filteredCustomers}
          activationUserId={activationUserId}
          onActivationChange={(userId, checked) =>
            void handleActivationChange(userId, checked)
          }
        />
      ) : null}

      {addCustomerOpen ? (
        <AddCustomerDialog
          onClose={() => setAddCustomerOpen(false)}
          onCreate={handleCreateCustomer}
        />
      ) : null}
    </div>
  );
}
