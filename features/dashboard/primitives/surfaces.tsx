import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  icon,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-16 items-center justify-center rounded-t-lg px-6 py-4 text-center",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-2 text-sm font-semibold leading-none tracking-normal">
          {icon}
          {title}
        </div>
        {description ? (
          <div className="text-xs leading-4 text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HoverTooltip({
  children,
  content,
  className,
  tooltipClassName,
}: {
  children: React.ReactNode;
  content?: React.ReactNode;
  className?: string;
  tooltipClassName?: string;
}) {
  if (!content) {
    return className ? (
      <div className={className}>{children}</div>
    ) : (
      <>{children}</>
    );
  }

  return (
    <div className={cn("group/tooltip relative", className)} tabIndex={0}>
      {children}
      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 min-w-36 -translate-x-1/2 translate-y-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-center text-xs text-foreground opacity-0 shadow-xl transition duration-150 group-hover/tooltip:translate-y-0 group-hover/tooltip:opacity-100 group-focus-visible/tooltip:translate-y-0 group-focus-visible/tooltip:opacity-100",
          tooltipClassName,
        )}
      >
        {content}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "blue" | "green" | "red" | "secondary";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold",
        tone === "default" && "border-border text-foreground",
        tone === "blue" &&
          "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-200",
        tone === "green" &&
          "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200",
        tone === "red" &&
          "border-red-300 bg-red-100 text-red-800 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-200",
        tone === "secondary" &&
          "border-transparent bg-secondary text-secondary-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function CurrencyText({
  children,
  className,
}: {
  children: string | number;
  className?: string;
}) {
  const parts = String(children).split(/(EGP|جنيه|جنية)/gi);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        /^(EGP|جنيه|جنية)$/i.test(part) ? (
          <span key={`${part}-${index}`} className="currency-text">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </span>
  );
}

export function PageTitle({
  title,
  description,
  actions,
  size = "large",
  className,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  size?: "large" | "compact";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-4 md:flex-row",
        size === "compact"
          ? "min-h-14 md:items-center"
          : "min-h-[57px] md:items-start",
        className,
      )}
    >
      <div>
        <h1
          className={cn(
            "tracking-normal",
            size === "large"
              ? "text-3xl font-bold leading-9"
              : "text-2xl font-semibold leading-8",
          )}
        >
          {title}
        </h1>
        <p
          className={cn(
            "text-sm leading-5 text-muted-foreground",
            size === "compact" && "mt-1",
          )}
        >
          {description}
        </p>
      </div>
      {actions ? (
        <div
          className={cn(
            "flex shrink-0",
            size === "compact"
              ? "items-center gap-2"
              : "flex-col items-start gap-3 sm:flex-row sm:items-center",
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
