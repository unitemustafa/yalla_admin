"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit, MapPin, Plus, Search, Store, X } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  adminApiPaths,
  apiList,
  fetchAdminRows,
  readApiData,
  sendAdminJson,
  shopRowFromApi,
  type BackendRecord,
  type ShopRow,
} from "../admin-api";
import {
  AppSelect,
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  PageTitle,
  Pagination,
  Switch,
} from "../primitives";
import { PageLoadError } from "../load-error-card";
import { useServiceCities, type ServiceCity } from "../cities-api";

export const initialShopRows: ShopRow[] = [
  {
    id: "shop-fish-market",
    name: "أسماك الطازج",
    category: "مطاعم",
    branch: "التل الكبير",
    products: "18",
    active: true,
  },
  {
    id: "shop-green-basket",
    name: "سلة الخضار",
    category: "الطازج",
    branch: "التل الكبير",
    products: "24",
    active: true,
  },
  {
    id: "shop-family-market",
    name: "ماركت العائلة",
    category: "التسوق",
    branch: "كل الفروع",
    products: "42",
    active: true,
  },
  {
    id: "shop-bakery",
    name: "مخبوزات الصباح",
    category: "الأكل",
    branch: "التل الكبير",
    products: "11",
    active: false,
  },
];

const shopsPageSize = 10;

type ShopFormValues = {
  name: string;
  category: string;
  appearsInGeneral: boolean;
  appearsInServiceCities: boolean;
  serviceCityIds: string[];
};

