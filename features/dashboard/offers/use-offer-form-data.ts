"use client";

import { useEffect } from "react";

import {
  adminApiPaths,
  apiList,
  fetchAdminRows,
  readApiData,
  type ApiFetch,
} from "../admin-api";
import { productsPath } from "../products/api";
import { productRowFromApi } from "../products/normalizers";
import { asRecord } from "../shared/api-data";
import { offerMarketFromApi, type OfferMarket } from "./domain";
import { offerFormPatchFromApi } from "./form-normalizers";
import { initialOfferFormState } from "./form-state";
import type { SetOfferFormState } from "./form-types";

type ShowSnackbar = (input: { message: string; tone?: "success" | "danger" }) => void;

export function useOfferFormData({
  apiFetch,
  setState,
  revokeImageObjectUrl,
  showSnackbar,
}: {
  apiFetch: ApiFetch;
  setState: SetOfferFormState;
  revokeImageObjectUrl: () => void;
  showSnackbar: ShowSnackbar;
}) {
  useEffect(() => {
    let active = true;
    const offerId = new URLSearchParams(window.location.search).get("edit") ?? "";
    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      if (!offerId) {
        revokeImageObjectUrl();
        setState((current) => ({
          ...initialOfferFormState(),
          markets: current.markets,
          allProducts: current.allProducts,
        }));
        return;
      }
      setState((current) => ({ ...current, editingOfferId: offerId }));
    }, 0);

    void apiFetch(adminApiPaths.markets)
      .then(async (response) => {
        const data = await readApiData(response);
        if (!response.ok) throw new Error("تعذر تحميل الأسواق.");
        if (!active) return;
        const markets = apiList(data)
          .map(offerMarketFromApi)
          .filter((market): market is OfferMarket => Boolean(market));
        setState((current) => ({ ...current, markets }));
      })
      .catch((error: unknown) => {
        if (active) showSnackbar({
          message: error instanceof Error ? error.message : "تعذر تحميل الأسواق.",
          tone: "danger",
        });
      });

    void fetchAdminRows(apiFetch, productsPath, productRowFromApi)
      .then((allProducts) => {
        if (active) setState((current) => ({ ...current, allProducts }));
      })
      .catch((error: unknown) => {
        if (active) showSnackbar({
          message: error instanceof Error ? error.message : "تعذر تحميل المنتجات.",
          tone: "danger",
        });
      });

    if (offerId) {
      void apiFetch(`${adminApiPaths.offers}${encodeURIComponent(offerId)}/`)
        .then(async (response) => {
          const data = await readApiData(response);
          const record = asRecord(data);
          if (!response.ok || !record) {
            throw new Error("تعذر تحميل بيانات العرض.");
          }
          if (!active) return;
          setState((current) => ({
            ...current,
            editingOfferId: offerId,
            ...offerFormPatchFromApi(record),
          }));
        })
        .catch((error: unknown) => {
          if (active) showSnackbar({
            message: error instanceof Error ? error.message : "تعذر تحميل العرض.",
            tone: "danger",
          });
        });
    }

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [apiFetch, revokeImageObjectUrl, setState, showSnackbar]);
}
