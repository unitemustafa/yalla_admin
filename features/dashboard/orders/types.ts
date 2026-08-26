import type { OrderMarketSectionLike } from "../order-display";

export type BackendOrderStatus =
  | "pending"
  | "confirmed"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "failed_delivery"
  | "cancelled";

type BackendReviewStatus = "pending_review" | "approved" | "rejected";

type BackendDeliveryType = "fixed_area" | "delivery" | "manual_quote" | string;

export type BackendAddress = {
  id: number;
  name?: string | null;
  line1?: string | null;
  street?: string | null;
  details?: string | null;
  manual_city?: string | null;
  manual_area?: string | null;
  service_city?: { id: number; name?: string | null; name_ar?: string | null } | null;
  service_city_id?: number | string | null;
  delivery_area?: { id: number; name?: string | null; delivery_price?: string | null } | null;
  delivery_area_id?: number | string | null;
  delivery_type?: BackendDeliveryType | null;
  fulfillment_type?: "direct" | "external_shipping" | string | null;
  address_type?: "apartment" | "house" | "office" | string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  building_name?: string | null;
  apartment_number?: string | null;
  floor?: string | null;
  company_name?: string | null;
  additional_instructions?: string | null;
  formatted_address?: string | null;
  delivery_price_preview?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  is_default?: boolean | null;
};

export type BackendOrder = {
  id: number;
  user_id?: number | string | null;
  delivery_address_id?: number | string | null;
  assigned_representative_id?: number | string | null;
  market_id?: number | string | null;
  order_number?: string | null;
  market?: { id: number; name?: string | null; branch?: string | null } | null;
  customer?: {
    id: number;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  } | null;
  delivery_address?: BackendAddress | null;
  shipping_company_id?: number | string | null;
  shipping_company?: {
    id?: number | string | null;
    name?: string | null;
    logo_url?: string | null;
  } | null;
  assigned_representative?: {
    id: number;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    avatar?: string | null;
    avatar_url?: string | null;
    service_city_id?: number | string | null;
    service_city?: { id: number; name?: string | null; name_ar?: string | null } | null;
    is_available?: boolean | null;
    vehicle_type?: string | null;
    plate_number?: string | null;
  } | null;
  history?: BackendOrderEvent[];
  allowed_statuses?: BackendOrderStatus[];
  payment_method?: string | null;
  delivery_type?: BackendDeliveryType | null;
  fulfillment_type?: "direct" | "external_shipping" | string | null;
  external_shipping_status?:
    | "not_required"
    | "pending_quote"
    | "awaiting_customer_approval"
    | "quoted"
    | string
    | null;
  eta_min_minutes?: number | null;
  eta_max_minutes?: number | null;
  delivery_price_status?:
    | "fixed"
    | "pending_quote"
    | "awaiting_customer_approval"
    | string
    | null;
  service_city?: { id: number; name?: string | null; name_ar?: string | null } | null;
  service_city_id?: number | string | null;
  delivery_area?: { id: number; name?: string | null; delivery_price?: string | null } | null;
  delivery_area_id?: number | string | null;
  custom_delivery_area?: string | null;
  delivery_label?: string | null;
  order_scope?: "general" | "service_city" | string | null;
  is_multi_market?: boolean | null;
  market_count?: number | string | null;
  market_names_summary?: string | null;
  market_sections?: OrderMarketSectionLike[] | null;
  grouped_items?: unknown;
  grouped_offers?: unknown;
  pickup_stops?: Array<{
    market_id?: number | string | null;
    market?: {
      id?: number | string | null;
      name?: string | null;
      branch?: string | null;
      status?: string | null;
    } | null;
    pickup_status?: string | null;
    picked_up_at?: string | null;
    sort_order?: number | string | null;
  }> | null;
  has_offer?: boolean | null;
  offer_titles?: string[] | null;
  discount?: string | null;
  description?: string | null;
  image?: string | null;
  delivery_note?: string | null;
  delivery_proof?: string | null;
  status: BackendOrderStatus;
  review_status?: BackendReviewStatus | string | null;
  delivery_price?: string | null;
  subtotal_price?: string | null;
  multi_market_fee_rate?: string | null;
  multi_market_fee?: string | null;
  total_price?: string | null;
  assigned_at?: string | null;
  delivered_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  items?: BackendOrderItem[];
  offers?: BackendOrderOffer[];
};

