"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { validateImageUpload } from "@/lib/image-upload";
import { mediaSpecs } from "@/lib/media-specs";
import { currentScheduleValues } from "./schedule";
import type { OfferFormState } from "./form-types";

export function initialOfferFormState(): OfferFormState {
  const schedule = currentScheduleValues();
  return {
    editingOfferId: "",
    editingOffer: null,
    markets: [],
    allProducts: [],
    appearsInGeneral: true,
    appearsInServiceCity: false,
    saving: false,
    sendPushNotification: false,
    pushSentAt: null,
    title: "",
    description: "",
    serviceCityIds: [],
    imagePreview: "",
    imageName: "",
    imageFile: null,
    imageError: "",
    selectedType: "خصم",
    discountProductId: "",
    discountVariantId: "",
    discountQuantity: 1,
    discountPercent: "20",
    flashProductIds: [],
    flashVariantId: "",
    flashQuantity: 1,
    flashDiscountPercent: "30",
    deliveryProductId: "",
    deliveryVariantId: "",
    deliveryQuantity: 1,
    announcementUrl: "",
    announcementCtaLabel: "تسوق الآن",
    announcementPriority: "0",
    announcementDisplaySeconds: "15",
    packageDiscountPercent: "15",
    bundleItems: [],
    packageProductsOpen: false,
    packageProductSearchOpen: false,
    startDate: schedule.date,
    endDate: schedule.date,
    openScheduleDate: null,
    openScheduleTime: null,
    startTime: schedule.time,
    endTime: schedule.time,
    useLimits: "",
    userLimit: "",
    serviceCityClearConfirmOpen: false,
  };
}

export function clearedProductSelection() {
  return {
    discountProductId: "",
    discountVariantId: "",
    discountQuantity: 1,
    flashProductIds: [],
    flashVariantId: "",
    flashQuantity: 1,
    deliveryProductId: "",
    deliveryVariantId: "",
    deliveryQuantity: 1,
    bundleItems: [],
    packageProductsOpen: false,
    packageProductSearchOpen: false,
  } satisfies Partial<OfferFormState>;
}

export function useOfferFormState() {
  const [state, setState] = useState<OfferFormState>(initialOfferFormState);
  const imageObjectUrlRef = useRef<string | null>(null);
  const patchState = useCallback((patch: Partial<OfferFormState>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);
  const revokeImageObjectUrl = useCallback(() => {
    if (!imageObjectUrlRef.current) return;
    URL.revokeObjectURL(imageObjectUrlRef.current);
    imageObjectUrlRef.current = null;
  }, []);
  const handleImageChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    const validationError = await validateImageUpload(file, mediaSpecs.offerBanner);
    if (validationError) {
      patchState({ imageError: validationError });
      return;
    }
    revokeImageObjectUrl();
    const preview = URL.createObjectURL(file);
    imageObjectUrlRef.current = preview;
    patchState({ imagePreview: preview, imageName: file.name, imageFile: file, imageError: "" });
  }, [patchState, revokeImageObjectUrl]);
  const removeImage = useCallback(() => {
    revokeImageObjectUrl();
    setState((current) => ({
      ...current,
      imageFile: null,
      imageError: "",
      imagePreview: current.editingOffer?.image ?? "",
      imageName: current.editingOffer?.image ? "صورة العرض الحالية" : "",
    }));
  }, [revokeImageObjectUrl]);

  useEffect(() => revokeImageObjectUrl, [revokeImageObjectUrl]);

  return {
    state,
    setState,
    patchState,
    revokeImageObjectUrl,
    handleImageChange,
    removeImage,
  };
}
