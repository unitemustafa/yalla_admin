import type { ServiceCity } from "../cities/types";
import type { MarketType } from "../market-types-api";
import type { StoreSubcategory } from "../store-subcategories-api";

export type Classification = {
  id: number;
  name: string;
  classification_type?: string;
};

type MarketScope = "general" | "service_city";

export type MarketServiceCity = Partial<ServiceCity> & {
  id?: number | string;
  name?: string | null;
};

export type Market = {
  id: number;
  name: string;
  description?: string;
  image?: string | null;
  cover_image?: string | null;
  delivery_time_min_minutes?: number | null;
  delivery_time_max_minutes?: number | null;
  scope?: MarketScope;
  status: "active" | "inactive";
  is_popular?: boolean;
  classification?: Classification;
  service_city_ids?: Array<number | string>;
  service_cities?: MarketServiceCity[];
  subcategories?: StoreSubcategory[];
  market_types?: MarketType[];
  archived_at?: string | null;
  deletion_mode?: "delete" | "archive";
};

export type MarketDraft = {
  name: string;
  description: string;
  isPopular: boolean;
  sendStoreNotification: boolean;
  classificationId: string;
  showInGeneral: boolean;
  showInServiceCities: boolean;
  selectedServiceCityIds: number[];
  deliveryTimeMin: string;
  deliveryTimeMax: string;
  selectedSubcategoryIds: number[];
  selectedMarketTypeIds: number[];
};

export type MarketPayload = {
  classification_id: number;
  name: string;
  description: string;
  delivery_time_min_minutes: number | null;
  delivery_time_max_minutes: number | null;
  is_popular: boolean;
  scope: MarketScope;
  delivery_area_ids: number[];
  service_city_ids: number[];
  subcategory_ids: number[];
  market_type_ids: number[];
  send_notification: boolean;
};
