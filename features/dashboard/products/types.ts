export type ProductTheme = "clothing" | "consumer" | "other";

export type ProductRecord = Record<string, unknown>;

export type ProductVariant = {
  id: number;
  price: string | number;
  sku?: string | null;
  attribute_values?: unknown[];
};

type NormalizedProductVariant = ProductRecord & {
  id?: number | string | null;
  price?: string | number | null;
  sku?: string | null;
  attribute_values?: unknown[];
  selections?: unknown[];
};

export type NormalizedProductAttributeOption = {
  id?: number | null;
  client_id?: string;
  value: string;
  sort_order?: number;
};

export type NormalizedProductAttribute = {
  id?: number | null;
  client_id?: string;
  name: string;
  sort_order?: number;
  options: NormalizedProductAttributeOption[];
};

export type NormalizedProductImage = {
  id: number;
  image: string | null;
  url: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type NormalizedProduct = {
  id: number;
  name: string;
  description: string;
  marketId: number | null;
  market: ProductRecord | null;
  categoryId: number | null;
  category: ProductRecord | null;
  subcategoryId: number | null;
  subcategory: ProductRecord | null;
  subcategoryIds: number[];
  subcategories: ProductRecord[];
  theme: ProductTheme;
  isPopular: boolean;
  image: string | null;
  images: NormalizedProductImage[];
  discount: string | number;
  isAvailable: boolean;
  archivedAt: string | null;
  deletionMode: "delete" | "archive";
  additions: number[];
  attributes: NormalizedProductAttribute[];
  variants: NormalizedProductVariant[];
  createdAt: string;
  updatedAt: string;
};

export type ProductAttributeValuePayload = {
  id?: number;
  attribute_id: number;
  option_id: number;
};

type ProductVariantSelectionPayload =
  | {
      attribute_id: number;
      option_id: number;
    }
  | {
      attribute_client_id: string;
      option_client_id: string;
    };

export type ProductVariantPayload = {
  id?: number;
  price: string;
  sku?: string;
  selections: ProductVariantSelectionPayload[];
};

export type ProductWritePayload = {
  market_id?: number;
  subcategory_id?: number;
  subcategory_ids?: number[];
  theme?: ProductTheme;
  is_popular?: boolean;
  is_available?: boolean;
  name?: string;
  description?: string;
  discount?: string;
  additions?: number[];
  attributes?: NormalizedProductAttribute[];
  attribute_values?: ProductAttributeValuePayload[];
  variants?: ProductVariantPayload[];
};

export type ProductNotificationDispatchResult = {
  dispatchId: number | null;
  requestId: string;
  status: string;
  recipientCount: number;
  notificationCount: number;
  sentAt: string;
  suppressedByMarketNotification: boolean;
  marketName: string;
};

export type ItemRow = {
  index: string;
  id: string;
  code?: string;
  image: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  marketId?: string;
  marketCategoryId?: string;
  shopName?: string;
  scopeLabel?: string;
  calories: string;
  price: string;
  displayPrice?: number;
  displayPriceLabel?: string;
  discountPercent?: number;
  variants?: ProductVariant[];
  variantDetails?: string;
  visibilityMode?: "general" | "regions";
  regionSlugs?: string[];
  regionNames?: string[];
  featured: string;
  active: boolean;
  archived?: boolean;
  deletionMode?: "delete" | "archive";
};
