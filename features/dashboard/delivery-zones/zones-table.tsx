"use client";

import { Archive, ArchiveRestore, Edit3, MapPin, Plus, Trash2 } from "lucide-react";

import type { ServiceCity } from "../cities/types";
import { Badge, Button, Card, CurrencyText, Switch } from "../primitives";
import { deliveryZoneStatusLabels, formatDeliveryCurrency } from "./domain";
import type { DeliveryZone } from "./types";

function StatusBadge({ zone }: { zone: DeliveryZone }) {
  return <Badge tone={zone.status === "active" ? "green" : "red"}>{deliveryZoneStatusLabels[zone.status]}</Badge>;
}

export function ZonesTable({
  zones,
  cities,
  startIndex,
  archived,
  changingStatusId,
  onEdit,
  onDelete,
  onRestore,
  onStatusChange,
  onCreate,
}: {
  zones: DeliveryZone[];
  cities: ServiceCity[];
  startIndex: number;
  archived: boolean;
  changingStatusId: string | null;
  onEdit: (zone: DeliveryZone) => void;
  onDelete: (zone: DeliveryZone) => void;
  onRestore: (zone: DeliveryZone) => void;
  onStatusChange: (zone: DeliveryZone, checked: boolean) => void;
  onCreate: () => void;
}) {
  if (!zones.length) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-md border bg-card px-4 py-10 text-center">
        <div className="rounded-full bg-muted p-3 text-primary">{archived ? <Archive className="size-6" /> : <MapPin className="size-6" />}</div>
        <div className="text-base font-semibold">{archived ? "لا توجد مناطق مؤرشفة" : "لا توجد مناطق توصيل"}</div>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">{archived ? "المناطق التي تتم أرشفتها ستظهر هنا ويمكن استعادتها." : "أضف أول منطقة لتحديد نطاقات التوصيل وأسعارها."}</p>
        {!archived ? <Button type="button" onClick={onCreate} className="mt-1"><Plus className="size-4" />أضف أول منطقة توصيل</Button> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {zones.map((zone, index) => (
        <Card key={zone.id} className="grid gap-4 p-4 xl:grid-cols-[minmax(240px,1fr)_minmax(320px,430px)_auto] xl:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">{startIndex + index + 1}</span>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><MapPin className="size-5" /></span>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-foreground">{zone.name}</h3><StatusBadge zone={zone} /></div></div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="rounded-md bg-muted px-3 py-2"><div className="truncate font-bold">{zone.cityName || cities.find((city) => String(city.id) === zone.cityId)?.name || "غير محدد"}</div><div className="text-xs text-muted-foreground">مدينة التوصيل</div></div>
            <div className="rounded-md bg-muted px-3 py-2"><div className="truncate font-bold" dir="ltr"><CurrencyText>{formatDeliveryCurrency(zone.fixedDeliveryPrice)}</CurrencyText></div><div className="text-xs text-muted-foreground">سعر التوصيل</div></div>
          </div>
          <div className="flex flex-nowrap justify-start gap-2 xl:justify-end">
            {!zone.archivedAt ? <div className="flex shrink-0 items-center gap-2 rounded-md border px-2 py-1"><Switch checked={zone.status === "active"} disabled={changingStatusId === zone.id} onCheckedChange={(checked) => onStatusChange(zone, checked)} /><span className="text-xs font-semibold">{zone.status === "active" ? "مفعّلة" : "معطّلة"}</span></div> : null}
            {zone.archivedAt ? (
              <Button type="button" variant="outline" size="icon" onClick={() => onRestore(zone)} aria-label={`استعادة ${zone.name}`} title="استعادة" className="text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600"><ArchiveRestore className="size-4" /></Button>
            ) : <>
              <Button type="button" variant="outline" size="icon" onClick={() => onEdit(zone)} aria-label={`تعديل ${zone.name}`} title="تعديل"><Edit3 className="size-4" /></Button>
              <Button type="button" variant="outline" size="icon" onClick={() => onDelete(zone)} aria-label={zone.deletionMode === "archive" ? `أرشفة ${zone.name}` : `حذف ${zone.name} نهائيًا`} title={zone.deletionMode === "archive" ? "أرشفة" : "حذف نهائي"} className="text-destructive hover:bg-destructive/10 hover:text-destructive">{zone.deletionMode === "archive" ? <Archive className="size-4" /> : <Trash2 className="size-4" />}</Button>
            </>}
          </div>
        </Card>
      ))}
    </div>
  );
}
