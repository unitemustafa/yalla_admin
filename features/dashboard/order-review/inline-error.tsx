import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

export function InlineError({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("flex items-start gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-200", className)}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
