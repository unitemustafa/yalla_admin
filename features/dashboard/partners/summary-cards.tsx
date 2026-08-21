import {
  BadgeCheck,
  Clock3,
  Handshake,
  XCircle,
} from "lucide-react";

import { Card } from "../primitives";

type PartnerCounts = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export function PartnerSummaryCards({ counts }: { counts: PartnerCounts }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="إجمالي الطلبات"
        value={counts.total}
        icon={Handshake}
        tone="primary"
      />
      <SummaryCard
        label="طلبات جديدة"
        value={counts.pending}
        icon={Clock3}
        tone="blue"
      />
      <SummaryCard
        label="طلبات مقبولة"
        value={counts.approved}
        icon={BadgeCheck}
        tone="green"
      />
      <SummaryCard
        label="طلبات مرفوضة"
        value={counts.rejected}
        icon={XCircle}
        tone="red"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Handshake;
  tone: "primary" | "blue" | "amber" | "green" | "red";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    red: "bg-red-500/10 text-red-600 dark:text-red-300",
  };
  return (
    <Card className="flex items-center gap-4 p-4 shadow-none">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <Icon className="size-5" />
      </span>
      <div>
        <div className="text-2xl font-black">{value}</div>
        <div className="text-xs font-bold text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}
