"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { validateImageUpload } from "@/lib/image-upload";
import { mediaSpecs } from "@/lib/media-specs";
import type { ServiceCity } from "../cities/types";
import type { MarketType } from "../market-types-api";
import { saveMarket } from "./api";
import {
  createMarketDraft,
  marketDraftCanSubmit,
  marketPayload,
  serviceCityName,
  validateMarketDraft,
} from "./domain";
import type { Classification, Market, MarketDraft } from "./types";

export function useMarketForm({
  market,
  serviceCities,
  classifications,
  marketTypes,
  onSaved,
}: {
  market?: Market;
  serviceCities: ServiceCity[];
  classifications: Classification[];
  marketTypes: MarketType[];
  onSaved: (market: Market, notificationRequested: boolean) => void;
}) {
  const { apiFetch } = useAuth();
  const [draft, setDraft] = useState(() => createMarketDraft(market, classifications, marketTypes));
  const [imagePreview, setImagePreview] = useState(market?.image ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState(market?.image ? "صورة المحل الحالية" : "");
  const [coverPreview, setCoverPreview] = useState(market?.cover_image ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverName, setCoverName] = useState(market?.cover_image ? "صورة الغلاف الحالية" : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editing = Boolean(market);
  const canSubmit = marketDraftCanSubmit(draft, {
    editing,
    hasImage: Boolean(imagePreview),
    hasCover: Boolean(coverPreview),
  });

  const availableMarketTypes = useMemo(() => {
    const selected = new Set(draft.selectedMarketTypeIds);
    return marketTypes.filter((item) =>
      item.classification_id === Number(draft.classificationId) &&
      (item.is_active || selected.has(item.id)),
    );
  }, [draft.classificationId, draft.selectedMarketTypeIds, marketTypes]);

  const availableServiceCities = useMemo(() => {
    const cities = new Map<number, Pick<ServiceCity, "id" | "name" | "is_active">>();
    for (const city of serviceCities) {
      if (city.is_active) cities.set(city.id, city);
    }
    if (Array.isArray(market?.service_cities)) {
      for (const city of market.service_cities) {
        const id = Number(city.id);
        if (Number.isFinite(id) && city.name) {
          cities.set(id, { id, name: city.name, is_active: city.is_active !== false });
        }
      }
    }
    return Array.from(cities.values());
  }, [market, serviceCities]);

  function update<K extends keyof MarketDraft>(key: K, value: MarketDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function changeClassification(value: string) {
    setDraft((current) => ({
      ...current,
      classificationId: value,
      selectedMarketTypeIds: current.selectedMarketTypeIds.filter((id) =>
        marketTypes.some((item) => item.id === id && item.classification_id === Number(value)),
      ),
    }));
  }

  function toggleMarketType(id: number) {
    update("selectedMarketTypeIds", draft.selectedMarketTypeIds.includes(id)
      ? draft.selectedMarketTypeIds.filter((item) => item !== id)
      : [...draft.selectedMarketTypeIds, id]);
  }

  function setGeneralVisibility(enabled: boolean) {
    setDraft((current) => ({
      ...current,
      showInGeneral: enabled,
      ...(enabled ? { showInServiceCities: false, selectedServiceCityIds: [] } : {}),
    }));
    setError("");
  }

  function setServiceCityVisibility(enabled: boolean) {
    setDraft((current) => ({
      ...current,
      showInServiceCities: enabled,
      ...(enabled ? { showInGeneral: false } : { selectedServiceCityIds: [] }),
    }));
    setError("");
  }

  function toggleServiceCity(cityId: number) {
    update("selectedServiceCityIds", draft.selectedServiceCityIds.includes(cityId) ? [] : [cityId]);
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    const validationError = await validateImageUpload(file, mediaSpecs.storeLogo);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
    setImageFile(file);
    setImageName(file.name);
    setError("");
  }

  function removeSelectedImage() {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImagePreview(market?.image ?? "");
    setImageFile(null);
    setImageName(market?.image ? "صورة المحل الحالية" : "");
  }

  async function handleCoverChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    const validationError = await validateImageUpload(file, mediaSpecs.storeCover);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverPreview(URL.createObjectURL(file));
    setCoverFile(file);
    setCoverName(file.name);
    setError("");
  }

  function removeSelectedCover() {
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverPreview(market?.cover_image ?? "");
    setCoverFile(null);
    setCoverName(market?.cover_image ? "صورة الغلاف الحالية" : "");
  }

  useEffect(() => () => {
    if (imageFile && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    if (coverFile && coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
  }, [coverFile, coverPreview, imageFile, imagePreview]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const validationError = validateMarketDraft(draft, {
      editing,
      hasImage: Boolean(imagePreview),
      hasCover: Boolean(coverPreview),
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    const payload = marketPayload(draft, editing);
    try {
      onSaved(await saveMarket(apiFetch, market, payload, imageFile, coverFile), payload.send_notification);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ المحل.");
    } finally {
      setSaving(false);
    }
  }

  return {
    draft,
    update,
    editing,
    saving,
    error,
    canSubmit,
    imagePreview,
    imageName,
    coverPreview,
    coverName,
    availableMarketTypes,
    availableServiceCities,
    changeClassification,
    toggleMarketType,
    setGeneralVisibility,
    setServiceCityVisibility,
    toggleServiceCity,
    handleImageChange,
    removeSelectedImage,
    handleCoverChange,
    removeSelectedCover,
    serviceCityName,
    submit,
  };
}
