export type ProductVariant = {
  id: number;
  price: string | number;
  sku?: string | null;
  attribute_values?: unknown[];
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
