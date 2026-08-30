"use client";

import { useState } from "react";
import { Edit3, Layers3, LoaderCircle, Plus, Trash2, X } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { ConfirmDeleteDialog } from "../confirm-delete-dialog";
import { useLockedPageScroll } from "../market-classifications/use-locked-page-scroll";
import { Button, Input, Switch } from "../primitives";
import {
  deleteStoreSubcategory,
  saveStoreSubcategory,
  type StoreSubcategory,
} from "../store-subcategories-api";

type Draft = {
  id?: number;
  name_ar: string;
  description_ar: string;
  is_active: boolean;
};

const emptyDraft: Draft = {
  name_ar: "",
  description_ar: "",
  is_active: true,
};

export function StoreSubcategoriesManager({
  items,
  onChange,
  onClose,
  createOpen = false,
  onCreateClose,
}: {
  items: StoreSubcategory[];
  onChange: (items: StoreSubcategory[]) => void;
  onClose?: () => void;
  createOpen?: boolean;
  onCreateClose?: () => void;
}) {
  const { apiFetch } = useAuth();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [deleteCandidate, setDeleteCandidate] = useState<StoreSubcategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);

  function edit(item: StoreSubcategory) {
    setDraft({
      id: item.id,
      name_ar: item.name_ar,
      description_ar: item.description_ar,
      is_active: item.is_active,
    });
    setError("");
  }

  function reset() {
    setDraft(emptyDraft);
    setError("");
  }

  function closeEditor() {
    reset();
    setInternalCreateOpen(false);
    onCreateClose?.();
  }

  function openEditor() {
    reset();
    setInternalCreateOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name_ar.trim()) {
      setError("الاسم مطلوب.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await saveStoreSubcategory(apiFetch, {
        ...draft,
        name_ar: draft.name_ar.trim(),
        description_ar: draft.description_ar.trim(),
      });
      onChange(
        items.some((item) => item.id === saved.id)
          ? items.map((item) => item.id === saved.id ? saved : item)
          : [saved, ...items],
      );
      closeEditor();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ الفئة.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleteCandidate) return;
    const item = deleteCandidate;
    setBusy(true);
    setError("");
    try {
      const result = await deleteStoreSubcategory(apiFetch, item.id);
      if (result.action === "archived") {
        onChange(
          items.map((candidate) =>
            candidate.id === item.id
              ? { ...candidate, is_active: false }
              : candidate,
          ),
        );
      } else {
        onChange(items.filter((candidate) => candidate.id !== item.id));
        if (draft.id === item.id) reset();
      }
      setDeleteCandidate(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حذف الفئة.");
      setDeleteCandidate(null);
    } finally {
      setBusy(false);
    }
  }

  const editorOpen = createOpen || internalCreateOpen || draft.id !== undefined;
  useLockedPageScroll(editorOpen || Boolean(onClose));

  return (
    <div className={onClose ? "fixed inset-0 z-[60] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-[1px]" : "mt-6"}>
      <section
        dir="rtl"
        role={onClose ? "dialog" : undefined}
        aria-modal={onClose ? true : undefined}
        className={onClose ? "flex h-[min(860px,calc(100dvh-2rem))] w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl" : "w-full overflow-hidden rounded-xl border bg-background shadow-sm"}
      >
        <header className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/20 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold">إدارة أقسام المنتجات</h2>
            <p className="mt-1 text-sm text-muted-foreground">أقسام نصية مشتركة لتنظيم المنتجات داخل المحلات، ولا تحتاج إلى صور.</p>
          </div>
          {onClose ? (
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={openEditor}>
                <Plus className="size-4" />
                إضافة قسم
              </Button>
              <button type="button" onClick={onClose} className="rounded-full border p-2 hover:bg-accent" aria-label="إغلاق"><X className="size-4" /></button>
            </div>
          ) : null}
        </header>
        <div className="min-w-0 overflow-y-auto p-5">
          {error && !editorOpen ? (
            <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="flex min-w-0 items-center gap-3 rounded-lg border p-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Layers3 className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><p className="truncate font-bold">{item.name_ar}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${item.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{item.is_active ? "نشطة" : "معطلة"}</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.market_count} محل · {item.product_count} منتج</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" size="icon" variant="outline" onClick={() => edit(item)} aria-label="تعديل"><Edit3 className="size-4" /></Button>
                  <Button type="button" size="icon" variant="outline" disabled={busy} onClick={() => setDeleteCandidate(item)} aria-label="حذف"><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </article>
            ))}
            {!items.length ? <p className="text-sm text-muted-foreground">لا توجد أقسام منتجات بعد.</p> : null}
          </div>
        </div>
      </section>

      {editorOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-[1px]">
          <form
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-subcategory-editor-title"
            onSubmit={submit}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b bg-muted/20 px-6 py-4">
              <div>
                <h2 id="store-subcategory-editor-title" className="text-xl font-bold">{draft.id ? "تعديل القسم" : "إضافة قسم جديد"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">أدخل اسم القسم، ويمكنك إضافة وصف اختياري.</p>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-full border p-2 hover:bg-accent" aria-label="إغلاق"><X className="size-4" /></button>
            </header>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold sm:col-span-2">الاسم *<Input autoFocus value={draft.name_ar} onChange={(event) => setDraft((value) => ({ ...value, name_ar: event.target.value }))} /></label>
              <label className="grid gap-2 text-sm font-semibold sm:col-span-2">الوصف<textarea className="min-h-24 rounded-md border bg-input px-3 py-2 text-sm" value={draft.description_ar} onChange={(event) => setDraft((value) => ({ ...value, description_ar: event.target.value }))} /></label>
              <label className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-3 text-sm font-semibold sm:col-span-2">القسم نشط<Switch checked={draft.is_active} onCheckedChange={(checked) => setDraft((value) => ({ ...value, is_active: checked }))} /></label>
              {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
            </div>
            <footer className="flex justify-end gap-2 border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={closeEditor}>إلغاء</Button>
              <Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{draft.id ? "حفظ التعديلات" : "إضافة القسم"}</Button>
            </footer>
          </form>
        </div>
      ) : null}

      {deleteCandidate ? (
        <ConfirmDeleteDialog
          title="حذف قسم المنتج"
          description={`هل تريد حذف قسم «${deleteCandidate.name_ar}»؟ إذا كان مستخدمًا فسيتم أرشفته وتعطيله بدلًا من حذفه نهائيًا.`}
          busy={busy}
          confirmLabel="تأكيد الحذف"
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={() => void remove()}
        />
      ) : null}
    </div>
  );
}
