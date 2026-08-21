import { Handshake, XCircle } from "lucide-react";

import { Button, Card } from "../primitives";

export function PartnersErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <Card className="border-destructive/30 bg-destructive/10 p-5 shadow-none">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <XCircle className="size-5 text-destructive" />
          <div>
            <p className="font-bold">تعذر تحميل طلبات الشركاء</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
        <Button variant="outline" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      </div>
    </Card>
  );
}

export function PartnersLoadingState() {
  return (
    <Card className="space-y-3 p-6">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-lg bg-muted/70"
        />
      ))}
    </Card>
  );
}

export function PartnersEmptyState() {
  return (
    <Card className="flex min-h-[360px] items-center justify-center p-8 text-center">
      <div>
        <span className="mx-auto flex size-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
          <Handshake className="size-8" />
        </span>
        <h2 className="mt-5 text-lg font-extrabold">لا توجد طلبات مطابقة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          ستظهر طلبات التسجيل القادمة من تطبيق Yalla Market هنا.
        </p>
      </div>
    </Card>
  );
}
