"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { compressImageUpload, validateImageUpload } from "@/lib/image-upload";
import { mediaSpecs } from "@/lib/media-specs";
import { useSnackbar } from "../../snackbar";
import {
  deleteProductImage,
  getProduct,
  reorderProductImages,
  setPrimaryProductImage,
  uploadProductImages,
} from "../api";
import { primaryProductImageUrl } from "../normalizers";
import type { NormalizedProduct } from "../types";
import { createId } from "./domain";
import type { ProductImageDraft } from "./types";

export const maxProductImages = 10;
const maxProductImageSize = 5 * 1024 * 1024;
const allowedProductImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function useProductImages(productId: string | undefined) {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const localImageUrlsRef = useRef<Set<string>>(new Set());
  const [productImages, setProductImages] = useState<ProductImageDraft[]>([]);
  const [imageActionBusy, setImageActionBusy] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<number | null>(null);
  const [imageError, setImageError] = useState("");

  const primaryImage =
    productImages.find((image) => image.isPrimary) ?? productImages[0] ?? null;
  const imagePreview = primaryImage
    ? primaryImage.kind === "local"
      ? primaryImage.previewUrl
      : primaryImage.src
    : null;
  const localImages = useMemo(
    () =>
      productImages.filter(
        (image): image is Extract<ProductImageDraft, { kind: "local" }> =>
          image.kind === "local",
      ),
    [productImages],
  );
  const primaryImageIndex = localImages.findIndex((image) => image.isPrimary);

  useEffect(
    () => () => {
      localImageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      localImageUrlsRef.current.clear();
    },
    [],
  );

  const hydrateImages = useCallback((product: NormalizedProduct, clone: boolean) => {
    setProductImages(
      clone
        ? []
        : product.images.map((image) => ({
            kind: "remote" as const,
            id: image.id,
            src: image.url ?? image.image ?? primaryProductImageUrl(product) ?? "",
            isPrimary: image.isPrimary,
            serverIsPrimary: image.isPrimary,
          })),
    );
    setImageError("");
  }, []);

  const mergeServerImages = useCallback(
    (product: NormalizedProduct, preserveLocalPrimary = true) => {
      setProductImages((current) => {
        const locals = current.filter(
          (image): image is Extract<ProductImageDraft, { kind: "local" }> =>
            image.kind === "local",
        );
        const localHasPrimary =
          preserveLocalPrimary && locals.some((image) => image.isPrimary);
        const remotes: ProductImageDraft[] = product.images.map((image) => ({
          kind: "remote",
          id: image.id,
          src: image.url ?? image.image ?? primaryProductImageUrl(product) ?? "",
          isPrimary: localHasPrimary ? false : image.isPrimary,
          serverIsPrimary: image.isPrimary,
        }));
        return [
          ...remotes,
          ...locals.map((image) => ({
            ...image,
            isPrimary: localHasPrimary ? image.isPrimary : false,
          })),
        ];
      });
    },
    [],
  );

  async function selectImages(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selectedFiles.length) return;
    const localKeys = new Set(
      localImages.map(
        (image) =>
          `${image.file.name}:${image.file.size}:${image.file.type}:${image.file.lastModified}`,
      ),
    );
    const availableSlots = Math.max(0, maxProductImages - productImages.length);
    const accepted: File[] = [];
    let validationMessage = "";

    setImageActionBusy(true);
    try {
      for (const selectedFile of selectedFiles) {
        if (!allowedProductImageTypes.has(selectedFile.type)) {
          validationMessage ||= "نوع الملف غير مدعوم. استخدم JPG أو PNG أو WEBP.";
          continue;
        }
        if (accepted.length >= availableSlots) {
          validationMessage ||= "وصلت إلى الحد الأقصى للصور (10 صور).";
          continue;
        }
        const dimensionError = await validateImageUpload(selectedFile, mediaSpecs.product);
        if (dimensionError) {
          validationMessage ||= dimensionError;
          continue;
        }
        const file = await compressImageUpload(selectedFile);
        if (file.size > maxProductImageSize) {
          validationMessage ||=
            "تعذر ضغط الصورة إلى الحد المسموح (5 ميجابايت). اختر صورة أصغر.";
          continue;
        }
        const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
        if (localKeys.has(key)) continue;
        localKeys.add(key);
        accepted.push(file);
      }
    } finally {
      setImageActionBusy(false);
    }
    if (validationMessage) {
      setImageError(validationMessage);
      showSnackbar({ message: validationMessage, tone: "danger" });
    }
    if (!accepted.length) return;

    setProductImages((current) => {
      const hasPrimary = current.some((image) => image.isPrimary);
      return [
        ...current,
        ...accepted.map((file, index) => {
          const previewUrl = URL.createObjectURL(file);
          localImageUrlsRef.current.add(previewUrl);
          return {
            kind: "local" as const,
            clientId: createId("product-image"),
            file,
            previewUrl,
            isPrimary: !hasPrimary && index === 0,
          };
        }),
      ];
    });
    setImageError("");
  }

  function removeLocalImage(clientId: string) {
    setProductImages((current) => {
      const removed = current.find(
        (image) => image.kind === "local" && image.clientId === clientId,
      );
      if (!removed || removed.kind !== "local") return current;
      URL.revokeObjectURL(removed.previewUrl);
      localImageUrlsRef.current.delete(removed.previewUrl);
      const next = current.filter(
        (image) => image.kind !== "local" || image.clientId !== clientId,
      );
      if (!removed.isPrimary || !next.length) return next;
      const replacement =
        next.find((image) => image.kind === "local") ??
        next.find((image) => image.kind === "remote" && image.serverIsPrimary) ??
        next[0];
      return next.map((image) => ({
        ...image,
        isPrimary:
          image.kind === "local" && replacement.kind === "local"
            ? image.clientId === replacement.clientId
            : image.kind === "remote" && replacement.kind === "remote"
              ? image.id === replacement.id
              : false,
      }));
    });
  }

  function setLocalPrimary(clientId: string) {
    setProductImages((current) =>
      current.map((image) => ({
        ...image,
        isPrimary: image.kind === "local" && image.clientId === clientId,
      })),
    );
  }

  function moveLocalImage(clientId: string, direction: -1 | 1) {
    setProductImages((current) => {
      const localIndexes = current
        .map((image, index) => (image.kind === "local" ? index : -1))
        .filter((index) => index >= 0);
      const currentIndex = current.findIndex(
        (image) => image.kind === "local" && image.clientId === clientId,
      );
      const targetIndex = localIndexes[localIndexes.indexOf(currentIndex) + direction];
      if (currentIndex < 0 || targetIndex === undefined) return current;
      const next = [...current];
      [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
      return next;
    });
  }

  async function setRemotePrimary(imageId: number) {
    if (!productId || imageActionBusy) return;
    setImageActionBusy(true);
    setImageError("");
    try {
      mergeServerImages(await setPrimaryProductImage(apiFetch, productId, imageId), false);
      showSnackbar({ message: "تم تعيين الصورة الرئيسية." });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "تعذر تعيين الصورة الرئيسية");
    } finally {
      setImageActionBusy(false);
    }
  }

  async function moveRemoteImage(imageId: number, direction: -1 | 1) {
    if (!productId || imageActionBusy) return;
    const remotes = productImages.filter(
      (image): image is Extract<ProductImageDraft, { kind: "remote" }> =>
        image.kind === "remote",
    );
    const index = remotes.findIndex((image) => image.id === imageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= remotes.length) return;
    const reordered = [...remotes];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setImageActionBusy(true);
    setImageError("");
    try {
      mergeServerImages(
        await reorderProductImages(
          apiFetch,
          productId,
          reordered.map((image) => image.id),
        ),
      );
      showSnackbar({ message: "تم تحديث ترتيب الصور." });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "تعذر ترتيب الصور");
    } finally {
      setImageActionBusy(false);
    }
  }

  async function confirmRemoteImageDelete() {
    if (!productId || deleteImageId === null || imageActionBusy) return;
    setImageActionBusy(true);
    setImageError("");
    try {
      await deleteProductImage(apiFetch, productId, deleteImageId);
      mergeServerImages(await getProduct(apiFetch, productId));
      setDeleteImageId(null);
      showSnackbar({ message: "تم حذف الصورة." });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "تعذر حذف الصورة");
    } finally {
      setImageActionBusy(false);
    }
  }

  async function uploadPendingImages() {
    if (!productId || imageActionBusy || !localImages.length) return;
    setImageActionBusy(true);
    setImageError("");
    try {
      const product = await uploadProductImages(
        apiFetch,
        productId,
        localImages.map((image) => image.file),
        primaryImageIndex >= 0 ? primaryImageIndex : undefined,
      );
      localImages.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
        localImageUrlsRef.current.delete(image.previewUrl);
      });
      hydrateImages(product, false);
      showSnackbar({ message: "تم رفع صور المنتج بنجاح." });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "تعذر رفع صور المنتج");
    } finally {
      setImageActionBusy(false);
    }
  }

  return {
    confirmRemoteImageDelete,
    deleteImageId,
    files: localImages.map((image) => image.file),
    hydrateImages,
    imageActionBusy,
    imageError,
    imagePreview,
    moveLocalImage,
    moveRemoteImage,
    primaryImageIndex: primaryImageIndex >= 0 ? primaryImageIndex : undefined,
    productImages,
    removeLocalImage,
    selectImages,
    setDeleteImageId,
    setLocalPrimary,
    setRemotePrimary,
    uploadPendingImages,
  };
}
