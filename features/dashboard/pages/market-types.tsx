"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { MarketTypesManager } from "../components/market-types-manager";
import { PageLoadError } from "../load-error-card";
import { loadMarketClassifications } from "../market-classifications/api";
import type { MarketClassification } from "../market-classifications/types";
import { loadMarketTypes, type MarketType } from "../market-types-api";
import { Button, Card, PageTitle } from "../primitives";

export function MarketTypesPage() {
  const { apiFetch } = useAuth();
  const [classifications, setClassifications] = useState<
    MarketClassification[]
  >([]);
  const [items, setItems] = useState<MarketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [loadedClassifications, loadedItems] = await Promise.all([
        loadMarketClassifications(apiFetch),
        loadMarketTypes(apiFetch),
      ]);
      setClassifications(loadedClassifications);
      setItems(loadedItems);
    } catch (reason) {
      setLoadError(
        reason instanceof Error
          ? reason.message
          : "تعذر تحميل الفئات الثانوية للمحلات.",
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
        title="الفئات الثانوية للمحلات"
        description="اختر الفئة الأساسية مثل مطاعم، ثم أضف تحتها فئات ثانوية مثل برجر أو شاورما لتصفية المحلات داخل التطبيق."
        actions={
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
      ) : classifications.length === 0 ? (
        <Card className="mt-6 flex min-h-72 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="font-bold">أضف فئة محلات رئيسية أولًا</p>
          <p className="max-w-xl text-sm text-muted-foreground">
            الفئة الثانوية يجب أن تتبع فئة أساسية. افتح «الفئات الأساسية
            للمحلات» من قسم الفئات وأنشئها أولًا.
          </p>
        </Card>
      ) : (
        <MarketTypesManager
          items={items}
          classifications={classifications}
          onChange={setItems}
        />
      )}
    </div>
  );
}
