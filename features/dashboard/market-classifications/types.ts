export type MarketClassificationType = "normal" | "featured" | "popular";

export type MarketClassification = {
  id: number;
  name: string;
  description: string;
  image: string | null;
  classification_type: MarketClassificationType;
  is_active: boolean;
};

export type MarketClassificationPayload = {
  name: string;
  description?: string;
  classification_type: MarketClassificationType;
  is_active?: boolean;
};

export type ClassificationFormPayload = MarketClassificationPayload & {
  description: string;
  imageFile: File | null;
};

export type ClassificationFormState = {
  name: string;
  classificationType: MarketClassificationType;
  description: string;
  imagePreview: string | null;
  imageFile: File | null;
};
