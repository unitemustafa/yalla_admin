import { createContext, useContext } from "react";

import type { ItemRow } from "../products/types";

const OfferProductsContext = createContext<ItemRow[]>([]);

export const OfferProductsProvider = OfferProductsContext.Provider;

export function useOfferProducts() {
  return useContext(OfferProductsContext);
}
