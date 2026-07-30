"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { MarketTypesManager } from "../components/market-types-manager";
import { PageLoadError } from "../load-error-card";
import {
  loadMarketClassifications,
  type MarketClassification,
} from "../market-classifications-api";
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
          : "تعذر تحميل تصنيفات المحلات.",
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
        title="تصنيفات المحلات داخل الفئات"
        description="اختر فئة رئيسية مثل المطاعم، ثم أضف التصنيفات التابعة لها مثل برجر أو شاورما."
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
            هذه التصنيفات يجب أن تتبع فئة رئيسية. افتح «فئات المحلات
            الرئيسية» من قسم الفئات وأنشئ الفئة أولًا.
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
