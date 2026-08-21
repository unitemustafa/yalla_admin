"use client";

import { useRouter } from "next/navigation";

import {
  adminApiPaths,
  apiErrorMessage,
  readApiData,
  sendAdminJson,
  type ApiFetch,
} from "../admin-api";
import { asRecord } from "../shared/api-data";
import { offerCardFromApi } from "./domain";
import { buildOfferPayload } from "./form-domain";
import { clearedProductSelection } from "./form-state";
import type { OfferFormState, SetOfferFormState } from "./form-types";

type ShowSnackbar = (input: {
  message: string;
  tone?: "success" | "danger" | "info" | "notification";
}) => void;

function asBackendRecord(value: unknown) {
  return asRecord(value) ?? {};
}

async function uploadOfferImage(
  apiFetch: ApiFetch,
  offerId: string,
  imageFile: File | null,
) {
  if (!imageFile) return null;
  const formData = new FormData();
  formData.append("image", imageFile);
  const response = await apiFetch(
    `${adminApiPaths.offers}${encodeURIComponent(offerId)}/image/`,
    { method: "POST", body: formData },
  );
  const data = await readApiData(response);
  if (!response.ok) {
    const record = asBackendRecord(data);
    const requestId = typeof record.request_id === "string" ? record.request_id : "";
    const message = apiErrorMessage(data, "تعذر رفع صورة العرض.");
    throw new Error(requestId ? `${message} رقم التتبع: ${requestId}` : message);
  }
  return offerCardFromApi(asBackendRecord(data));
}

async function sendOfferPush(apiFetch: ApiFetch, offerId: string, enabled: boolean) {
  if (!enabled) return null;
  return asBackendRecord(await sendAdminJson(
    apiFetch,
    `${adminApiPaths.offers}${encodeURIComponent(offerId)}/send-notification/`,
    { method: "POST", body: JSON.stringify({ request_id: crypto.randomUUID() }) },
  ));
}

export function useSaveOffer({
  apiFetch,
  state,
  setState,
  offerProducts,
  marketsForScope,
  showSnackbar,
}: {
  apiFetch: ApiFetch;
  state: OfferFormState;
  setState: SetOfferFormState;
  offerProducts: OfferFormState["allProducts"];
  marketsForScope: OfferFormState["markets"];
  showSnackbar: ShowSnackbar;
}) {
  const router = useRouter();

  return async function saveOffer() {
    if (state.saving) return;
    const result = buildOfferPayload(state, offerProducts, marketsForScope);
    if (!result.ok) {
      if (result.clearProducts) {
        setState((current) => ({ ...current, ...clearedProductSelection() }));
      }
      showSnackbar({ message: result.message, tone: "danger" });
      return;
    }

    setState((current) => ({ ...current, saving: true }));
    try {
      const editMode = Boolean(state.editingOfferId);
      const path = editMode
        ? `${adminApiPaths.offers}${encodeURIComponent(state.editingOfferId)}/`
        : adminApiPaths.offers;
      const response = await apiFetch(path, {
        method: editMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.payload),
      });
      const data = await readApiData(response);
      if (!response.ok) throw new Error(apiErrorMessage(data, "تعذر حفظ العرض."));
      const offerId = offerCardFromApi(asBackendRecord(data)).id;
      const [imageResult, notificationResult] = await Promise.allSettled([
        uploadOfferImage(apiFetch, offerId, state.imageFile),
        sendOfferPush(apiFetch, offerId, state.sendPushNotification),
      ]);
      const imageFailed = imageResult.status === "rejected";
      const imageError = imageResult.status === "rejected" && imageResult.reason instanceof Error
        ? imageResult.reason.message
        : "تعذر رفع صورة العرض.";
      showSnackbar({
        message: imageFailed
          ? editMode
            ? `تم حفظ تعديل العرض، لكن ${imageError}`
            : `تم إنشاء العرض، لكن ${imageError}`
          : editMode
            ? "تم حفظ تعديل العرض بنجاح."
            : "تم إنشاء العرض بنجاح.",
        tone: imageFailed ? "danger" : "success",
      });

      if (state.sendPushNotification) {
        if (notificationResult.status === "fulfilled" && notificationResult.value) {
          const count = Number(notificationResult.value.notification_count ?? 0);
          showSnackbar({
            message: count > 0
              ? `تم إرسال الإشعار إلى ${count} عميل.`
              : "تم حفظ العرض، ولا يوجد عملاء مؤهلون للإشعار حاليًا.",
            tone: "success",
          });
        } else {
          const message = notificationResult.status === "rejected" && notificationResult.reason instanceof Error
            ? notificationResult.reason.message
            : "تعذر إرسال الإشعار.";
          showSnackbar({ message: `تم حفظ العرض، لكن ${message}`, tone: "danger" });
        }
      }
      router.push("/offers");
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر حفظ العرض.",
        tone: "danger",
      });
    } finally {
      setState((current) => ({ ...current, saving: false }));
    }
  };
}
