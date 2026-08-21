"use client";

import type { ItemRow } from "../products/types";
import { offerTypeOptions, type ArabicOfferType } from "./domain";
import {
  defaultVariantId,
  selectedItemFrom,
  selectedOfferItems,
} from "./form-domain";
import { clearedProductSelection } from "./form-state";
import type { BundleLine, OfferFormState, SetOfferFormState } from "./form-types";

type ShowSnackbar = (input: {
  message: string;
  tone?: "success" | "danger" | "info" | "notification";
}) => void;

export function useOfferProductActions({
  state,
  setState,
  offerProducts,
  showSnackbar,
}: {
  state: OfferFormState;
  setState: SetOfferFormState;
  offerProducts: ItemRow[];
  showSnackbar: ShowSnackbar;
}) {
  function clearProducts() {
    setState((current) => ({ ...current, ...clearedProductSelection() }));
  }

  function clearProductsWithReason() {
    if (selectedOfferItems(state, offerProducts).length) {
      showSnackbar({
        message: "تم مسح المنتجات المختارة لأن السوق أو مدن الظهور تغيرت. اختر منتجات متوافقة من السوق الحالي.",
      });
    }
    clearProducts();
  }

  function setGeneralEnabled(enabled: boolean) {
    setState((current) => ({
      ...current,
      appearsInGeneral: enabled,
      ...(enabled ? { appearsInServiceCity: false, serviceCityIds: [] } : {}),
      ...clearedProductSelection(),
    }));
    if (selectedOfferItems(state, offerProducts).length) {
      showSnackbar({
        message: "تم مسح المنتجات المختارة لأن السوق أو مدن الظهور تغيرت. اختر منتجات متوافقة من السوق الحالي.",
      });
    }
  }

  function setServiceCityEnabled(enabled: boolean) {
    if (!enabled && state.serviceCityIds.length) {
      setState((current) => ({ ...current, serviceCityClearConfirmOpen: true }));
      return;
    }
    setState((current) => ({
      ...current,
      appearsInServiceCity: enabled,
      ...(enabled ? { appearsInGeneral: false } : { serviceCityIds: [] }),
      ...clearedProductSelection(),
    }));
    if (selectedOfferItems(state, offerProducts).length) {
      showSnackbar({
        message: "تم مسح المنتجات المختارة لأن السوق أو مدن الظهور تغيرت. اختر منتجات متوافقة من السوق الحالي.",
      });
    }
  }

  function confirmClearServiceCities() {
    setState((current) => ({
      ...current,
      appearsInServiceCity: false,
      serviceCityIds: [],
      serviceCityClearConfirmOpen: false,
      ...clearedProductSelection(),
    }));
    if (selectedOfferItems(state, offerProducts).length) {
      showSnackbar({
        message: "تم مسح المنتجات المختارة لأن السوق أو مدن الظهور تغيرت. اختر منتجات متوافقة من السوق الحالي.",
      });
    }
  }

  function changeCity(cityId: string) {
    const nextCityIds = state.serviceCityIds.includes(cityId) ? [] : [cityId];
    if (state.selectedType === "باكج" && nextCityIds.length) {
      const validMarketIds = new Set(
        state.markets
          .filter((market) => market.status === "active" && market.scope === "service_city")
          .filter((market) => market.serviceCityIds.some((id) => Number(id) === Number(cityId)))
          .map((market) => market.id),
      );
      const kept = state.bundleItems.filter((line) => {
        const product = state.allProducts.find((item) => item.id === line.itemId);
        return Boolean(product?.marketId && validMarketIds.has(String(product.marketId)));
      });
      if (kept.length !== state.bundleItems.length) {
        showSnackbar({
          message: `تم حذف ${state.bundleItems.length - kept.length} منتج غير صالح لمدينة الخدمة الجديدة.`,
        });
      }
      setState((current) => ({ ...current, serviceCityIds: nextCityIds, bundleItems: kept }));
      return;
    }
    setState((current) => ({
      ...current,
      serviceCityIds: nextCityIds,
      ...clearedProductSelection(),
    }));
    if (selectedOfferItems(state, offerProducts).length) {
      showSnackbar({
        message: "تم مسح المنتجات المختارة لأن السوق أو مدن الظهور تغيرت. اختر منتجات متوافقة من السوق الحالي.",
      });
    }
  }

  function selectType(nextType: ArabicOfferType) {
    if (offerTypeOptions.find((option) => option.label === nextType)?.disabled) {
      showSnackbar({ message: "نوع الإعلان معطل حاليا.", tone: "danger" });
      return;
    }
    setState((current) => ({ ...current, selectedType: nextType }));
  }

  function addBundleProduct(itemId: string) {
    const item = offerProducts.find((product) => product.id === itemId);
    if (!item) return;
    setState((current) => {
      const existing = current.bundleItems.find((line) => line.itemId === itemId);
      const bundleItems = existing
        ? current.bundleItems.map((line) => line.id === existing.id
            ? { ...line, quantity: Math.min(line.quantity + 1, 99) }
            : line)
        : [...current.bundleItems, {
            id: `bundle-${itemId}-${Date.now()}`,
            itemId,
            variantId: defaultVariantId(item),
            quantity: 1,
            applyProductDiscount: true,
          }];
      return {
        ...current,
        bundleItems,
        packageProductsOpen: true,
        packageProductSearchOpen: false,
      };
    });
    showSnackbar({ message: `تم إضافة ${item.name} للباكج.` });
  }

  function updateBundleLine(lineId: string, patch: Partial<BundleLine>) {
    setState((current) => ({
      ...current,
      bundleItems: current.bundleItems.map((line) => line.id === lineId
        ? {
            ...line,
            ...patch,
            variantId: patch.itemId && patch.itemId !== line.itemId
              ? defaultVariantId(selectedItemFrom(offerProducts, patch.itemId))
              : (patch.variantId ?? line.variantId),
            quantity: Math.max(1, Math.min(99, patch.quantity ?? line.quantity)),
          }
        : line),
    }));
  }

  function removeBundleLine(lineId: string) {
    const line = state.bundleItems.find((item) => item.id === lineId);
    const product = line ? selectedItemFrom(offerProducts, line.itemId) : null;
    setState((current) => ({
      ...current,
      bundleItems: current.bundleItems.filter((item) => item.id !== lineId),
    }));
    if (product) {
      showSnackbar({ message: `تم حذف ${product.name} من الباكج.`, tone: "danger" });
    }
  }

  return {
    clearProducts,
    clearProductsWithReason,
    setGeneralEnabled,
    setServiceCityEnabled,
    confirmClearServiceCities,
    changeCity,
    selectType,
    addBundleProduct,
    updateBundleLine,
    removeBundleLine,
  };
}
