"use client";

import { useMemo } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { useServiceCities } from "../cities/use-service-cities";
import { useSnackbar } from "../snackbar";
import {
  clampDiscountPercent,
  marketsForOfferScope,
  packagePricing,
  productsForMarkets,
  selectedItemFrom,
} from "./form-domain";
import { useOfferFormState } from "./form-state";
import { useOfferFormData } from "./use-offer-form-data";
import { useOfferProductActions } from "./use-offer-product-actions";
import { useSaveOffer } from "./use-save-offer";

export function useCreateOfferForm() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { cities, loading: citiesLoading } = useServiceCities();
  const formState = useOfferFormState();
  const { state, setState, patchState } = formState;

  useOfferFormData({
    apiFetch,
    setState,
    revokeImageObjectUrl: formState.revokeImageObjectUrl,
    showSnackbar,
  });

  const scopeMarkets = useMemo(() => marketsForOfferScope(state), [state]);
  const products = useMemo(
    () => productsForMarkets(state.allProducts, scopeMarkets),
    [scopeMarkets, state.allProducts],
  );
  const pricing = useMemo(
    () => packagePricing(state.bundleItems, products, state.packageDiscountPercent),
    [products, state.bundleItems, state.packageDiscountPercent],
  );
  const packageProducts = state.bundleItems
    .map((line) => selectedItemFrom(products, line.itemId))
    .filter((item) => Boolean(item));
  const packageProductNames = packageProducts
    .map((item) => item?.name ?? "")
    .filter(Boolean)
    .slice(0, 3)
    .join("، ");
  const packageMarkets = Array.from(new Map(
    state.bundleItems
      .map((line) => selectedItemFrom(state.allProducts, line.itemId))
      .filter((item) => Boolean(item?.marketId))
      .map((item) => [String(item?.marketId), item?.shopName || `محل #${item?.marketId}`]),
  ));
  const actions = useOfferProductActions({
    state,
    setState,
    offerProducts: products,
    showSnackbar,
  });
  const saveOffer = useSaveOffer({
    apiFetch,
    state,
    setState,
    offerProducts: products,
    marketsForScope: scopeMarkets,
    showSnackbar,
  });

  function setScheduleDateOpen(field: "start" | "end", open: boolean) {
    patchState({ openScheduleDate: open ? field : null, ...(open ? { openScheduleTime: null } : {}) });
  }
  function setScheduleTimeOpen(field: "start" | "end", open: boolean) {
    patchState({ openScheduleTime: open ? field : null, ...(open ? { openScheduleDate: null } : {}) });
  }

  return {
    state,
    setState,
    patchState,
    products,
    cities,
    citiesLoading,
    scopeMarkets,
    pricing,
    packageProductNames,
    packageMarketNames: packageMarkets.map(([, name]) => name).join("، "),
    packageMarketCount: packageMarkets.length,
    discountRate: clampDiscountPercent(Number(state.discountPercent) || 0),
    flashDiscountRate: clampDiscountPercent(Number(state.flashDiscountPercent) || 0),
    handleImageChange: formState.handleImageChange,
    removeImage: formState.removeImage,
    setScheduleDateOpen,
    setScheduleTimeOpen,
    saveOffer,
    ...actions,
  };
}

export type CreateOfferFormController = ReturnType<typeof useCreateOfferForm>;
