"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, LoaderCircle, Plus, X } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { DashboardImage } from "../dashboard-image";
import { AppSelect, Button, Input, Switch } from "../primitives";
import {
  deleteMarketType,
  reorderMarketTypes,
  saveMarketType,
  type MarketType,
} from "../market-types-api";
import {
  MarketTypesList,
  type MarketTypeGroup,
} from "./market-types-list";

type Classification = { id: number; name: string };

type Draft = {
  id?: number;
  classification_id: number;
  name_ar: string;
  name_en: string;
  sort_order?: number;
  is_active: boolean;
  image: string | null;
};

export function MarketTypesManager({
  items,
  classifications,
  onChange,
  onClose,
}: {
  items: MarketType[];
  classifications: Classification[];
  onChange: (items: MarketType[]) => void;
  onClose?: () => void;
}) {
  const { apiFetch } = useAuth();
  const firstClassificationId = classifications[0]?.id ?? 0;
  const [draft, setDraft] = useState<Draft>({
    classification_id: firstClassificationId,
    name_ar: "",
    name_en: "",
    sort_order: undefined,
    is_active: true,
    image: null,
  });
  const [filterClassificationId, setFilterClassificationId] = useState<
    number | "all"
  >("all");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [reorderingClassificationId, setReorderingClassificationId] = useState<
    number | null
  >(null);
  const [formError, setFormError] = useState("");
  const [listError, setListError] = useState("");

  const groups = useMemo<MarketTypeGroup[]>(
    () =>
      classifications.map((classification) => ({
        classification,
        items: items
          .filter(
            (item) => item.classification_id === classification.id,
          )
          .slice()
          .sort(
            (first, second) =>
              first.sort_order - second.sort_order || first.id - second.id,
          ),
      })),
    [classifications, items],
  );

  useEffect(
    () => () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    },
    [imagePreview],
  );

  function reset(classificationId = draft.classification_id) {
    setDraft({
      classification_id: classificationId || firstClassificationId,
      name_ar: "",
      name_en: "",
      sort_order: undefined,
      is_active: true,
      image: null,
    });
    setImageFile(null);
    setImagePreview("");
    setFormError("");
  }

  function edit(item: MarketType) {
    setDraft(item);
    setImageFile(null);
    setImagePreview(item.image ?? "");
    setFormError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.classification_id) {
      setFormError("اختر الفئة الأساسية للمحل.");
      return;
    }
    if (!draft.name_ar.trim() || !draft.name_en.trim()) {
      setFormError("الاسم بالعربية والإنجليزية مطلوبان.");
      return;
    }
    if (!draft.id && !imageFile) {
      setFormError("الصورة الدائرية للفئة الثانوية مطلوبة.");
      return;
    }

    setBusy(true);
    setFormError("");
    try {
      const original = draft.id
        ? items.find((item) => item.id === draft.id)
        : undefined;
      const keepExistingOrder =
        original?.classification_id === draft.classification_id;
      const saved = await saveMarketType(apiFetch, {
        ...draft,
        sort_order: keepExistingOrder ? draft.sort_order : undefined,
        name_ar: draft.name_ar.trim(),
        name_en: draft.name_en.trim(),
        image: imageFile,
      });
      onChange(
        items.some((item) => item.id === saved.id)
          ? items.map((item) => (item.id === saved.id ? saved : item))
          : [...items, saved],
      );
      reset(saved.classification_id);
    } catch (reason) {
      setFormError(
        reason instanceof Error ? reason.message : "تعذر حفظ الفئة الثانوية.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: MarketType) {
    if (!window.confirm(`هل تريد حذف الفئة الثانوية «${item.name_ar}»؟`)) return;
    setBusy(true);
    setListError("");
    try {
      await deleteMarketType(apiFetch, item.id);
      onChange(items.filter((candidate) => candidate.id !== item.id));
      if (draft.id === item.id) reset(item.classification_id);
    } catch (reason) {
      setListError(
        reason instanceof Error ? reason.message : "تعذر حذف الفئة الثانوية.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function move(
    group: MarketTypeGroup,
    index: number,
    offset: -1 | 1,
  ) {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= group.items.length) return;

    const orderedItems = group.items.slice();
    [orderedItems[index], orderedItems[targetIndex]] = [
      orderedItems[targetIndex],
      orderedItems[index],
    ];

    setReorderingClassificationId(group.classification.id);
    setListError("");
    try {
      const orderedIds = await reorderMarketTypes(
        apiFetch,
        orderedItems.map((item) => item.id),
      );
      const orderById = new Map(
        orderedIds.map((itemId, itemIndex) => [itemId, itemIndex + 1]),
      );
      onChange(
        items.map((item) => ({
          ...item,
          sort_order: orderById.get(item.id) ?? item.sort_order,
        })),
      );
    } catch (reason) {
      setListError(
        reason instanceof Error
          ? reason.message
          : "تعذر حفظ ترتيب الفئات الثانوية.",
      );
    } finally {
      setReorderingClassificationId(null);
    }
  }

  function changeFilter(value: number | "all") {
    setFilterClassificationId(value);
    if (value !== "all" && !draft.id) {
      setDraft((current) => ({
        ...current,
        classification_id: value,
      }));
    }
    setListError("");
  }

  const classificationOptions = classifications.map((item) => ({
    value: String(item.id),
    label: item.name,
  }));

  return (
    <div
      className={
        onClose
          ? "fixed inset-0 z-[60] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-[1px]"
          : "mt-6"
      }
    >
      <section
        dir="rtl"
        role={onClose ? "dialog" : undefined}
        aria-modal={onClose ? true : undefined}
        className={
          onClose
            ? "flex h-[min(820px,calc(100dvh-2rem))] w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
            : "flex min-h-[620px] w-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm"
        }
      >
        <header className="flex items-start justify-between border-b bg-muted/20 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold">الفئات الثانوية للمحلات</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              اختر الفئة الأساسية أولًا، ثم أضف تحتها فئات مثل شاورما وسوشي وبرجر. ستظهر دائريًا للعملاء لتصفية المحلات.
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border p-2 hover:bg-accent"
              aria-label="إغلاق"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[390px_minmax(0,1fr)]">
          <form
            onSubmit={submit}
            className="grid content-start gap-4 border-b p-5 lg:border-b-0 lg:border-e"
          >
            <h3 className="font-bold">
              {draft.id ? "تعديل الفئة الثانوية" : "إضافة فئة ثانوية"}
            </h3>
            <p className="-mt-2 text-xs leading-5 text-muted-foreground">
              ترتيب الظهور تلقائي. بعد الحفظ يمكنك تغييره من الأسهم في القائمة.
            </p>
            <label className="grid gap-2 text-sm font-semibold">
              الفئة الأساسية للمحل *
              <AppSelect
                value={String(draft.classification_id || "")}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    classification_id: Number(value),
                  }))
                }
                options={classificationOptions}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              الاسم بالعربية *
              <Input
                value={draft.name_ar}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name_ar: event.target.value,
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              الاسم بالإنجليزية *
              <Input
                dir="ltr"
                value={draft.name_en}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name_en: event.target.value,
                  }))
                }
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-3 text-sm font-semibold">
              الفئة الثانوية نشطة
              <Switch
                checked={draft.is_active}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    is_active: checked,
                  }))
                }
              />
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 text-sm">
              {imagePreview ? (
                <DashboardImage
                  src={imagePreview}
                  alt=""
                  width={64}
                  height={64}
                  className="size-16 rounded-full"
                  imageClassName="object-cover"
                />
              ) : (
                <ImagePlus className="size-6 text-primary" />
              )}
                <span>{imageFile?.name || "اختيار صورة دائرية للفئة الثانوية *"}</span>
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }}
              />
            </label>
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                حفظ الفئة الثانوية
              </Button>
              {draft.id ? (
                <Button type="button" variant="outline" onClick={() => reset()}>
                  إلغاء التعديل
                </Button>
              ) : null}
            </div>
          </form>

          <MarketTypesList
            groups={groups}
            totalCount={items.length}
            selectedClassificationId={filterClassificationId}
            reorderingClassificationId={reorderingClassificationId}
            busy={busy}
            error={listError}
            onFilterChange={changeFilter}
            onEdit={edit}
            onRemove={(item) => void remove(item)}
            onMove={(group, index, offset) => void move(group, index, offset)}
          />
        </div>
      </section>
    </div>
  );
}