function AddShopDrawer({
  categories,
  initialShop,
  serviceCities,
  serviceCitiesLoading,
  onClose,
  onSave,
}: {
  categories: string[];
  initialShop?: ShopRow | null;
  serviceCities: ServiceCity[];
  serviceCitiesLoading: boolean;
  onClose: () => void;
  onSave: (values: ShopFormValues) => void;
}) {
  const [name, setName] = useState(initialShop?.name ?? "");
  const [category, setCategory] = useState(initialShop?.category ?? "");
  const [appearsInGeneral, setAppearsInGeneralState] = useState(initialShop?.scope !== "service_city");
  const [appearsInServiceCities, setAppearsInServiceCities] = useState(
    initialShop?.scope === "service_city",
  );
  const [selectedServiceCityIds, setSelectedServiceCityIds] = useState<string[]>(
    initialShop?.scope === "service_city" ? initialShop?.serviceCityIds?.slice(0, 1) ?? [] : [],
  );
  const canSave =
    name.trim() &&
    category.trim() &&
    (appearsInGeneral || (appearsInServiceCities && selectedServiceCityIds.length > 0));
  const mode = initialShop ? "edit" : "create";
  const scopeDescription = appearsInGeneral
      ? "هذا المحل عام ويظهر دون ربطه بمدن خدمة محددة."
      : appearsInServiceCities
        ? "هذا المحل يظهر في مدن الخدمة المختارة فقط."
        : "اختر نطاق ظهور واحد على الأقل.";

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

  function toggleServiceCity(cityId: string) {
    setSelectedServiceCityIds((currentIds) =>
      currentIds.includes(cityId)
        ? []
        : [cityId],
    );
  }

  function setAppearsInGeneral(enabled: boolean) {
    setAppearsInGeneralState(enabled);
    if (enabled) {
      setAppearsInServiceCities(false);
      setSelectedServiceCityIds([]);
    }
  }

  function setServiceCitiesEnabled(enabled: boolean) {
    setAppearsInServiceCities(enabled);
    if (enabled) setAppearsInGeneralState(false);
    if (!enabled) {
      setSelectedServiceCityIds([]);
    }
  }

  function submitShop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    onSave({
      name: name.trim(),
      category: category.trim(),
      appearsInGeneral,
      appearsInServiceCities,
      serviceCityIds: appearsInServiceCities ? selectedServiceCityIds : [],
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-contain bg-background/80 px-4 py-6 backdrop-blur-sm sm:px-6">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-shop-title"
        className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 z-10 inline-flex size-8 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent"
          aria-label="إغلاق"
        >
          <X className="size-4" />
        </button>

        <div className="border-b bg-muted/20 px-6 py-5 pe-14">
          <h2 id="add-shop-title" className="text-xl font-semibold leading-7">
            {mode === "edit" ? "تعديل محل" : "إضافة محل"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            أضف بيانات المحل التي ستظهر في قائمة المحلات وربط المنتجات.
          </p>
        </div>

        <form onSubmit={submitShop} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              اسم المحل *
              <Input
                autoFocus
                dir="rtl"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="مثلا: خضار البلد"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              الفئة *
              <AppSelect
                dir="rtl"
                value={category}
                onValueChange={setCategory}
                placeholder="اختر الفئة"
                ariaLabel="اختيار الفئة"
                side="bottom"
                contentClassName="max-h-44"
                options={categories.map((category) => ({
                  value: category,
                  label: category,
                }))}
              />
            </label>

            <div className="grid gap-3 sm:col-span-2">
              <div className="text-sm font-medium">نطاق ظهور المحل *</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-4 py-3 shadow-sm transition hover:border-primary/40">
                  <span>
                    <span className="block text-sm font-semibold">يظهر في العام</span>
                    <span className="mt-1 block text-xs text-muted-foreground">القسم العام داخل التطبيق.</span>
                  </span>
                  <Switch checked={appearsInGeneral} disabled={appearsInServiceCities} onCheckedChange={setAppearsInGeneral} />
                </label>
                <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-4 py-3 shadow-sm transition hover:border-primary/40">
                  <span>
                    <span className="block text-sm font-semibold">يظهر في مدن الخدمة</span>
                    <span className="mt-1 block text-xs text-muted-foreground">اختر مدينة واحدة فقط.</span>
                  </span>
                  <Switch checked={appearsInServiceCities} disabled={appearsInGeneral} onCheckedChange={setServiceCitiesEnabled} />
                </label>
              </div>
            </div>

            {appearsInServiceCities ? (
              <div className="grid gap-3 sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">مدن الخدمة *</div>
                  <span className="text-xs text-muted-foreground">
                    {serviceCitiesLoading ? "جاري التحميل..." : `${selectedServiceCityIds.length} مدينة`}
                  </span>
                </div>
                <div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border bg-muted/10 p-2 sm:grid-cols-2">
                  {serviceCities.map((city) => {
                    const cityId = String(city.id);
                    const selected = selectedServiceCityIds.includes(cityId);

                    return (
                      <label
                        key={cityId}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-primary/40"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={selectedServiceCityIds.length > 0 && !selected}
                          onChange={() => toggleServiceCity(cityId)}
                          className="size-4 accent-primary"
                        />
                        <span>{city.name}</span>
                      </label>
                    );
                  })}
                  {!serviceCitiesLoading && serviceCities.length === 0 ? (
                    <div className="sm:col-span-2 rounded-md border border-dashed bg-background px-3 py-4 text-center text-sm text-muted-foreground">
                      لا توجد مدن خدمة نشطة من الخادم.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="sm:col-span-2 rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              {scopeDescription}
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border/70 px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={!canSave}>
              <Plus className="size-4" />
              {mode === "edit" ? "حفظ التعديل" : "حفظ المحل"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ShopIdentity({ shop }: { shop: ShopRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 py-1.5">
      <span className="flex size-[52px] shrink-0 items-center justify-center rounded-md border bg-muted/35 text-primary shadow-sm">
        <Store className="size-6" />
      </span>
      <div className="min-w-0">
        <h3 className="truncate text-[13px] font-black leading-5">{shop.name}</h3>
        <div className="mt-1">
          <span
            className={
              shop.active
                ? "rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
                : "rounded-md bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:text-red-300"
            }
          >
            {shop.active ? "نشط" : "متوقف"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ShopsPage() {
  const { apiFetch } = useAuth();
  const { cities: serviceCities, loading: serviceCitiesLoading } = useServiceCities({ activeOnly: true });
  const [currentPage, setCurrentPage] = useState(1);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [marketClassifications, setMarketClassifications] = useState<string[]>([]);
  const [marketClassificationIds, setMarketClassificationIds] = useState<
    Record<string, string | number>
  >({});
  const [addShopOpen, setAddShopOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const filteredShops = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("ar-EG");
    if (!normalizedSearch) return shops;

    return shops.filter((shop) =>
      [shop.name, shop.category, shop.branch, shop.products]
        .join(" ")
        .toLocaleLowerCase("ar-EG")
        .includes(normalizedSearch),
    );
  }, [searchTerm, shops]);
  const totalPages = Math.max(1, Math.ceil(filteredShops.length / shopsPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * shopsPageSize;
  const pagedShops = filteredShops.slice(pageStartIndex, pageStartIndex + shopsPageSize);

  useEffect(() => {
    let active = true;

    async function loadMarkets() {
      setLoading(true);
      setLoadError(null);
      try {
        const [markets, classificationsResponse] = await Promise.all([
          fetchAdminRows(apiFetch, adminApiPaths.markets, shopRowFromApi),
          apiFetch(adminApiPaths.marketClassifications),
        ]);
        const classificationsData = await readApiData(classificationsResponse);

        if (!active) return;
        setShops(markets);

        if (!classificationsResponse.ok) {
          throw new Error("تعذر تحميل تصنيفات المحلات.");
        }
        if (classificationsResponse.ok) {
          const classifications = apiList(classificationsData)
            .map((item) => String(item.name ?? "").trim())
            .filter(Boolean);
          const classificationIds = Object.fromEntries(
            apiList(classificationsData)
              .map((item) => [String(item.name ?? "").trim(), item.id])
              .filter(([name, id]) => Boolean(name) && (typeof id === "string" || typeof id === "number")),
          ) as Record<string, string | number>;
          if (classifications.length) {
            setMarketClassifications(classifications);
            setMarketClassificationIds(classificationIds);
          }
        }
      } catch (reason) {
        if (active) {
          setLoadError(reason instanceof Error ? reason.message : "تعذر تحميل المحلات.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadMarkets();

    return () => {
      active = false;
    };
  }, [apiFetch, reloadKey]);

  function classificationIdByName(name: string) {
    if (marketClassificationIds[name]) return marketClassificationIds[name];

    const index = marketClassifications.findIndex((item) => item === name);
    return index >= 0 ? index + 1 : 1;
  }

  function shopPayload(values: ShopFormValues) {
    const payload = {
      classification_id: classificationIdByName(values.category),
      name: values.name,
      scope: values.appearsInGeneral ? "general" : "service_city",
      service_city_ids: values.appearsInServiceCities
        ? values.serviceCityIds.map(Number).filter(Number.isFinite)
        : [],
      status: "active",
    };
    return payload;
  }

  async function createShop(values: ShopFormValues) {
    const payload = shopPayload(values);
    try {
      const data = await sendAdminJson(apiFetch, adminApiPaths.markets, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const createdShop = shopRowFromApi(data as BackendRecord, shops.length);
      setShops((current) => [createdShop, ...current]);
      setCurrentPage(1);
      setAddShopOpen(false);
    } catch {
      // The snackbar layer is not used on this page; keep the drawer open for correction/retry.
    }
  }

  async function updateShop(values: ShopFormValues) {
    if (!editingShop) return;

    const payload = shopPayload(values);
    try {
      const data = await sendAdminJson(
        apiFetch,
        `${adminApiPaths.markets}${encodeURIComponent(editingShop.id)}/`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
      const updatedShop = shopRowFromApi(data as BackendRecord, 0);
      setShops((current) =>
        current.map((shop) => (shop.id === editingShop.id ? updatedShop : shop)),
      );
      setEditingShop(null);
    } catch {
      // Keep the drawer open for correction/retry.
    }
  }

  async function toggleShopStatus(shop: ShopRow, active: boolean) {
    const previousShops = shops;
    setShops((currentShops) =>
      currentShops.map((currentShop) =>
        currentShop.id === shop.id ? { ...currentShop, active } : currentShop,
      ),
    );

    try {
      await sendAdminJson(
        apiFetch,
        `${adminApiPaths.markets}${encodeURIComponent(shop.id)}/`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: active ? "active" : "inactive" }),
        },
      );
    } catch {
      setShops(previousShops);
    }
  }

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
      <PageTitle
        title="المحلات"
        description="إدارة المحلات التي تظهر داخل تطبيق العملاء وربطها بالمنتجات والفئات."
        size="compact"
        className="rounded-lg border bg-card p-4 shadow-sm"
        actions={
          <Button onClick={() => setAddShopOpen(true)} className="h-9 w-full px-4 text-sm sm:w-[132px]">
            <Plus className="size-4" />
            إضافة محل
          </Button>
        }
      />

      {!loadError || shops.length > 0 ? <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3 p-4">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Store className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي المحلات</p>
              <p className="mt-1 text-xl font-bold">{shops.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3 p-4">
            <span className="flex size-10 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
              <Store className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">محلات نشطة</p>
              <p className="mt-1 text-xl font-bold">
                {shops.filter((shop) => shop.active).length}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3 p-4">
            <span className="flex size-10 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
              <MapPin className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">الفروع المغطاة</p>
              <p className="mt-1 text-xl font-bold">2</p>
            </div>
          </div>
        </Card>
      </div> : null}

      {loadError && shops.length === 0 ? (
        <div className="mt-6">
          <PageLoadError
            onRetry={() => setReloadKey((key) => key + 1)}
            retrying={loading}
          />
        </div>
      ) : null}

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-4 border-b px-6 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">كل المحلات</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              راجع حالة كل محل وعدد المنتجات المرتبطة به.
            </p>
          </div>
          <label className="flex flex-col gap-2 lg:w-80">
            <span className="text-sm leading-5">بحث</span>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="ps-9"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ابحث عن محل..."
              />
            </div>
          </label>
        </div>
        <div className="p-6 pt-4">
          <DataTable
            minWidth={1154}
            columnWidths={[84, 300, 180, 240, 120, 110, 120]}
            headers={[
              "",
              "المحل",
              "الفئة",
              "مدن الظهور",
              "المنتجات",
              <span key="status" className="block text-center">
                نشط
              </span>,
              <span key="actions" className="block text-center">
                تعديل
              </span>,
            ]}
            rows={pagedShops.map((shop, rowPosition) => [
              <span key={`index-${shop.id}`} className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                {pageStartIndex + rowPosition + 1}
              </span>,
              <ShopIdentity key={`name-${shop.id}`} shop={shop} />,
              <Badge key={`category-${shop.id}`}>{shop.category}</Badge>,
              <span key={`branch-${shop.id}`} className="text-muted-foreground">
                {shop.branch}
              </span>,
              <span key={`products-${shop.id}`}>{shop.products}</span>,
              <div key={`active-${shop.id}`} className="flex justify-center">
                <Switch
                  checked={shop.active}
                  onCheckedChange={(checked) => void toggleShopStatus(shop, checked)}
                />
              </div>,
              <div key={`edit-${shop.id}`} className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-3"
                  onClick={() => setEditingShop(shop)}
                >
                  <Edit className="size-4" />
                  تعديل
                </Button>
              </div>,
            ])}
          />
          <Pagination
            text={`عرض ${pagedShops.length} من ${filteredShops.length} نتيجة`}
            pages={`${safeCurrentPage} / ${totalPages}`}
            previousDisabled={safeCurrentPage === 1}
            nextDisabled={safeCurrentPage === totalPages}
            onPrevious={() =>
              setCurrentPage((page) => Math.max(1, Math.min(page, totalPages) - 1))
            }
            onNext={() =>
              setCurrentPage((page) =>
                Math.min(totalPages, Math.min(page, totalPages) + 1),
              )
            }
          />
        </div>
      </Card>

      {addShopOpen ? (
        <AddShopDrawer
          categories={marketClassifications}
          serviceCities={serviceCities}
          serviceCitiesLoading={serviceCitiesLoading}
          onClose={() => setAddShopOpen(false)}
          onSave={(shop) => void createShop(shop)}
        />
      ) : null}
      {editingShop ? (
        <AddShopDrawer
          categories={marketClassifications}
          initialShop={editingShop}
          serviceCities={serviceCities}
          serviceCitiesLoading={serviceCitiesLoading}
          onClose={() => setEditingShop(null)}
          onSave={(shop) => void updateShop(shop)}
        />
      ) : null}
    </div>
  );
}
