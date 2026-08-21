import type { ReactNode } from "react";

export function FormSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="border-b bg-muted/20 px-4 py-3 text-sm font-semibold">{title}</div>
      <div className="grid gap-4 p-4">{children}</div>
    </section>
  );
}

export function LabelText({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
