"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Plus, RefreshCw } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { StoreSubcategoriesManager } from "../components/store-subcategories-manager";
import { PageLoadError } from "../load-error-card";
import { Button, Card, PageTitle } from "../primitives";
import {
  loadStoreSubcategories,
  type StoreSubcategory,
} from "../store-subcategories-api";

export function StoreSubcategoriesPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<StoreSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setItems(await loadStoreSubcategories(apiFetch));
    } catch (reason) {
      setLoadError(
        reason instanceof Error
          ? reason.message
          : "تعذر تحميل أقسام المنتجات.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div dir="rtl" className="px-6 py-6">
      <PageTitle
        title="أقسام المنتجات"
        description="أقسام نصية لتنظيم المنتجات داخل المحل، مثل الوجبات والمشروبات والحلويات، وهي مستقلة عن فئات المحلات."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 text-sm"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
              تحديث
            </Button>
            <Button
              type="button"
              className="h-9 px-4 text-sm"
              onClick={() => setCreateOpen(true)}
              disabled={loading || Boolean(loadError)}
            >
              <Plus className="size-4" />
              إضافة قسم
            </Button>
          </div>
        }
      />

      {loading ? (
        <Card className="mt-6 flex min-h-72 items-center justify-center">
          <LoaderCircle className="size-7 animate-spin text-primary" />
        </Card>
      ) : loadError ? (
        <div className="mt-6">
          <PageLoadError onRetry={() => void load()} />
        </div>
      ) : (
        <StoreSubcategoriesManager
          items={items}
          onChange={setItems}
          createOpen={createOpen}
          onCreateClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}
