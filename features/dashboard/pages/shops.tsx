"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Plus, Search, Store, X } from "lucide-react";

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
import { categoryRows } from "../data";

const initialShopRows: ShopRow[] = [
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

function AddShopDrawer({
  categories,
  onClose,
  onSave,
}: {
  categories: string[];
  onClose: () => void;
  onSave: (shop: ShopRow) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const canSave = name.trim() && category.trim();

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

  function submitShop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    onSave({
      id: `shop-${Date.now()}`,
      name: name.trim(),
      category: category.trim(),
      branch: "",
      products: "0",
      active: true,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-background/80 px-4 py-6 backdrop-blur-sm sm:px-6">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-shop-title"
        className="relative w-full max-w-2xl overflow-hidden rounded-xl border bg-background shadow-2xl"
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
            إضافة محل
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            أضف بيانات المحل التي ستظهر في قائمة المحلات وربط المنتجات.
          </p>
        </div>

        <form onSubmit={submitShop}>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
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
                side="top"
                contentClassName="max-h-44"
                options={categories.map((category) => ({
                  value: category,
                  label: category,
                }))}
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/70 px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={!canSave}>
              <Plus className="size-4" />
              حفظ المحل
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
  const [currentPage, setCurrentPage] = useState(1);
  const [shops, setShops] = useState(initialShopRows);
  const [searchTerm, setSearchTerm] = useState("");
  const [marketClassifications, setMarketClassifications] = useState<string[]>(
    () => categoryRows.map((row) => row.name),
  );
  const [marketClassificationIds, setMarketClassificationIds] = useState<
    Record<string, string | number>
  >({});
  const [addShopOpen, setAddShopOpen] = useState(false);
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
      try {
        const [markets, classificationsResponse] = await Promise.all([
          fetchAdminRows(apiFetch, adminApiPaths.markets, shopRowFromApi),
          apiFetch(adminApiPaths.marketClassifications),
        ]);
        const classificationsData = await readApiData(classificationsResponse);

        if (!active) return;
        setShops(markets);

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
      } catch {
        // Keep seed rows visible when the backend is unavailable.
      }
    }

    void loadMarkets();

    return () => {
      active = false;
    };
  }, [apiFetch]);

  function classificationIdByName(name: string) {
    if (marketClassificationIds[name]) return marketClassificationIds[name];

    const index = marketClassifications.findIndex((item) => item === name);
    return index >= 0 ? index + 1 : 1;
  }

  async function createShop(shop: ShopRow) {
    const payload = {
      classification_id: classificationIdByName(shop.category),
      name: shop.name,
      status: "active",
    };
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

      <div className="mt-8 grid gap-4 md:grid-cols-3">
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
      </div>

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
            minWidth={980}
            columnWidths={[84, 300, 180, 240, 120, 110]}
            headers={[
              "",
              "المحل",
              "الفئة",
              "مدن الظهور",
              "المنتجات",
              <span key="status" className="block text-center">
                نشط
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
          onClose={() => setAddShopOpen(false)}
          onSave={(shop) => void createShop(shop)}
        />
      ) : null}
    </div>
  );
}
