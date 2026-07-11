"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpDown,
  BadgeCheck,
  CheckCircle2,
  DollarSign,
  Edit3,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Trash2,
  Truck,
  X,
} from "lucide-react";

import {
  ActionMenu,
  AppSelect,
  Badge,
  Button,
  Card,
  CurrencyText,
  Field,
  Input,
  PageTitle,
  Pagination,
  Switch,
} from "../primitives";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";
import { ConfirmDeleteDialog } from "../confirm-delete-dialog";
import { useAuth } from "@/features/auth/auth-provider";
import {
  deleteDeliveryZone,
  loadDeliveryZones,
  saveDeliveryZone,
} from "../delivery-zones-api";
import { useServiceCities, type ServiceCity } from "../cities-api";
import {
  type DeliveryZone,
  type DeliveryZoneStatus,
} from "../delivery-pricing";
import { cn } from "@/lib/utils";

const deliveryListPageSize = 5;
const allCitiesFilterValue = "all";

type DeliveryTab = "zones" | "settings" | "tester";

type ZoneDraft = {
  cityId: string;
  name: string;
  fixedDeliveryPrice: string;
};

type ZoneDraftErrors = Partial<Record<keyof ZoneDraft, string>>;

const statusLabels: Record<DeliveryZoneStatus, string> = {
  active: "مفعلة",
  inactive: "غير مفعلة",
};

function formatCurrency(value: number) {
  const formattedValue = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `${formattedValue} EGP`;
}

function formatDate(value?: string | number | Date | null) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function createZoneId(name: string) {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{Letter}\p{Number}-]/gu, "");

  return `${normalizedName || "zone"}-${Date.now()}`;
}

function parseNumber(value: string) {
  const numberValue = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function numberToDraftValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function useLockedPageScroll() {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);
}

function createZoneDraft(zone?: DeliveryZone): ZoneDraft {
  return {
    cityId: zone?.cityId ?? "",
    name: zone?.name ?? "",
    fixedDeliveryPrice: numberToDraftValue(zone?.fixedDeliveryPrice ?? 0),
  };
}

function validateZoneDraft(draft: ZoneDraft) {
  const errors: ZoneDraftErrors = {};
  const fixedDeliveryPrice = parseNumber(draft.fixedDeliveryPrice);

  if (!draft.cityId) {
    errors.cityId = "مدينة التوصيل مطلوبة.";
  }

  if (!draft.name.trim()) {
    errors.name = "اسم المنطقة مطلوب.";
  }

  if (fixedDeliveryPrice < 0) {
    errors.fixedDeliveryPrice = "السعر لا يكون أقل من صفر.";
  }

  return errors;
}

function zoneFromDraft(draft: ZoneDraft, currentZone?: DeliveryZone): DeliveryZone {
  const today = getTodayIso();

  return {
    id: currentZone?.id ?? createZoneId(draft.name),
    cityId: draft.cityId,
    cityName: currentZone?.cityName ?? "",
    name: draft.name.trim(),
    fixedDeliveryPrice: parseNumber(draft.fixedDeliveryPrice),
    status: currentZone?.status ?? "active",
    createdAt: currentZone?.createdAt ?? today,
    updatedAt: today,
  };
}

function deliveryPriceLabel(zone: DeliveryZone) {
  return formatCurrency(zone.fixedDeliveryPrice);
}

function StatusBadge({ status }: { status: DeliveryZoneStatus }) {
  const tone = status === "active" ? "green" : "red";

  return <Badge tone={tone}>{statusLabels[status]}</Badge>;
}

