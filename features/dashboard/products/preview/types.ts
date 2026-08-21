import type { ProductAttributeValuePayload, ProductTheme } from "../types";

export type ProductLivePreviewMarket = {
  id: string;
  name: string;
  branch?: string;
};

export type ProductLivePreviewOption = {
  id?: number;
  clientId?: string;
  attributeId?: number;
  attributeClientId?: string;
  colorHex?: string;
  isActive?: boolean;
  value: string;
};

export type ProductLivePreviewAttribute = {
  id?: number;
  clientId?: string;
  name: string;
  options: ProductLivePreviewOption[];
};

export type ProductLivePreviewAddition = {
  id: string;
  name: string;
  price: string;
};

export type ProductLivePreviewVariant = {
  tempId: string;
  price: string;
  sku?: string;
  attributeValues: ProductAttributeValuePayload[];
  selections?: Array<{
    attributeId?: number;
    optionId?: number;
    attributeClientId?: string;
    optionClientId?: string;
  }>;
};

export type PreviewAttributeChoice = {
  attribute: ProductLivePreviewAttribute;
  options: ProductLivePreviewOption[];
};

export type ProductLivePreviewProps = {
  additions: ProductLivePreviewAddition[];
  attributes: ProductLivePreviewAttribute[];
  description: string;
  discount: string;
  imageSrc: string | null;
  isAvailable: boolean;
  isPopular: boolean;
  markets: ProductLivePreviewMarket[];
  name: string;
  previewSource: "api" | "draft";
  selectedAdditionIds: number[];
  selectedMarketId: string;
  theme: ProductTheme;
  variantRows: ProductLivePreviewVariant[];
};
