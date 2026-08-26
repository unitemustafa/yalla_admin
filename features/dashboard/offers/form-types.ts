import type { Dispatch, SetStateAction } from "react";

import type { ItemRow } from "../products/types";
import type { ArabicOfferType, OfferCard, OfferMarket, OfferType } from "./domain";

export type BundleLine = {
  id: string;
  itemId: string;
  variantId?: string;
  quantity: number;
  applyProductDiscount?: boolean;
};

export type OfferFormState = {
  editingOfferId: string;
  editingOffer: OfferCard | null;
  markets: OfferMarket[];
  allProducts: ItemRow[];
  appearsInGeneral: boolean;
  appearsInServiceCity: boolean;
  saving: boolean;
  sendPushNotification: boolean;
  pushSentAt: string | null;
  title: string;
  description: string;
  serviceCityIds: string[];
  imagePreview: string;
  imageName: string;
  imageFile: File | null;
  imageError: string;
  selectedType: ArabicOfferType;
  discountProductId: string;
  discountVariantId: string;
  discountQuantity: number;
  discountPercent: string;
  flashProductIds: string[];
  flashVariantId: string;
  flashQuantity: number;
  flashDiscountPercent: string;
  deliveryProductId: string;
  deliveryVariantId: string;
  deliveryQuantity: number;
  announcementUrl: string;
  announcementCtaLabel: string;
  announcementPriority: string;
  announcementDisplaySeconds: string;
  packageDiscountPercent: string;
  bundleItems: BundleLine[];
  packageProductsOpen: boolean;
  packageProductSearchOpen: boolean;
  startDate: string;
  endDate: string;
  openScheduleDate: "start" | "end" | null;
  openScheduleTime: "start" | "end" | null;
  startTime: string;
  endTime: string;
  useLimits: string;
  userLimit: string;
  serviceCityClearConfirmOpen: boolean;
};

export type SetOfferFormState = Dispatch<SetStateAction<OfferFormState>>;

type OfferPayloadItem = {
  variant_id: number;
  quantity: number;
  apply_product_discount: boolean;
};

export type OfferPayload = {
  market_id?: number;
  show_in_general: boolean;
  service_city_ids: number[];
  product_ids: number[];
  items: OfferPayloadItem[];
  title: string;
  description: string;
  type: OfferType;
  discount: string;
  start_time: string;
  end_time: string;
  active_days: [];
  use_limits: number | null;
  user_limit: number | null;
  announcement_url: string;
  announcement_cta_label: string;
  announcement_priority: number;
  announcement_display_seconds: number;
  send_push_notification: boolean;
};
