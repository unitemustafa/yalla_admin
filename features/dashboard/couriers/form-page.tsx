"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/auth-provider";
import type { ServiceCity } from "../cities/types";
import { Card } from "../primitives";
import { useSnackbar } from "../snackbar";
import type { BackendDashboardUser } from "../users/api-users";
import { loadCourierFormData } from "./api";
import { CourierForm } from "./courier-form";

export function CourierFormPage({ courierId }: { courierId?: string }) {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [courier, setCourier] = useState<BackendDashboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadCourierFormData(apiFetch, courierId);
        setCities(data.cities);
        setCourier(data.courier);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "تعذر تحميل صفحة المندوب.");
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [apiFetch, courierId]);

  if (loading) return <div className="flex min-h-80 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  if (error) return <div className="mx-auto max-w-3xl px-6 py-8"><Card className="p-6 text-destructive"><AlertCircle className="me-2 inline size-5" />{error}</Card></div>;
  return <CourierForm cities={cities} courier={courierId ? courier : null} onClose={() => router.push("/delivery/couriers")} onSaved={() => { showSnackbar({ message: "تم حفظ بيانات المندوب.", tone: "success" }); router.push("/delivery/couriers"); }} />;
}
