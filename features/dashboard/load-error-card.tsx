import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

import { Button } from "./primitives";

type PageLoadErrorProps = {
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
};

export function PageLoadError({
  onRetry,
  retrying = false,
  className = "min-h-[280px]",
}: PageLoadErrorProps) {
  return (
    <section
      dir="rtl"
      role="alert"
      className={`flex flex-col items-center justify-center gap-4 rounded-xl border border-red-500/45 bg-card px-6 py-10 text-center shadow-sm ${className}`}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
        <AlertCircle className="size-6" />
      </span>
      <p className="max-w-xl text-base text-muted-foreground">
        تحقق من اتصال الإنترنت ثم حاول مرة أخرى.
      </p>
      <Button type="button" variant="outline" className="h-11 px-5 text-base" onClick={onRetry} disabled={retrying}>
        <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} />
        إعادة المحاولة
      </Button>
    </section>
  );
}

export function PageLoadingState({ className = "min-h-[280px]" }: { className?: string }) {
  return (
    <section
      dir="rtl"
      aria-label="جار التحميل"
      className={`flex items-center justify-center ${className}`}
    >
      <Loader2 className="size-8 animate-spin text-primary" />
    </section>
  );
}

/** @deprecated Use PageLoadError. */
export const LoadErrorCard = PageLoadError;
