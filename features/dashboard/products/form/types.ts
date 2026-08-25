import type { StoreSubcategory } from "../../store-subcategories-api";
import type { ProductTheme } from "../types";

export type CatalogMarket = {
  id: string;
  name: string;
  branch: string;
  status: string;
  scope: string;
  serviceCities: string[];
  subcategories: StoreSubcategory[];
};

export type ProductAdditionChoice = {
  classification: string;
  id: string;
  name: string;
  price: string;
};

export type OptionDraft = {
  clientId: string;
  id?: number;
  colorHex?: string;
  isActive?: boolean;
  value: string;
};

export type AttributeDraft = {
  clientId: string;
  id?: number;
  name: string;
  options: OptionDraft[];
};

export type VariantDraft = {
  tempId: string;
  id?: number;
  price: string;
  sku: string;
  selections: Record<string, string>;
};

export type ProductImageDraft =
  | {
      kind: "remote";
      id: number;
      src: string;
      isPrimary: boolean;
      serverIsPrimary: boolean;
    }
  | {
      kind: "local";
      clientId: string;
      file: File;
      previewUrl: string;
      isPrimary: boolean;
    };

export type ProductFormValues = {
  name: string;
  description: string;
  selectedMarketId: string;
  selectedSubcategoryIds: string[];
  selectedAdditionIds: number[];
  theme: ProductTheme;
  isAvailable: boolean;
  isPopular: boolean;
  discount: string;
  attributes: AttributeDraft[];
  variantRows: VariantDraft[];
};
