import { asRecord } from "../shared/api-data";
import type { BackendRecord } from "../admin-api";

export const campaignLabels = {
  status: { active: "نشطة", scheduled: "مجدولة", expired: "منتهية", inactive: "متوقفة" },
  audience: { all_clients: "كل العملاء", new_clients: "عميل جديد", returning_clients: "عميل عائد" },
  media: { none: "بدون ميديا", image: "صورة", video: "فيديو MP4" },
  action: { none: "بدون زر", offer: "عرض", product: "منتج", market: "محل", product_category: "تصنيف منتجات", external_url: "رابط خارجي", copy_text: "نسخ نص/كود" },
} as const;

export type CampaignForm = {
  internal_name: string; is_active: boolean; priority: string;
  start_time: string; end_time: string; show_in_general: boolean; service_city_id: string;
  audience: string; teaser_text: string; title: string; description: string;
  template: string; sheet_size: string; content_alignment: string;
  teaser_background_color: string; teaser_text_color: string;
  sheet_background_color: string; sheet_text_color: string;
  button_background_color: string; button_text_color: string;
  media_type: string; open_mode: string; dismiss_behavior: string;
  action_type: string; cta_label: string; target_offer_id: string;
  target_product_id: string; target_market_id: string;
  target_product_category_id: string; external_url: string; copy_text: string;
};

export type CampaignRow = CampaignForm & {
  id: string; effective_status: keyof typeof campaignLabels.status;
  service_city_name: string; target_name: string;
  teaser_image: string; sheet_image: string; video: string; video_poster: string;
  updated_at: string;
};

export type Option = { value: string; label: string };

function localDate(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

export function initialCampaignForm(): CampaignForm {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    internal_name: "", is_active: false, priority: "0",
    start_time: localDate(start), end_time: localDate(end),
    show_in_general: true, service_city_id: "", audience: "all_clients",
    teaser_text: "اكتشف العرض الآن", title: "عرض مخصوص ليك", description: "",
    template: "hero", sheet_size: "large", content_alignment: "center",
    teaser_background_color: "#FF5A00", teaser_text_color: "#FFFFFF",
    sheet_background_color: "#FFFFFF", sheet_text_color: "#202124",
    button_background_color: "#FF5A00", button_text_color: "#FFFFFF",
    media_type: "none", open_mode: "tap_only", dismiss_behavior: "collapse_only",
    action_type: "none", cta_label: "", target_offer_id: "",
    target_product_id: "", target_market_id: "", target_product_category_id: "",
    external_url: "", copy_text: "",
  };
}