export type BackendOrderEvent = {
  id?: number | string | null;
  event_type?: string | null;
  from_status?: BackendOrderStatus | null;
  to_status?: BackendOrderStatus | null;
  actor?: {
    id?: number | string | null;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  } | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type BackendOrderItem = {
  id: number;
  section_id?: number | string | null;
  variant_id?: number | string | null;
  quantity: number;
  unit_price: string;
  subtotal?: string | number | null;
  product_name?: string | null;
  variant_name?: string | null;
  product?: {
    id?: number | string | null;
    name?: string | null;
    description?: string | null;
    image?: string | null;
  } | null;
  variant?: {
    id: number;
    price?: string;
    sku?: string;
    product?: {
      id: number;
      name?: string;
      market?: { id: number; name?: string };
    };
  } | null;
};

export type BackendOrderOffer = {
  id?: number | string | null;
  section_id?: number | string | null;
  offer_id?: number | string | null;
  title?: string | null;
  offer_title?: string | null;
  discount_amount?: string | null;
  created_at?: string | null;
  offer?: {
    id?: number | string | null;
    title?: string | null;
    description?: string | null;
    type?: string | null;
    discount?: string | number | null;
  } | null;
};

type BackendServiceCityRef = {
  id?: number | string | null;
  name?: string | null;
  name_ar?: string | null;
};

type BackendDeliveryAreaRef = {
  id?: number | string | null;
  name?: string | null;
  service_city_id?: number | string | null;
  service_city?: BackendServiceCityRef | null;
  delivery_price?: string | number | null;
};

export type BackendVariantAttribute = {
  attribute?: { name?: string | null } | null;
  option?: { value?: string | null } | null;
  value?: string | null;
};

export type BackendProduct = {
  id: number;
  name: string;
  market_id?: number | string | null;
  market?: { id?: number | string | null; name?: string | null } | null;
  category?: { id: number; name?: string | null; type?: string | null } | null;
  is_available?: boolean;
  variants?: Array<{
    id: number | string;
    price: string | number;
    sku?: string | null;
    name?: string | null;
    label?: string | null;
    attribute_values?: BackendVariantAttribute[] | null;
  }>;
};

export type BackendProductVariant = NonNullable<BackendProduct["variants"]>[number];

export type BackendMarket = {
  id: number;
  name?: string | null;
  branch?: string | null;
  scope?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  service_city_ids?: Array<number | string>;
  service_cities?: BackendServiceCityRef[];
  delivery_area_ids?: Array<number | string>;
  deliveryAreaIds?: Array<number | string>;
  delivery_areas?: Array<number | string | BackendDeliveryAreaRef>;
};

export type BackendOffer = {
  id: number;
  title?: string | null;
  type?: string | null;
  discount?: string | number | null;
  discount_amount?: string | number | null;
  status?: string | null;
  show_in_general?: boolean | null;
  scope?: string | null;
  service_city_id?: number | string | null;
  service_city?: BackendServiceCityRef | null;
  service_city_ids?: Array<number | string>;
  service_cities?: BackendServiceCityRef[];
  market_id?: number | string | null;
  market?: {
    id?: number | string | null;
    name?: string | null;
    scope?: string | null;
  } | null;
  product_ids?: Array<number | string>;
  products?: Array<{
    id?: number | string | null;
    market_id?: number | string | null;
    market?: { id?: number | string | null; scope?: string | null } | null;
  }>;
};

export type RepresentativeOption = {
  id: string;
  name: string;
  phone?: string | null;
};

export type OrderLineDraft = {
  id: string;
  variantId: string;
  quantity: string;
  unitPrice: string;
};

type OrderOfferDraft = {
  id: string;
  offerId: string;
};

export type MarketSectionDraft = {
  id: string;
  marketId: string;
  lines: OrderLineDraft[];
  offers: OrderOfferDraft[];
};

export type ProductVariantOption = {
  id: string;
  productId: number;
  productName: string;
  variantLabel: string;
  categoryName: string;
  marketId?: number;
  marketName: string;
  sku?: string | null;
  label: string;
  price: number;
  available: boolean;
};

export type OrderCreatePayload = {
  user_id: number;
  delivery_address_id: number;
  market_id?: number;
  service_city_id?: number;
  payment_method: string;
  description: string;
  delivery_note: string;
  items: Array<{ variant_id: number; quantity: number }>;
  offers: Array<{ offer_id: number }>;
  market_order?: number[];
};
