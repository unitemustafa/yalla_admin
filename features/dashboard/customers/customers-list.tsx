"use client";

import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DashboardImage } from "../dashboard-image";
import { Badge, Button, Card, Pagination, Switch } from "../primitives";
import type { DashboardUser } from "../users/types";
import { paginateCustomers } from "./domain";

export function CustomersList({
  customers,
  activationUserId,
  onActivationChange,
}: {
  customers: DashboardUser[];
  activationUserId: string | null;
  onActivationChange: (userId: string, checked: boolean) => void;
}) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const { totalPages, safeCurrentPage, pageStartIndex, pagedCustomers } =
    paginateCustomers(customers, currentPage);

  function openUser(customer: DashboardUser) {
    router.push(`/customers/${customer.id}`);
  }

  return (
    <div className="space-y-3">
      {pagedCustomers.map((customer, index) => (
        <Card
          key={customer.id}
          className="grid gap-4 p-4 xl:grid-cols-[minmax(280px,1fr)_300px_190px] xl:items-center"
        >
          <button
            type="button"
            onClick={() => openUser(customer)}
            className="flex min-w-0 items-center gap-3 rounded-lg text-start transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            aria-label={`عرض تفاصيل ${customer.name}`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
              {pageStartIndex + index + 1}
            </span>
            <DashboardImage
              src={customer.avatar}
              placeholderType="customer"
              alt={customer.name}
              width={56}
              height={56}
              className="size-14 shrink-0 overflow-hidden rounded-full"
              imageClassName="object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-foreground">{customer.name}</h3>
                <Badge
                  tone={
                    customer.hasSignedIn === false
                      ? "blue"
                      : customer.active !== false
                        ? "green"
                        : "red"
                  }
                >
                  {customer.hasSignedIn === false
                    ? "لم يسجل الحساب بعد"
                    : customer.status}
                </Badge>
              </div>
              <p
                className="mt-1 truncate text-right text-sm text-muted-foreground"
                dir="ltr"
              >
                {customer.phone} - {customer.email}
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {customer.role}
              </p>
            </div>
          </button>

          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="rounded-md bg-muted px-3 py-2">
              <div className="truncate font-bold" dir="ltr">
                @{customer.username}
              </div>
              <div className="text-xs text-muted-foreground">اسم الدخول</div>
            </div>
            <div className="rounded-md bg-muted px-3 py-2">
              <div className="truncate font-bold">{customer.joinedAt}</div>
              <div className="text-xs text-muted-foreground">
                تاريخ الانضمام
              </div>
            </div>
          </div>

          <div className="flex items-center justify-start gap-2 xl:justify-end">
            <div
              className="flex shrink-0 items-center gap-2 rounded-md border px-2 py-1"
              title={
                customer.hasSignedIn === false
                  ? "يتاح التعطيل بعد أول تسجيل دخول للحساب."
                  : undefined
              }
            >
              <Switch
                checked={customer.active !== false}
                disabled={
                  activationUserId === customer.id ||
                  customer.hasSignedIn === false
                }
                onCheckedChange={(checked) =>
                  onActivationChange(customer.id, checked)
                }
              />
              <span className="text-xs font-semibold">
                {customer.active !== false ? "مفعّل" : "معطّل"}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => openUser(customer)}
              aria-label={`عرض تفاصيل ${customer.name}`}
              title="عرض التفاصيل"
              className="shrink-0"
            >
              <Eye className="size-4" />
            </Button>
          </div>
        </Card>
      ))}

      <Card className="overflow-hidden shadow">
        <Pagination
          text={`عرض ${pagedCustomers.length} من ${customers.length} نتيجة`}
          pages={`${safeCurrentPage} / ${totalPages}`}
          previousDisabled={safeCurrentPage === 1}
          nextDisabled={safeCurrentPage === totalPages}
          onPrevious={() =>
            setCurrentPage((page) =>
              Math.max(1, Math.min(page, totalPages) - 1),
            )
          }
          onNext={() =>
            setCurrentPage((page) =>
              Math.min(totalPages, Math.min(page, totalPages) + 1),
            )
          }
        />
      </Card>
    </div>
  );
}