function text(record: BackendRecord, key: string) {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function dateForInput(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : localDate(date);
}

export function campaignFromApi(record: BackendRecord): CampaignRow {
  const city = asRecord(record.service_city);
  const target = asRecord(record.target_summary);
  const base = initialCampaignForm();
  const fields = Object.keys(base) as Array<keyof CampaignForm>;
  for (const field of fields) {
    const value = record[field];
    if (typeof base[field] === "boolean") {
      (base[field] as boolean) = typeof value === "boolean" ? value : base[field] as boolean;
    } else if (value !== null && value !== undefined) {
      (base[field] as string) = String(value);
    }
  }
  base.start_time = dateForInput(text(record, "start_time"));
  base.end_time = dateForInput(text(record, "end_time"));
  return {
    ...base,
    id: text(record, "id"),
    effective_status: (text(record, "effective_status") || "inactive") as CampaignRow["effective_status"],
    service_city_name: city ? text(city, "name") : "عام",
    target_name: target ? text(target, "name") : "—",
    teaser_image: text(record, "teaser_image"), sheet_image: text(record, "sheet_image"),
    video: text(record, "video"), video_poster: text(record, "video_poster"),
    updated_at: text(record, "updated_at"),
  };
}

export function selectOptions(records: BackendRecord[], nameKeys = ["name", "title"]): Option[] {
  return records.map((record, index) => {
    const label = nameKeys.map((key) => text(record, key)).find(Boolean) || `#${index + 1}`;
    return { value: text(record, "id"), label };
  }).filter((option) => option.value);
}

export function campaignPayload(form: CampaignForm) {
  return {
    ...form,
    priority: Number(form.priority) || 0,
    start_time: new Date(form.start_time).toISOString(),
    end_time: new Date(form.end_time).toISOString(),
    service_city_id: form.show_in_general ? null : Number(form.service_city_id),
    target_offer_id: form.action_type === "offer" ? Number(form.target_offer_id) : null,
    target_product_id: form.action_type === "product" ? Number(form.target_product_id) : null,
    target_market_id: form.action_type === "market" ? Number(form.target_market_id) : null,
    target_product_category_id: form.action_type === "product_category" ? Number(form.target_product_category_id) : null,
  };
}

export function validateCampaign(form: CampaignForm, files: CampaignFiles, existing?: CampaignRow) {
  if (!form.internal_name.trim() || !form.teaser_text.trim() || !form.title.trim()) return "أدخل الاسم الإداري ونص الشريط والعنوان.";
  if (!form.start_time || !form.end_time || new Date(form.end_time) <= new Date(form.start_time)) return "وقت النهاية يجب أن يكون بعد البداية.";
  if (!form.show_in_general && !form.service_city_id) return "اختر مدينة الخدمة.";
  if (form.action_type !== "none" && !form.cta_label.trim()) return "نص الزر مطلوب مع الإجراء.";
  const targetField: Record<string, keyof CampaignForm> = { offer: "target_offer_id", product: "target_product_id", market: "target_market_id", product_category: "target_product_category_id" };
  const target = targetField[form.action_type];
  if (target && !form[target]) return "اختر هدف الزر.";
  if (form.action_type === "external_url" && !/^https:\/\/.+/i.test(form.external_url)) return "أدخل رابط HTTPS صحيحًا.";
  if (form.action_type === "copy_text" && !form.copy_text.trim()) return "أدخل النص أو الكود المطلوب نسخه.";
  if (form.is_active && form.media_type === "image" && !files.sheet_image && !existing?.sheet_image) return "ارفع صورة النافذة قبل التفعيل.";
  if (form.is_active && form.media_type === "video" && (!files.video && !existing?.video || !files.video_poster && !existing?.video_poster)) return "ارفع فيديو MP4 والـPoster قبل التفعيل.";
  return "";
}

export type CampaignFiles = { teaser_image?: File; sheet_image?: File; video?: File; video_poster?: File };

export const presets = [
  ["أول طلب", { teaser_text: "خصم على أول طلب", title: "أول طلب أحلى مع يلا", description: "استمتع بخصم خاص على طلبك الأول.", template: "hero", action_type: "offer", cta_label: "اطلب دلوقتي" }],
  ["توصيل مجاني", { teaser_text: "التوصيل علينا", title: "توصيل مجاني لفترة محدودة", description: "اختار اللي محتاجه وسيب التوصيل علينا.", template: "split", action_type: "offer", cta_label: "شوف العرض" }],
  ["عرض محدود", { teaser_text: "الحق العرض", title: "وقت قليل وسعر أقوى", description: "العرض متاح لفترة محدودة.", template: "hero", action_type: "offer", cta_label: "استفيد الآن" }],
  ["افتتاح محل", { teaser_text: "محل جديد وصل", title: "اكتشف أحدث محل عندنا", description: "منتجات جديدة وتجربة تستاهل.", template: "split", action_type: "market", cta_label: "افتح المحل" }],
  ["فيديو إطلاق", { teaser_text: "شوف الجديد", title: "جاهز للمفاجأة؟", description: "شاهد الفيديو واعرف كل التفاصيل.", template: "media_focus", media_type: "video", action_type: "none", cta_label: "" }],
  ["كود نسخ", { teaser_text: "عندنا كود ليك", title: "انسخ الكود واستخدمه", description: "اضغط الزر لنسخ الكود فورًا.", template: "hero", action_type: "copy_text", cta_label: "انسخ الكود" }],
  ["رسالة فقط", { teaser_text: "رسالة مهمة", title: "كل اللي محتاج تعرفه", description: "يمكن استخدام الحملة كرسالة بدون أي زر.", template: "hero", action_type: "none", cta_label: "" }],
] as const;
