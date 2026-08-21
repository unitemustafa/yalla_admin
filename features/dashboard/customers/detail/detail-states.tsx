import { Card } from "../../primitives";
import { PageLoadError } from "../../load-error-card";

export function CustomerDetailLoadingState() {
  return (
    <div className="space-y-6 px-6 py-10">
      <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
      <Card className="overflow-hidden shadow">
        <div className="flex items-center gap-4 border-b p-6">
          <div className="size-20 animate-pulse rounded-2xl bg-muted" />
          <div className="grid flex-1 gap-3">
            <div className="h-7 w-56 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded-md bg-muted/70" />
          </div>
        </div>
        <div className="grid gap-0 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="min-h-24 border-b p-6 md:border-b-0 md:border-e"
            >
              <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
              <div className="mt-3 h-5 w-40 animate-pulse rounded-md bg-muted/70" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function CustomerDetailErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  void message;
  return (
    <div className="space-y-6 px-6 py-10">
      <PageLoadError onRetry={onRetry} />
    </div>
  );
}
