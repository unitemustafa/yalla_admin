"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, LoaderCircle, Plus, X } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { validateImageUpload } from "@/lib/image-upload";
import { mediaSpecHint, mediaSpecs } from "@/lib/media-specs";
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
import { useLockedPageScroll } from "../market-classifications/use-locked-page-scroll";

type Classification = { id: number; name: string };

type Draft = {
  id?: number;
  classification_id: number;
  name_ar: string;
  sort_order?: number;
  is_active: boolean;
  image: string | null;
};

export function MarketTypesManager({
  items,
  classifications,
  onChange,
  createOpen,
  onCreateClose,
}: {
  items: MarketType[];
  classifications: Classification[];
  onChange: (items: MarketType[]) => void;
  createOpen: boolean;
  onCreateClose: () => void;
}) {
  const { apiFetch } = useAuth();
  const firstClassificationId = classifications[0]?.id ?? 0;
  const [draft, setDraft] = useState<Draft>({
    classification_id: firstClassificationId,
    name_ar: "",
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
      sort_order: undefined,
      is_active: true,
      image: null,
    });
    setImageFile(null);
    setImagePreview("");
    setFormError("");
  }

  function closeEditor(classificationId = draft.classification_id) {
    reset(classificationId);
    onCreateClose();
  }

  function edit(item: MarketType) {
    setDraft(item);
    setImageFile(null);
    setImagePreview(item.image ?? "");
    setFormError("");
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    const validationError = await validateImageUpload(file, mediaSpecs.marketType);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFormError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.classification_id) {
      setFormError("اختر الفئة الأساسية للمحل.");
      return;
    }
    if (!draft.name_ar.trim()) {
      setFormError("الاسم مطلوب.");
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
        image: imageFile,
      });
      onChange(
        items.some((item) => item.id === saved.id)
          ? items.map((item) => (item.id === saved.id ? saved : item))
          : [...items, saved],
      );
      closeEditor(saved.classification_id);
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

  const editorOpen = createOpen || draft.id !== undefined;
  useLockedPageScroll(editorOpen);

  return (
    <div className="mt-6">
      <section
        dir="rtl"
        className="w-full overflow-hidden rounded-xl border bg-background shadow-sm"
      >
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
      </section>

      {editorOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-[1px]">
          <form
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="market-type-editor-title"
            onSubmit={submit}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b bg-muted/20 px-6 py-4">
              <div>
                <h2 id="market-type-editor-title" className="text-xl font-bold">
                  {draft.id ? "تعديل الفئة الثانوية" : "إضافة فئة ثانوية"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  اختر الفئة الأساسية وأدخل بيانات الفئة الثانوية. يمكنك ترتيبها بعد الحفظ من القائمة.
                </p>
              </div>
              <button
                type="button"
                onClick={() => closeEditor()}
                className="rounded-full border p-2 hover:bg-accent"
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
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
              <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
                الاسم *
                <Input
                  autoFocus
                  value={draft.name_ar}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name_ar: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-3 text-sm font-semibold sm:col-span-2">
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
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 text-sm sm:col-span-2">
                {imagePreview ? (
                  <DashboardImage
                    src={imagePreview}
                    alt=""
                    width={64}
                    height={64}
                    className="size-16 rounded-full"
                    imageClassName="object-contain p-1"
                  />
                ) : (
                  <ImagePlus className="size-6 text-primary" />
                )}
                <span>{imageFile?.name || (draft.id ? "تغيير صورة الفئة الثانوية" : "اختيار صورة دائرية للفئة الثانوية *")}</span>
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => void handleImageChange(event)}
                />
              </label>
              <p className="-mt-2 text-xs text-muted-foreground sm:col-span-2">{mediaSpecHint(mediaSpecs.marketType)}</p>
              {formError ? (
                <p className="text-sm text-destructive sm:col-span-2">{formError}</p>
              ) : null}
            </div>

            <footer className="flex justify-end gap-2 border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={() => closeEditor()}>
                إلغاء
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {draft.id ? "حفظ التعديلات" : "إضافة الفئة"}
              </Button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}
