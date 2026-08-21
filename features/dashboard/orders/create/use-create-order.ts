"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/auth-provider";
import { isAbortError } from "@/lib/auth";
import { apiListData } from "../../shared/api-data";
import { useSnackbar } from "../../snackbar";
import {
  apiResponseData,
  isBackendDashboardUser,
  type BackendDashboardUser,
} from "../../users/api-users";
import { numberValue, notifyDashboardOrdersChanged } from "../../order-display";
import { apiOrderData, orderApiError } from "../api";
import {
  buildOrderPayload,
  buildVariantOptions,
  customerSearchText,
  draftLineId,
  draftOfferId,
  emptyMarketSection,
  filterMarketsForAddress,
  filterProductsForMarket,
  isGeneralAddress,
  marketLabel,
  marketSectionHasContent,
  validateOrderDraft,
  type OrderDraftContext,
} from "../create-domain";
import { deliveryFeeLabel, money } from "../formatters";
import type {
  BackendAddress,
  BackendMarket,
  BackendOffer,
  BackendProduct,
  MarketSectionDraft,
  OrderLineDraft,
} from "../types";

type PickerTarget = { sectionId: string; lineId: string };
type AvailabilityFilter = "all" | "available" | "unavailable";

export function useCreateOrder() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const [users, setUsers] = useState<BackendDashboardUser[]>([]);
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [markets, setMarkets] = useState<BackendMarket[]>([]);
  const [offers, setOffers] = useState<BackendOffer[]>([]);
  const [addresses, setAddresses] = useState<BackendAddress[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [marketSections, setMarketSections] = useState<MarketSectionDraft[]>([]);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [createAddressOpen, setCreateAddressOpen] = useState(false);
  const [addressName, setAddressName] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [description, setDescription] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productAvailabilityFilter, setProductAvailabilityFilter] =
    useState<AvailabilityFilter>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialDataControllerRef = useRef<AbortController | null>(null);

  const loadInitialData = useCallback(async () => {
    initialDataControllerRef.current?.abort();
    const controller = new AbortController();
    initialDataControllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const responses = await Promise.all([
        apiFetch("auth/users/", { signal: controller.signal }),
        apiFetch("catalog/products/", { signal: controller.signal }),
        apiFetch("home/markets/", { signal: controller.signal }),
        apiFetch("offers/", { signal: controller.signal }),
      ]);
      const data = await Promise.all(responses.map(apiResponseData));
      const failureMessages = [
        "تعذر تحميل العملاء.",
        "تعذر تحميل المنتجات.",
        "تعذر تحميل المحلات.",
        "تعذر تحميل العروض.",
      ];
      const failedIndex = responses.findIndex((response) => !response.ok);
      if (failedIndex >= 0) {
        throw new Error(orderApiError(data[failedIndex], failureMessages[failedIndex]));
      }
      if (controller.signal.aborted) return;
      setUsers(
        apiListData<BackendDashboardUser>(data[0])
          .filter(isBackendDashboardUser)
          .filter((user) => user.role === "client"),
      );
      setProducts(apiListData<BackendProduct>(data[1]));
      setMarkets(apiListData<BackendMarket>(data[2]));
      setOffers(apiListData<BackendOffer>(data[3]));
    } catch (reason) {
      if (isAbortError(reason)) return;
      setError(reason instanceof Error ? reason.message : "تعذر تحميل بيانات إنشاء الطلب.");
    } finally {
      if (initialDataControllerRef.current === controller) {
        initialDataControllerRef.current = null;
        setLoading(false);
      }
    }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadInitialData(), 0);
    return () => {
      window.clearTimeout(timer);
      initialDataControllerRef.current?.abort();
    };
  }, [loadInitialData]);

  const variants = useMemo(() => buildVariantOptions(products, markets), [markets, products]);
  const selectedCustomer = useMemo(
    () => users.find((user) => String(user.id) === selectedUser) ?? null,
    [selectedUser, users],
  );
  const selectedAddressRecord = useMemo(
    () => addresses.find((address) => String(address.id) === selectedAddress) ?? null,
    [addresses, selectedAddress],
  );
  const eligibleMarkets = useMemo(
    () => filterMarketsForAddress(markets, selectedAddressRecord),
    [markets, selectedAddressRecord],
  );
  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    return query ? users.filter((user) => customerSearchText(user).includes(query)) : users;
  }, [customerQuery, users]);

  const nonEmptySections = marketSections.filter(marketSectionHasContent);
  const selectedMarketRecords = nonEmptySections
    .map((section) => eligibleMarkets.find((market) => String(market.id) === section.marketId))
    .filter((market): market is BackendMarket => Boolean(market));
  const selectedProductLines = marketSections.flatMap((section) =>
    section.lines.filter((line) => line.variantId).map((line) => ({ section, line })),
  );
  const selectedOfferLines = marketSections.flatMap((section) =>
    section.offers.filter((offer) => offer.offerId).map((offer) => ({ section, offer })),
  );
  const subtotal = selectedProductLines.reduce((sum, { line }) => {
    const variant = variants.find((item) => item.id === line.variantId);
    return sum + (variant?.price ?? 0) * Math.max(1, Number(line.quantity) || 1);
  }, 0);

  const draftContext: OrderDraftContext = {
    selectedUser,
    selectedAddress,
    selectedAddressRecord,
    selectedCustomer,
    marketSections,
    markets,
    eligibleMarkets,
    variants,
    offers,
    paymentMethod,
    description,
    deliveryNote,
  };
  const validationMessage = validateOrderDraft(draftContext);
  const deliveryAmount = selectedAddressRecord
    ? numberValue(
        selectedAddressRecord.delivery_price_preview ??
          selectedAddressRecord.delivery_area?.delivery_price,
      ) ?? 0
    : 0;

  const activePickerSection = pickerTarget
    ? marketSections.find((section) => section.id === pickerTarget.sectionId) ?? null
    : null;
  const activePickerMarket = activePickerSection?.marketId
    ? eligibleMarkets.find((market) => String(market.id) === activePickerSection.marketId) ?? null
    : null;
  const activePickerVariantIds = useMemo(() => {
    const productIds = new Set(
      filterProductsForMarket(products, activePickerSection?.marketId ?? "").map(
        (product) => product.id,
      ),
    );
    return new Set(
      variants.filter((variant) => productIds.has(variant.productId)).map((variant) => variant.id),
    );
  }, [activePickerSection?.marketId, products, variants]);
  const productCategories = useMemo(
    () =>
      [...new Set(
        variants
          .filter((variant) => activePickerVariantIds.has(variant.id))
          .map((variant) => variant.categoryName),
      )].filter(Boolean).sort((first, second) => first.localeCompare(second, "ar")),
    [activePickerVariantIds, variants],
  );
  const filteredVariants = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return variants.filter((variant) => {
      if (!activePickerVariantIds.has(variant.id)) return false;
      const matchesQuery = !query || [variant.productName, variant.variantLabel, variant.sku, variant.marketName, variant.categoryName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
      const matchesCategory = productCategoryFilter === "all" || variant.categoryName === productCategoryFilter;
      const matchesAvailability = productAvailabilityFilter === "all" ||
        (productAvailabilityFilter === "available" ? variant.available : !variant.available);
      return matchesQuery && matchesCategory && matchesAvailability;
    });
  }, [activePickerVariantIds, productAvailabilityFilter, productCategoryFilter, productQuery, variants]);

  function resetProductPicker() {
    setPickerTarget(null);
    setProductQuery("");
    setProductCategoryFilter("all");
    setProductAvailabilityFilter("all");
  }

  async function loadAddresses(userId: string) {
    setSelectedAddress("");
    setAddresses([]);
    setMarketSections([]);
    resetProductPicker();
    if (!userId) return;
    const response = await apiFetch(`addresses/?user_id=${encodeURIComponent(userId)}`);
    const data = await apiResponseData(response);
    if (!response.ok) {
      showSnackbar({ message: orderApiError(data, "تعذر تحميل عناوين العميل."), tone: "danger" });
      return;
    }
    const rows = apiListData<BackendAddress>(data);
    setAddresses(rows);
    setSelectedAddress(rows[0]?.id ? String(rows[0].id) : "");
  }

  function selectCustomer(userId: string) {
    setSelectedUser(userId);
    setCustomerPickerOpen(false);
    setCustomerQuery("");
    setCreateAddressOpen(false);
    setAddressName("");
    void loadAddresses(userId);
  }

  async function createAddress() {
    if (!selectedUser || !addressName.trim()) return;
    setSavingAddress(true);
    try {
      const response = await apiFetch("addresses/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(selectedUser),
          name: addressName.trim(),
          isDefault: addresses.length === 0,
        }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(orderApiError(data, "تعذر إضافة عنوان العميل."));
      const rows = apiListData<BackendAddress>(data);
      setAddresses(rows);
      setSelectedAddress(rows[0]?.id ? String(rows[0].id) : "");
      setMarketSections([]);
      resetProductPicker();
      setCreateAddressOpen(false);
      setAddressName("");
      showSnackbar({ message: "تمت إضافة عنوان العميل.", tone: "success" });
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر إضافة عنوان العميل.", tone: "danger" });
    } finally {
      setSavingAddress(false);
    }
  }

  function selectAddress(addressId: string) {
    setSelectedAddress(addressId);
    setMarketSections([]);
    resetProductPicker();
  }

  function addMarketSection() {
    if (!selectedAddressRecord) return showSnackbar({ message: "اختر عنوان التوصيل", tone: "danger" });
    if (marketSections.some((section) => !section.marketId && !section.lines.length && !section.offers.length)) {
      return showSnackbar({ message: "أكمل القسم الفارغ الحالي قبل إضافة محل آخر.", tone: "danger" });
    }
    if (marketSections.length >= eligibleMarkets.length) {
      return showSnackbar({ message: "لا توجد محلات متاحة أخرى لهذا العنوان.", tone: "danger" });
    }
    setMarketSections((current) => [...current, emptyMarketSection()]);
  }

  function removeMarketSection(sectionId: string) {
    setMarketSections((current) => current.filter((section) => section.id !== sectionId));
    if (pickerTarget?.sectionId === sectionId) resetProductPicker();
  }

  function updateSectionMarket(sectionId: string, marketId: string) {
    if (marketSections.some((section) => section.id !== sectionId && section.marketId === marketId)) {
      return showSnackbar({ message: "هذا المحل مضاف بالفعل", tone: "danger" });
    }
    setMarketSections((current) => current.map((section) =>
      section.id === sectionId ? { ...section, marketId, lines: [], offers: [] } : section,
    ));
    if (pickerTarget?.sectionId === sectionId) resetProductPicker();
  }

  function marketOptionsForSection(sectionId: string) {
    const used = new Set(marketSections.filter((section) => section.id !== sectionId).map((section) => section.marketId).filter(Boolean));
    return eligibleMarkets.map((market) => ({ value: String(market.id), label: marketLabel(market), disabled: used.has(String(market.id)) }));
  }

  function addLine(sectionId: string) {
    const section = marketSections.find((item) => item.id === sectionId);
    if (!section?.marketId) return showSnackbar({ message: "اختر المحل أولاً.", tone: "danger" });
    setMarketSections((current) => current.map((item) => item.id === sectionId
      ? { ...item, lines: [...item.lines, { id: draftLineId(), variantId: "", quantity: "1", unitPrice: "" }] }
      : item));
  }

  function updateLine(sectionId: string, lineId: string, patch: Partial<OrderLineDraft>) {
    setMarketSections((current) => current.map((section) => section.id === sectionId
      ? { ...section, lines: section.lines.map((line) => line.id === lineId ? { ...line, ...patch } : line) }
      : section));
  }

  function removeLine(sectionId: string, lineId: string) {
    setMarketSections((current) => current.map((section) => section.id === sectionId
      ? { ...section, lines: section.lines.filter((line) => line.id !== lineId) }
      : section));
    if (pickerTarget?.sectionId === sectionId && pickerTarget.lineId === lineId) resetProductPicker();
  }

  function addOffer(sectionId: string) {
    const section = marketSections.find((item) => item.id === sectionId);
    if (!section?.marketId) return showSnackbar({ message: "اختر المحل أولاً.", tone: "danger" });
    setMarketSections((current) => current.map((item) => item.id === sectionId
      ? { ...item, offers: [...item.offers, { id: draftOfferId(), offerId: "" }] }
      : item));
  }

  function updateOffer(sectionId: string, offerLineId: string, offerId: string) {
    setMarketSections((current) => current.map((section) => section.id === sectionId
      ? { ...section, offers: section.offers.map((offer) => offer.id === offerLineId ? { ...offer, offerId } : offer) }
      : section));
  }

  function removeOffer(sectionId: string, offerLineId: string) {
    setMarketSections((current) => current.map((section) => section.id === sectionId
      ? { ...section, offers: section.offers.filter((offer) => offer.id !== offerLineId) }
      : section));
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const draftError = validateOrderDraft(draftContext);
    if (draftError) return showSnackbar({ message: draftError, tone: "danger" });
    const payload = buildOrderPayload(draftContext);
    if (!payload) return showSnackbar({ message: "أكمل بيانات الطلب قبل الحفظ.", tone: "danger" });
    setSaving(true);
    try {
      const response = await apiFetch("orders/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(orderApiError(data, "تعذر إنشاء الطلب."));
      const createdOrder = apiOrderData(Array.isArray(data) ? data[0] : data) ?? apiOrderData(data);
      if (!createdOrder?.id) throw new Error("تم إنشاء الطلب لكن استجابة الباك غير مكتملة.");
      let orderForToast = createdOrder;
      let detailLoaded = false;
      try {
        const detailResponse = await apiFetch(`orders/${encodeURIComponent(String(createdOrder.id))}/`);
        const detailData = await apiResponseData(detailResponse);
        const detailOrder = detailResponse.ok ? apiOrderData(detailData) : null;
        if (detailOrder) {
          orderForToast = detailOrder;
          detailLoaded = true;
        }
      } catch {
        detailLoaded = false;
      }
      notifyDashboardOrdersChanged(createdOrder.id);
      showSnackbar({ message: detailLoaded ? `تم إنشاء الطلب. الإجمالي ${money(orderForToast.total_price)}، التوصيل ${deliveryFeeLabel(orderForToast)}.` : "تم إنشاء الطلب، وسيتم تحميل تفاصيله من صفحة الطلب.", tone: "success" });
      router.push(`/orders/view/${createdOrder.id}`);
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر إنشاء الطلب.", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  return {
    activePickerMarket, activePickerSection, activePickerVariantIds, addLine, addMarketSection,
    addOffer, addressName, addresses, createAddress, createAddressOpen, customerPickerOpen,
    customerQuery, deliveryNote, eligibleMarkets, error, filteredCustomers, filteredVariants,
    isGeneralAddress: selectedAddressRecord ? isGeneralAddress(selectedAddressRecord) : false,
    loadInitialData, loading, marketOptionsForSection, marketSections, offers, paymentMethod,
    pickerTarget, productAvailabilityFilter, productCategories, productCategoryFilter, productQuery,
    removeLine, removeMarketSection, removeOffer, resetProductPicker, saving, savingAddress,
    selectAddress, selectCustomer, selectedAddress, selectedAddressRecord, selectedCustomer,
    selectedMarketRecords, selectedOfferLines, selectedProductLines, selectedUser, setAddressName,
    setCreateAddressOpen, setCustomerPickerOpen, setCustomerQuery, setDeliveryNote, setDescription,
    setPaymentMethod, setPickerTarget, setProductAvailabilityFilter, setProductCategoryFilter,
    setProductQuery, submitOrder, subtotal, summaryTotal: subtotal + deliveryAmount,
    updateLine, updateOffer, updateSectionMarket, users, validationMessage, variants, description,
  };
}
