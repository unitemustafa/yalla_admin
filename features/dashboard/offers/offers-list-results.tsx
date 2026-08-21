"use client";

import Link from "next/link";
import { AlertCircle, Clock, Plus, RefreshCcw, Tag } from "lucide-react";

import { Button, Card } from "../primitives";
import { OfferCardsGrid } from "./offer-cards-grid";
import { OfferDeleteModal } from "./list-components";
import type { OffersListController } from "./use-offers-list";

export function OffersListResults({ list }: { list: OffersListController }) {
  if (list.loading) {
    return (
      <Card className="mt-6 flex min-h-52 items-center justify-center">
        <Clock className="size-6 animate-spin text-primary" />
      </Card>
    );
  }
  if (list.error) {
    return (
      <Card className="mt-6 border-destructive/30 bg-destructive/10 shadow-none">
        <div role="alert" className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertCircle className="size-4" />
            </div>
            <div>
              <div className="font-semibold text-foreground">تعذر تحميل العروض</div>
              <p className="mt-1 text-sm text-muted-foreground">{list.error}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void list.reload()}
            className="self-start sm:self-center"
          >
            <RefreshCcw className="size-4" />
            إعادة المحاولة
          </Button>
        </div>
      </Card>
    );
  }
  if (!list.offers.length) {
    return (
      <Card className="mt-6 flex min-h-[280px] items-center justify-center bg-card shadow">
        <div className="mx-auto flex w-full max-w-[520px] flex-col items-center px-6 py-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
            <Tag className="size-8" />
          </div>
          <h2 className="mt-4 text-xl font-semibold leading-7">
            {list.showArchived ? "لا توجد عروض مؤرشفة" : "لا توجد عروض حتى الآن"}
          </h2>
          <p className="mt-2 max-w-[430px] text-sm leading-6 text-muted-foreground">
            {list.showArchived
              ? "العروض التي تتم أرشفتها ستظهر هنا ويمكن استعادتها."
              : "سيظهر هنا أول عرض تنشئه للعملاء في تطبيق يلا ماركت."}
          </p>
          {!list.showArchived ? (
            <div className="mt-4 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
              <Link
                href="/offers/create"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
              >
                <Plus className="size-4" />
                إنشاء أول عرض
              </Link>
            </div>
          ) : null}
        </div>
      </Card>
    );
  }
  if (!list.filteredOffers.length) {
    return (
      <Card className="mt-6 p-6 text-center text-sm text-muted-foreground">
        لا توجد عروض مطابقة للفلاتر الحالية.
      </Card>
    );
  }
  return (
    <>
      <OfferCardsGrid list={list} />
      {list.deleteTarget ? (
        <OfferDeleteModal
          offer={list.deleteTarget}
          deleting={false}
          onClose={() => list.setDeleteTarget(null)}
          onConfirm={() => {
            const target = list.deleteTarget;
            if (target) list.remove(target);
          }}
        />
      ) : null}
    </>
  );
}
