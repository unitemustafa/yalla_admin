export type AddonRow = {
  index: string;
  id: string;
  image: string;
  name: string;
  nameAr: string;
  price: string;
  category: string;
  active?: boolean;
};

export type AddonCategoryRecord = {
  id: string;
  name: string;
};

export type AddonDraft = {
  category: string;
  nameAr: string;
  price: string;
};