function MetricCards({
  cards,
}: {
  cards: Array<[string, string, React.ComponentType<{ className?: string }>, string]>;
}) {
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-3">
      {cards.map(([label, value, Icon, tone]) => (
        <Card key={label} className="h-[75px] rounded-[12px]">
          <div className="flex h-full items-center gap-3 px-6">
            <div className={cn("rounded-full bg-muted/50 p-3", tone)}>
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <CurrencyText className="block text-xl font-semibold leading-tight">{value}</CurrencyText>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function FieldError({ children }: { children?: string }) {
  return children ? (
    <p className="text-xs font-medium text-destructive">{children}</p>
  ) : null;
}

function NumberField({
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Input
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        dir="ltr"
        className="text-right"
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function ZoneFormDialog({
  zone,
  cities,
  onClose,
  onSave,
}: {
  zone?: DeliveryZone;
  cities: ServiceCity[];
  onClose: () => void;
  onSave: (zone: DeliveryZone) => void;
}) {
  useLockedPageScroll();

  const [draft, setDraft] = useState<ZoneDraft>(() => createZoneDraft(zone));
  const [errors, setErrors] = useState<ZoneDraftErrors>({});
  const isEditing = Boolean(zone);
  const cityOptions = useMemo(() => {
    const activeOptions = cities
      .filter((city) => city.is_active !== false)
      .map((city) => ({
        value: String(city.id),
        label: city.name,
      }));
    const currentCity = cities.find((city) => String(city.id) === draft.cityId);
    if (isEditing && currentCity?.is_active === false) {
      return [
        {
          value: String(currentCity.id),
          label: `${currentCity.name} (غير مفعلة)`,
        },
        ...activeOptions.filter((option) => option.value !== String(currentCity.id)),
      ];
    }
    return activeOptions;
  }, [cities, draft.cityId, isEditing]);

  function updateDraft<K extends keyof ZoneDraft>(field: K, value: ZoneDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submitZone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateZoneDraft(draft);

    if (!cityOptions.some((option) => option.value === draft.cityId)) {
      nextErrors.cityId = "اختر مدينة خدمة مفعلة.";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const selectedCity = cities.find((city) => String(city.id) === draft.cityId);
    onSave({
      ...zoneFromDraft(draft, zone),
      cityName: selectedCity?.name || zone?.cityName || "",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/60 px-4 py-3 backdrop-blur-sm sm:px-6">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 z-10 inline-flex size-8 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent"
          aria-label="إغلاق"
        >
          <X className="size-4" />
        </button>

        <div className="border-b bg-muted/20 px-5 py-3 pe-14">
          <h2 className="text-xl font-semibold leading-7">
            {isEditing ? "تعديل منطقة توصيل" : "إضافة منطقة جديدة"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            اضبط قواعد التسعير وحدود التوصيل لهذه المنطقة.
          </p>
        </div>

        <form onSubmit={submitZone} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 items-start gap-3 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-lg border bg-card">
              <div className="border-b px-4 py-3 text-sm font-bold">
                بيانات المنطقة
              </div>
              <div className="grid gap-3 p-3 md:grid-cols-2">
                <Field label="اسم المنطقة *">
                  <Input
                    autoFocus
                    dir="rtl"
                    value={draft.name}
                    onChange={(event) => updateDraft("name", event.target.value)}
                    placeholder="مثلًا: القاهرة الجديدة"
                  />
                  <FieldError>{errors.name}</FieldError>
                </Field>

                <Field label="مدينة التوصيل *">
                  <AppSelect
                    value={draft.cityId}
                    onValueChange={(value) => updateDraft("cityId", value)}
                    options={cityOptions}
                    placeholder="اختر مدينة التوصيل"
                    ariaLabel="مدينة التوصيل"
                    disabled={!cityOptions.length}
                    dir="rtl"
                  />
                  <FieldError>{errors.cityId}</FieldError>
                </Field>

                <NumberField
                  label="سعر التوصيل الثابت *"
                  value={draft.fixedDeliveryPrice}
                  onChange={(value) => updateDraft("fixedDeliveryPrice", value)}
                  error={errors.fixedDeliveryPrice}
                  placeholder="45"
                />
              </div>
            </div>

            <div className="rounded-lg border bg-card">
              <div className="border-b px-4 py-3 text-sm font-bold">
                معاينة التسعير
              </div>
              <div className="space-y-3 p-3 text-sm">
                <PreviewRow
                  label="مدينة التوصيل"
                  value={
                    cities.find((city) => String(city.id) === draft.cityId)?.name ||
                    "-"
                  }
                />
                <PreviewRow label="المنطقة" value={draft.name || "منطقة جديدة"} />
                <PreviewRow
                  label="سعر التوصيل"
                  value={formatCurrency(parseNumber(draft.fixedDeliveryPrice))}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t bg-muted/15 px-5 py-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit">
              <Save className="size-4" />
              حفظ المنطقة
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-start font-semibold">{value}</span>
    </div>
  );
}

function ZonesTable({
  zones,
  startIndex,
  openActionMenu,
  onToggleMenu,
  onEdit,
  onDelete,
}: {
  zones: DeliveryZone[];
  startIndex: number;
  openActionMenu: string | null;
  onToggleMenu: (zoneId: string) => void;
  onEdit: (zone: DeliveryZone) => void;
  onDelete: (zone: DeliveryZone) => void;
}) {
  if (!zones.length) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-md border bg-card px-4 py-10 text-center">
        <div className="rounded-full bg-muted p-3 text-primary">
          <MapPin className="size-6" />
        </div>
        <div className="text-base font-semibold">لا توجد مناطق توصيل</div>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          أضف أول منطقة لتحديد نطاقات التوصيل وأسعارها.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <table
        className="w-full caption-bottom text-sm"
        style={{ minWidth: 760, tableLayout: "fixed" }}
      >
        <colgroup>
          {[40, 200, 180, 120, 140, 80].map(
            (width, index) => (
              <col key={index} style={{ width }} />
            ),
          )}
        </colgroup>
        <thead>
          <tr className="h-10 border-b transition-colors hover:bg-muted/50">
            {[
              "#",
              <span key="name" className="inline-flex items-center gap-2">
                اسم المنطقة <ArrowUpDown className="size-4" />
              </span>,
              "نوع التسعير",
              "سعر التوصيل",
              "الحد الأدنى للطلب",
              "أقصى مسافة توصيل",
              "الحالة",
              "تاريخ الإنشاء",
              <span key="actions" className="block text-center">
                الإجراءات
              </span>,
            ].map((header, index) => (
              <th
                key={index}
                className="h-10 px-2 text-start align-middle text-xs font-medium text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {zones.map((zone, index) => (
            <tr
              key={zone.id}
              className="h-[62px] border-b transition-colors hover:bg-muted/40"
            >
              <td className="p-0 align-middle">
                <span className="block px-3">{startIndex + index + 1}</span>
              </td>
              <td className="p-2 align-middle">
                <div>
                  <div className="font-semibold">{zone.name}</div>
                </div>
              </td>
              <td className="p-2 align-middle font-semibold">
                <CurrencyText>{deliveryPriceLabel(zone)}</CurrencyText>
              </td>
              <td className="p-2 align-middle">
                <StatusBadge status={zone.status} />
              </td>
              <td className="p-2 align-middle">{formatDate(zone.createdAt)}</td>
              <td className="p-2 align-middle">
                <div className="flex justify-center">
                  <ActionMenu
                    open={openActionMenu === zone.id}
                    onToggle={() => onToggleMenu(zone.id)}
                    align="end"
                    label={`إجراءات ${zone.name}`}
                    triggerClassName="h-8 w-10"
                    menuClassName="w-36"
                    items={[
                      {
                        label: "تعديل",
                        icon: Edit3,
                        onClick: () => onEdit(zone),
                      },
                      {
                        label: "حذف",
                        icon: Trash2,
                        onClick: () => onDelete(zone),
                        tone: "danger",
                      },
                    ]}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ZonesMobileList({
  zones,
  cities,
  startIndex,
  onEdit,
  onDelete,
  onStatusChange,
  changingStatusId,
}: {
  zones: DeliveryZone[];
  cities: ServiceCity[];
  startIndex: number;
  onEdit: (zone: DeliveryZone) => void;
  onDelete: (zone: DeliveryZone) => void;
  onStatusChange: (zone: DeliveryZone, checked: boolean) => void;
  changingStatusId: string | null;
}) {
  if (!zones.length) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {zones.map((zone, index) => (
        <Card
          key={zone.id}
          className="grid gap-4 p-4 xl:grid-cols-[minmax(240px,1fr)_minmax(320px,430px)_auto] xl:items-center"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
              {startIndex + index + 1}
            </span>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-foreground">{zone.name}</h3>
                <StatusBadge status={zone.status} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="rounded-md bg-muted px-3 py-2">
              <div className="truncate font-bold">
                {zone.cityName ||
                  cities.find((city) => String(city.id) === zone.cityId)?.name ||
                  "غير محدد"}
              </div>
              <div className="text-xs text-muted-foreground">مدينة التوصيل</div>
            </div>
            <div className="rounded-md bg-muted px-3 py-2">
              <div className="truncate font-bold" dir="ltr">
                <CurrencyText>{deliveryPriceLabel(zone)}</CurrencyText>
              </div>
              <div className="text-xs text-muted-foreground">سعر التوصيل</div>
            </div>
          </div>

          <div className="flex flex-nowrap justify-start gap-2 xl:justify-end">
            <div className="flex shrink-0 items-center gap-2 rounded-md border px-2 py-1">
              <Switch
                checked={zone.status === "active"}
                disabled={changingStatusId === zone.id}
                onCheckedChange={(checked) => onStatusChange(zone, checked)}
              />
              <span className="text-xs font-semibold">
                {zone.status === "active" ? "مفعّلة" : "معطّلة"}
              </span>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={() => onEdit(zone)} aria-label={`تعديل ${zone.name}`} title="تعديل">
              <Edit3 className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => onDelete(zone)} aria-label={`حذف ${zone.name}`} title="حذف" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function DeliveryZonesPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const queueUndoableDelete = useUndoableDelete();
  const [activeTab, setActiveTab] = useState<DeliveryTab>("zones");
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCityId, setSelectedCityId] = useState(allCitiesFilterValue);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteZone, setDeleteZone] = useState<DeliveryZone | null>(null);
  const [deletingZoneId, setDeletingZoneId] = useState<string | null>(null);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const { cities, loading: citiesLoading, error: citiesError } = useServiceCities();
  const cityFilterOptions = useMemo(
    () => [
      { value: allCitiesFilterValue, label: "جميع المدن" },
      ...cities.map((city) => ({
        value: String(city.id),
        label: city.name,
      })),
    ],
    [cities],
  );

  const loadZones = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const serviceCityId =
        selectedCityId === allCitiesFilterValue ? undefined : selectedCityId;
      setZones(await loadDeliveryZones(apiFetch, serviceCityId));
    } catch (error) {
      setZones([]);
      setLoadError(
        error instanceof Error ? error.message : "تعذر تحميل مناطق التوصيل.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch, selectedCityId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadZones(), 0);
    return () => window.clearTimeout(timer);
  }, [loadZones]);

  const filteredZones = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase("ar-EG");

    if (!normalizedSearch) {
      return zones;
    }

    return zones.filter((zone) =>
      [zone.name, zone.cityName, statusLabels[zone.status]]
        .join(" ")
        .toLocaleLowerCase("ar-EG")
        .includes(normalizedSearch),
    );
  }, [searchQuery, zones]);

  const zoneCount = zones.length;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredZones.length / deliveryListPageSize),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * deliveryListPageSize;
  const pagedZones = filteredZones.slice(
    pageStartIndex,
    pageStartIndex + deliveryListPageSize,
  );
  const displayPrices = zones.map((zone) => zone.fixedDeliveryPrice);
  const lowestPrice = displayPrices.length ? Math.min(...displayPrices) : 0;
  const highestPrice = displayPrices.length ? Math.max(...displayPrices) : 0;

  async function saveZone(zone: DeliveryZone) {
    try {
      const savedZone = await saveDeliveryZone(apiFetch, zone);
      const matchesCityFilter =
        selectedCityId === allCitiesFilterValue || savedZone.cityId === selectedCityId;
      if (editingZone) {
        setZones((currentZones) =>
          matchesCityFilter
            ? currentZones.map((currentZone) =>
                currentZone.id === zone.id ? savedZone : currentZone,
              )
            : currentZones.filter((currentZone) => currentZone.id !== zone.id),
        );
        setEditingZone(null);
        showSnackbar({ message: "تم تحديث منطقة التوصيل.", tone: "success" });
        return;
      }

      if (matchesCityFilter) {
        setZones((currentZones) => [savedZone, ...currentZones]);
      }
      setCreating(false);
      setCurrentPage(1);
      showSnackbar({ message: "تمت إضافة منطقة التوصيل.", tone: "success" });
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر حفظ منطقة التوصيل.",
        tone: "danger",
      });
    }
  }

  async function handleZoneStatusChange(zone: DeliveryZone, checked: boolean) {
    if (changingStatusId) return;

    setChangingStatusId(zone.id);
    try {
      const savedZone = await saveDeliveryZone(apiFetch, {
        ...zone,
        status: checked ? "active" : "inactive",
      });
      setZones((currentZones) =>
        currentZones.map((currentZone) =>
          currentZone.id === savedZone.id ? savedZone : currentZone,
        ),
      );
      showSnackbar({
        message: checked ? "تم تفعيل منطقة التوصيل." : "تم تعطيل منطقة التوصيل.",
        tone: checked ? "success" : "danger",
      });
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر تحديث منطقة التوصيل.",
        tone: "danger",
      });
    } finally {
      setChangingStatusId(null);
    }
  }

  async function confirmDeleteZone() {
    if (!deleteZone || deletingZoneId) {
      return;
    }

    const zone = deleteZone;
    const zoneIndex = zones.findIndex((currentZone) => currentZone.id === zone.id);
    setDeletingZoneId(zone.id);
    try {
      await deleteDeliveryZone(apiFetch, zone.id);
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر حذف منطقة التوصيل.",
        tone: "danger",
      });
      setDeletingZoneId(null);
      return;
    }

    queueUndoableDelete({
      message: `تم حذف ${zone.name}.`,
      onDelete: () => {
        setZones((currentZones) =>
          currentZones.filter((currentZone) => currentZone.id !== zone.id),
        );
        setDeleteZone(null);
        setDeletingZoneId(null);
      },
      onUndo: async () => {
        try {
          const restoredZone = await saveDeliveryZone(apiFetch, {
            ...zone,
            id: `restore-${zone.id}`,
          });
          setZones((currentZones) => {
            if (currentZones.some((currentZone) => currentZone.id === restoredZone.id)) {
              return currentZones;
            }

            const nextZones = [...currentZones];
            nextZones.splice(Math.max(0, zoneIndex), 0, restoredZone);
            return nextZones;
          });
          showSnackbar({ message: `تمت استعادة منطقة ${restoredZone.name}.`, tone: "success" });
        } catch (error) {
          showSnackbar({
            message: error instanceof Error ? error.message : "تعذر التراجع عن حذف منطقة التوصيل.",
            tone: "danger",
          });
        }
      },
      onCommit: async () => undefined,
      onCommitError: (error) => {
        showSnackbar({
          message: error instanceof Error ? error.message : "تعذر حذف منطقة التوصيل.",
          tone: "danger",
        });
      },
    });
  }

  return (
    <div dir="rtl" className="px-6 py-8">
      <PageTitle
        title="مناطق التوصيل"
        description="إدارة المناطق وقواعد التسعير وحدود التوصيل من مكان واحد."
        size="compact"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void loadZones()} disabled={loading}>
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              تحديث
            </Button>
            <Button onClick={() => setCreating(true)} disabled={citiesLoading || Boolean(citiesError)}>
              <Plus className="size-4" />
              منطقة جديدة
            </Button>
          </div>
        }
      />

      <MetricCards
        cards={[
          ["إجمالي المناطق", String(zoneCount), MapPin, "text-primary"],
          ["أقل سعر", formatCurrency(lowestPrice), DollarSign, "text-green-500"],
          ["أعلى سعر", formatCurrency(highestPrice), CheckCircle2, "text-blue-500"],
        ]}
      />

      <div className="mt-6 flex flex-wrap gap-2 rounded-lg border bg-card p-2">
        {[
          ["zones", "المناطق الحالية", Truck],
          ["settings", "إعدادات التسعير العام", Settings2],
          ["tester", "اختبار سعر التوصيل", BadgeCheck],
        ].map(([tab, label, Icon]) => {
          const disabled = tab !== "zones";
          return (
            <button
              key={tab as string}
              type="button"
              aria-disabled={disabled}
              disabled={disabled}
              title={disabled ? "غير متاح حالياً" : undefined}
              onClick={() => {
                if (!disabled) setActiveTab(tab as DeliveryTab);
              }}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition",
                disabled
                  ? "cursor-not-allowed text-muted-foreground/45 opacity-60"
                  : activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label as string}
            </button>
          );
        })}
      </div>

      {activeTab === "zones" ? (
        <section className="mt-6">
          <div className="grid gap-4 rounded-lg border bg-card p-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,320px)_minmax(320px,460px)] xl:items-end">
            <div>
              <h2 className="font-semibold">كل مناطق التوصيل</h2>
              <p className="text-xs text-muted-foreground">ابحث وراجع الحالة والتسعير لكل منطقة.</p>
            </div>
            <div className="min-w-0">
              <AppSelect
                value={selectedCityId}
                onValueChange={(value) => {
                  setSelectedCityId(value);
                  setCurrentPage(1);
                }}
                options={cityFilterOptions}
                ariaLabel="فلتر المدينة"
                disabled={citiesLoading || Boolean(citiesError)}
                className="h-11 bg-background"
                dir="rtl"
              />
              {citiesLoading ? (
                <p className="mt-1 text-xs text-muted-foreground">جاري تحميل المدن...</p>
              ) : citiesError ? (
                <p className="mt-1 text-xs font-medium text-destructive">{citiesError}</p>
              ) : null}
            </div>
            <div className="relative w-full min-w-0">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 border-border/70 bg-muted/20 ps-9 placeholder:text-muted-foreground/60"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="البحث عن منطقة"
              />
            </div>
          </div>

          {loading ? (
            <div className="mt-4 grid gap-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-md border bg-muted/30"
                />
              ))}
            </div>
          ) : loadError ? (
            <Card className="mt-4 border-destructive/30 bg-destructive/10 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertCircle className="size-5 shrink-0" />
                  <span>{loadError}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => void loadZones()}>
                  <RefreshCw className="size-4" />
                  إعادة المحاولة
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <div className="mt-4">
                <ZonesMobileList
                  zones={pagedZones}
                  cities={cities}
                  startIndex={pageStartIndex}
                  onEdit={setEditingZone}
                  onDelete={setDeleteZone}
                  onStatusChange={handleZoneStatusChange}
                  changingStatusId={changingStatusId}
                />
                {!pagedZones.length ? (
                  <ZonesTable
                    zones={pagedZones}
                    startIndex={pageStartIndex}
                    openActionMenu={null}
                    onToggleMenu={() => undefined}
                    onEdit={setEditingZone}
                    onDelete={setDeleteZone}
                  />
                ) : null}
              </div>
              <Pagination
                text={`عرض ${pagedZones.length} من ${filteredZones.length} نتيجة`}
                pages={`${safeCurrentPage} / ${totalPages}`}
                previousDisabled={safeCurrentPage === 1}
                nextDisabled={safeCurrentPage === totalPages}
                onPrevious={() =>
                  setCurrentPage((page) =>
                    Math.max(1, Math.min(page, totalPages) - 1),
                  )
                }
                onNext={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, Math.min(page, totalPages) + 1),
                  )
                }
              />
            </>
          )}
        </section>
      ) : null}
      {creating ? (
        <ZoneFormDialog
          cities={cities}
          onClose={() => setCreating(false)}
          onSave={saveZone}
        />
      ) : null}
      {editingZone ? (
        <ZoneFormDialog
          zone={editingZone}
          cities={cities}
          onClose={() => setEditingZone(null)}
          onSave={saveZone}
        />
      ) : null}
      {deleteZone ? (
        <ConfirmDeleteDialog
          title="حذف منطقة التوصيل"
          description={`هل تريد حذف منطقة التوصيل ${deleteZone.name}؟`}
          busy={deletingZoneId === deleteZone.id}
          onCancel={() => setDeleteZone(null)}
          onConfirm={confirmDeleteZone}
        />
      ) : null}
    </div>
  );
}
