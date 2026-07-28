"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, ImagePlus, LoaderCircle, Plus, Trash2, X } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { DashboardImage } from "../dashboard-image";
import { AppSelect, Button, Input, Switch } from "../primitives";
import {
  deleteMarketType,
  saveMarketType,
  type MarketType,
} from "../market-types-api";

type Classification = { id: number; name: string };

type Draft = {
  id?: number;
  classification_id: number;
  name_ar: string;
  name_en: string;
  sort_order: number;
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
  onClose: () => void;
}) {
  const { apiFetch } = useAuth();
  const firstClassificationId = classifications[0]?.id ?? 0;
  const [draft, setDraft] = useState<Draft>({
    classification_id: firstClassificationId,
    name_ar: "",
    name_en: "",
    sort_order: 0,
    is_active: true,
    image: null,
  });
  const [filterClassificationId, setFilterClassificationId] =
    useState(firstClassificationId);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const visibleItems = useMemo(
    () =>
      items
        .filter((item) => item.classification_id === filterClassificationId)
        .slice()
        .sort(
          (first, second) =>
            first.sort_order - second.sort_order || first.id - second.id,
        ),
    [filterClassificationId, items],
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
      sort_order: 0,
      is_active: true,
      image: null,
    });
    setImageFile(null);
    setImagePreview("");
    setError("");
  }

  function edit(item: MarketType) {
    setDraft(item);
    setFilterClassificationId(item.classification_id);
    setImageFile(null);
    setImagePreview(item.image ?? "");
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.classification_id) {
      setError("اختر الفئة الرئيسية.");
      return;
    }
    if (!draft.name_ar.trim() || !draft.name_en.trim()) {
      setError("الاسم بالعربية والإنجليزية مطلوبان.");
      return;
    }
    if (!draft.id && !imageFile) {
      setError("صورة نوع المحل مطلوبة.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const saved = await saveMarketType(apiFetch, {
        ...draft,
        name_ar: draft.name_ar.trim(),
        name_en: draft.name_en.trim(),
        image: imageFile,
      });
      onChange(
        items.some((item) => item.id === saved.id)
          ? items.map((item) => (item.id === saved.id ? saved : item))
          : [...items, saved],
      );
      setFilterClassificationId(saved.classification_id);
      reset(saved.classification_id);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذر حفظ نوع المحل.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: MarketType) {
    if (!window.confirm(`هل تريد حذف نوع المحل «${item.name_ar}»؟`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteMarketType(apiFetch, item.id);
      onChange(items.filter((candidate) => candidate.id !== item.id));
      if (draft.id === item.id) reset(item.classification_id);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذر حذف نوع المحل.",
      );
    } finally {
      setBusy(false);
    }
  }

  const classificationOptions = classifications.map((item) => ({
    value: String(item.id),
    label: item.name,
  }));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-[1px]">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        className="flex h-[min(820px,calc(100dvh-2rem))] w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
      >
        <header className="flex items-start justify-between border-b bg-muted/20 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold">إدارة أنواع المحلات</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              مثل برجر وبيتزا ومشويات؛ وهي مستقلة عن أقسام المنتجات داخل المحل.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border p-2 hover:bg-accent"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[390px_minmax(0,1fr)]">
          <form
            onSubmit={submit}
            className="grid content-start gap-4 border-b p-5 lg:border-b-0 lg:border-e"
          >
            <h3 className="font-bold">
              {draft.id ? "تعديل النوع" : "إنشاء نوع جديد"}
            </h3>
            <label className="grid gap-2 text-sm font-semibold">
              الفئة الرئيسية *
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
            <label className="grid gap-2 text-sm font-semibold">
              ترتيب الظهور
              <Input
                type="number"
                min={0}
                value={draft.sort_order}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    sort_order: Math.max(0, Number(event.target.value) || 0),
                  }))
                }
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-3 text-sm font-semibold">
              النوع نشط
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
              <span>{imageFile?.name || "اختيار صورة دائرية *"}</span>
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
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                حفظ النوع
              </Button>
              {draft.id ? (
                <Button type="button" variant="outline" onClick={() => reset()}>
                  إلغاء التعديل
                </Button>
              ) : null}
            </div>
          </form>

          <div className="min-w-0 p-5">
            <div className="mb-4 max-w-xs">
              <AppSelect
                value={String(filterClassificationId || "")}
                onValueChange={(value) => setFilterClassificationId(Number(value))}
                options={classificationOptions}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleItems.map((item) => (
                <article
                  key={item.id}
                  className="flex min-w-0 items-center gap-3 rounded-lg border p-3"
                >
                  <DashboardImage
                    src={item.image}
                    alt=""
                    width={64}
                    height={64}
                    className="size-16 shrink-0 rounded-full bg-muted"
                    imageClassName="object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold">{item.name_ar}</p>
                      <span className="text-xs text-muted-foreground">
                        #{item.sort_order}
                      </span>
                    </div>
                    <p dir="ltr" className="truncate text-xs text-muted-foreground">
                      {item.name_en}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.market_count} محل ·{" "}
                      {item.is_active ? "نشط" : "معطل"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => edit(item)}
                      aria-label="تعديل"
                    >
                      <Edit3 className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void remove(item)}
                      aria-label="حذف"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </article>
              ))}
              {!visibleItems.length ? (
                <p className="text-sm text-muted-foreground">
                  لا توجد أنواع لهذه الفئة بعد.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
