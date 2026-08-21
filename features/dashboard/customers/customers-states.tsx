import { AlertCircle, Plus, RefreshCcw, Search, Users } from "lucide-react";

import { Button, Card } from "../primitives";

export function CustomerErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="border-destructive/30 bg-destructive/10 shadow-none">
      <div
        role="alert"
        className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="size-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">
              تعذر تحميل العملاء
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="self-start sm:self-center"
        >
          <RefreshCcw className="size-4" />
          إعادة المحاولة
        </Button>
      </div>
    </Card>
  );
}

export function CustomersLoadingState() {
  return (
    <Card className="min-h-[360px] overflow-hidden shadow">
      <div className="space-y-4 p-6">
        <div className="h-9 w-56 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-md bg-muted/60"
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

export function CustomersEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="flex min-h-[420px] items-center justify-center bg-card shadow">
      <div className="mx-auto flex w-full max-w-[520px] flex-col items-center px-6 py-12 text-center">
        <div className="flex size-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
          <Users className="size-8" />
        </div>
        <h2 className="mt-6 text-xl font-semibold leading-7">
          لا يوجد عملاء حتى الآن
        </h2>
        <p className="mt-2 max-w-[430px] text-sm leading-6 text-muted-foreground">
          سيظهر هنا عملاء تطبيق يلا ماركت بعد تسجيلهم في الباك.
        </p>
        <div className="mt-6 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
          <Button type="button" onClick={onAdd} className="h-10">
            <Plus className="size-4" />
            إضافة أول عميل
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function CustomersNoResults({ query }: { query: string }) {
  return (
    <Card className="flex min-h-[220px] items-center justify-center border-border/70 bg-muted/20 p-6 text-center shadow-none">
      <div>
        <Search className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-4 font-semibold">لا توجد نتائج مطابقة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          جرّب البحث باسم مختلف أو يوزر آخر
          {query.trim() ? `: ${query.trim()}` : "."}
        </p>
      </div>
    </Card>
  );
}
