"use client";

import { useCallback, useMemo, useState } from "react";

import type { NormalizedProduct, ProductTheme } from "../types";
import {
  attributeFromProduct,
  cloneTemplate,
  colorHexForOption,
  createId,
  emptyVariant,
  isColorAttributeName,
  optionIsActive,
  selectionKey,
  selectionKeyFromSelections,
  variantCombinations,
  variantFromProductVariant,
} from "./domain";
import type { AttributeDraft, VariantDraft } from "./types";

export function useProductVariants() {
  const [theme, setTheme] = useState<ProductTheme>("other");
  const [attributes, setAttributes] = useState<AttributeDraft[]>(() => cloneTemplate("other"));
  const [variantRows, setVariantRows] = useState<VariantDraft[]>(() => [emptyVariant()]);
  const [variantsDirty, setVariantsDirty] = useState(false);

  const availableVariantCombinations = useMemo(
    () => variantCombinations(attributes),
    [attributes],
  );
  const usedVariantCombinationKeys = useMemo(
    () =>
      new Set(
        variantRows
          .filter((variant) =>
            attributes.every((attribute) => Boolean(variant.selections[attribute.clientId])),
          )
          .map((variant) => selectionKey(variant, attributes)),
      ),
    [attributes, variantRows],
  );
  const nextVariantCombination = useMemo(
    () =>
      availableVariantCombinations.find(
        (selections) =>
          !usedVariantCombinationKeys.has(
            selectionKeyFromSelections(selections, attributes),
          ),
      ) ?? null,
    [attributes, availableVariantCombinations, usedVariantCombinationKeys],
  );
  const variantLimitReached =
    availableVariantCombinations.length > 0 &&
    variantRows.length >= availableVariantCombinations.length;
  const hasUnusedAttributeValues = useMemo(
    () =>
      attributes.some((attribute) =>
        attribute.options.some(
          (option) =>
            !variantRows.some(
              (variant) => variant.selections[attribute.clientId] === option.clientId,
            ),
        ),
      ),
    [attributes, variantRows],
  );

  const hydrateVariants = useCallback((product: NormalizedProduct, clone: boolean) => {
    const nextAttributes = product.attributes.length
      ? product.attributes.map(attributeFromProduct)
      : cloneTemplate(product.theme);
    const nextVariants = product.variants.length
      ? product.variants.map((variant) => {
          const draft = variantFromProductVariant(variant, nextAttributes);
          return clone ? { ...draft, id: undefined } : draft;
        })
      : [emptyVariant()];
    setTheme(product.theme);
    setAttributes(nextAttributes);
    setVariantRows(nextVariants);
    setVariantsDirty(false);
  }, []);

  function applyTheme(nextTheme: ProductTheme) {
    if (nextTheme === theme) return;
    setTheme(nextTheme);
    setAttributes(cloneTemplate(nextTheme));
    setVariantRows([emptyVariant()]);
    setVariantsDirty(true);
  }

  function addAttribute() {
    setAttributes((current) => [
      ...current,
      { clientId: createId("attr"), name: "خاصية جديدة", options: [] },
    ]);
    setVariantsDirty(true);
  }

  function updateAttribute(clientId: string, name: string) {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.clientId === clientId ? { ...attribute, name } : attribute,
      ),
    );
    setVariantsDirty(true);
  }

  function removeAttribute(clientId: string) {
    setAttributes((current) => current.filter((attribute) => attribute.clientId !== clientId));
    setVariantRows((current) =>
      current.map((variant) => {
        const selections = { ...variant.selections };
        delete selections[clientId];
        return { ...variant, selections };
      }),
    );
    setVariantsDirty(true);
  }

  function addOption(attributeClientId: string) {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.clientId === attributeClientId
          ? {
              ...attribute,
              options: [
                ...attribute.options,
                {
                  clientId: createId("opt"),
                  colorHex: isColorAttributeName(attribute.name) ? "#94a3b8" : undefined,
                  isActive: true,
                  value: isColorAttributeName(attribute.name) ? "لون جديد" : "اختيار جديد",
                },
              ],
            }
          : attribute,
      ),
    );
    setVariantsDirty(true);
  }

  function updateOption(attributeClientId: string, optionClientId: string, value: string) {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.clientId === attributeClientId
          ? {
              ...attribute,
              options: attribute.options.map((option) =>
                option.clientId === optionClientId ? { ...option, value } : option,
              ),
            }
          : attribute,
      ),
    );
    setVariantsDirty(true);
  }

  function updateOptionColor(
    attributeClientId: string,
    optionClientId: string,
    colorHex: string,
  ) {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.clientId === attributeClientId
          ? {
              ...attribute,
              options: attribute.options.map((option) =>
                option.clientId === optionClientId ? { ...option, colorHex } : option,
              ),
            }
          : attribute,
      ),
    );
    setVariantsDirty(true);
  }

  function removeOption(attributeClientId: string, optionClientId: string) {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.clientId === attributeClientId
          ? {
              ...attribute,
              options: attribute.options.filter((option) => option.clientId !== optionClientId),
            }
          : attribute,
      ),
    );
    setVariantRows((current) =>
      current.map((variant) => ({
        ...variant,
        selections:
          variant.selections[attributeClientId] === optionClientId
            ? { ...variant.selections, [attributeClientId]: "" }
            : variant.selections,
      })),
    );
    setVariantsDirty(true);
  }

  function toggleOptionActive(attributeClientId: string, optionClientId: string) {
    let nextActive = true;
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.clientId === attributeClientId
          ? {
              ...attribute,
              options: attribute.options.map((option) => {
                if (option.clientId !== optionClientId) return option;
                nextActive = option.isActive === false;
                return { ...option, isActive: nextActive };
              }),
            }
          : attribute,
      ),
    );
    if (!nextActive) {
      setVariantRows((current) =>
        current.map((variant) => ({
          ...variant,
          selections:
            variant.selections[attributeClientId] === optionClientId
              ? { ...variant.selections, [attributeClientId]: "" }
              : variant.selections,
        })),
      );
    }
    setVariantsDirty(true);
  }

  function updateVariant(tempId: string, updater: (variant: VariantDraft) => VariantDraft) {
    setVariantsDirty(true);
    setVariantRows((current) =>
      current.map((variant) => (variant.tempId === tempId ? updater(variant) : variant)),
    );
  }

  function variantOptionWouldDuplicate(
    tempId: string,
    attributeClientId: string,
    optionClientId: string,
  ) {
    const currentVariant = variantRows.find((variant) => variant.tempId === tempId);
    if (!currentVariant) return false;
    const nextSelections = {
      ...currentVariant.selections,
      [attributeClientId]: optionClientId,
    };
    if (attributes.some((attribute) => !nextSelections[attribute.clientId])) return false;
    return variantRows.some(
      (variant) =>
        variant.tempId !== tempId &&
        attributes.every(
          (attribute) =>
            variant.selections[attribute.clientId] === nextSelections[attribute.clientId],
        ),
    );
  }

  function addVariant() {
    if (variantLimitReached || !nextVariantCombination) return;
    setVariantsDirty(true);
    setVariantRows((current) => [
      ...current,
      { ...emptyVariant(), selections: { ...nextVariantCombination } },
    ]);
  }

  function removeVariant(tempId: string) {
    setVariantsDirty(true);
    setVariantRows((current) =>
      current.length > 1 ? current.filter((variant) => variant.tempId !== tempId) : current,
    );
  }

  const previewAttributes = attributes.map((attribute) => ({
    id: attribute.id,
    clientId: attribute.clientId,
    name: attribute.name,
    options: attribute.options.map((option) => ({
      id: option.id,
      clientId: option.clientId,
      attributeId: attribute.id,
      attributeClientId: attribute.clientId,
      colorHex: option.colorHex ?? colorHexForOption(attribute.name, option.value),
      isActive: optionIsActive(option),
      value: option.value,
    })),
  }));
  const previewVariants = variantRows.map((variant) => ({
    tempId: variant.tempId,
    price: variant.price,
    attributeValues: [],
    selections: Object.entries(variant.selections)
      .filter(([, optionClientId]) => Boolean(optionClientId))
      .map(([attributeClientId, optionClientId]) => ({
        attributeClientId,
        optionClientId,
      })),
  }));

  return {
    addAttribute,
    addOption,
    addVariant,
    applyTheme,
    attributes,
    availableVariantCombinations,
    hasUnusedAttributeValues,
    hydrateVariants,
    previewAttributes,
    previewVariants,
    removeAttribute,
    removeOption,
    removeVariant,
    theme,
    toggleOptionActive,
    updateAttribute,
    updateOption,
    updateOptionColor,
    updateVariant,
    variantLimitReached,
    variantOptionWouldDuplicate,
    variantRows,
    variantsDirty,
  };
}
