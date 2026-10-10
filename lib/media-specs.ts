export type MediaSpec = {
  maxBytes?: number;
  contentTypes?: string[];
  key: string;
  label: string;
  width: number;
  height: number;
  minimumWidth: number;
  minimumHeight: number;
  fit: "contain" | "cover";
  ratioRequired?: boolean;
  displayNote?: string;
  safeWidth?: number;
  safeHeight?: number;
};

const defaultMediaSpecs = {
  product: {
    key: "product",
    label: "صورة المنتج",
    width: 1600,
    height: 1600,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "contain",
    ratioRequired: false,
  },
  addon: {
    key: "addon",
    label: "صورة الإضافة",
    width: 1200,
    height: 1200,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "contain",
    ratioRequired: false,
  },
  storeLogo: {
    key: "store-logo",
    label: "شعار المحل",
    width: 1024,
    height: 1024,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "contain",
    ratioRequired: false,
  },
  storeCover: {
    key: "store-cover",
    label: "غلاف المحل",
    width: 1600,
    height: 900,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "contain",
    ratioRequired: false,
    displayNote: "يظهر الغلاف كاملًا دون قص على مختلف مقاسات الشاشات، وبطاقة المحل أسفله؛ قد تظهر فراغات عند استخدام نسبة غير 16:9.",
  },
  classification: {
    key: "classification",
    label: "صورة تصنيف المحل",
    width: 1200,
    height: 1200,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "contain",
    ratioRequired: false,
  },
  marketType: {
    key: "market-type",
    label: "صورة الفئة الثانوية",
    width: 1000,
    height: 1000,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "contain",
    ratioRequired: false,
  },
  offerBanner: {
    key: "offer-banner",
    label: "بانر العرض",
    width: 1600,
    height: 700,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "cover",
    ratioRequired: false,
    safeWidth: 1200,
    safeHeight: 525,
  },
  campaignTeaser: {
    key: "campaign-teaser",
    label: "صورة شريط الحملة",
    width: 800,
    height: 800,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "cover",
    ratioRequired: false,
  },
  campaignMedia: {
    key: "campaign-media",
    label: "صورة أو Poster الحملة",
    width: 1600,
    height: 900,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "cover",
    ratioRequired: false,
    safeWidth: 1200,
    safeHeight: 675,
  },
  avatar: {
    key: "avatar",
    label: "الصورة الشخصية",
    width: 800,
    height: 800,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "cover",
    ratioRequired: false,
  },
  shippingLogo: {
    key: "shipping-logo",
    label: "شعار شركة الشحن",
    width: 800,
    height: 800,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "contain",
    ratioRequired: false,
  },
  dashboardLogo: {
    key: "dashboard-logo",
    label: "شعار النظام",
    width: 1024,
    height: 1024,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "contain",
    ratioRequired: false,
  },
  onboarding: {
    key: "onboarding",
    label: "صورة البداية",
    width: 1200,
    height: 1200,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "contain",
    ratioRequired: false,
    displayNote: "الصورة تظهر كاملة داخل مساحة متغيرة؛ قد تظهر فراغات حولها.",
  },
  marketLogin: {
    key: "market-login",
    label: "صورة لوجن المتجر",
    width: 1600,
    height: 1000,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "cover",
    ratioRequired: false,
    displayNote: "ارتفاع العرض 240px وعرضه يتغير حسب الشاشة؛ قد تُقص الصورة مع محاذاة أعلى الوسط، وتغطي واجهة الدخول جزءًا منها. تجنب النصوص داخل الخلفية.",
  },
  deliveryLogin: {
    key: "delivery-login",
    label: "صورة لوجن الدليفيري",
    width: 1600,
    height: 1000,
    minimumWidth: 1,
    minimumHeight: 1,
    fit: "cover",
    ratioRequired: false,
    displayNote: "ارتفاع العرض 250px وعرضه يتغير حسب الشاشة؛ قد تُقص الصورة مع محاذاة أعلى الوسط، وتغطي واجهة الدخول جزءًا منها. تجنب النصوص داخل الخلفية.",
  },
} as const satisfies Record<string, MediaSpec>;

export const mediaSpecs: Record<keyof typeof defaultMediaSpecs, MediaSpec> = { ...defaultMediaSpecs };
export const videoSpec = { maxBytes: 30 * 1024 * 1024, maxSeconds: 30, outputMaxBytes: 15 * 1024 * 1024 };

export function applyMediaContract(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Invalid media contract");
  const contract = value as { version?: number; images?: Record<string, MediaSpec>; video?: typeof videoSpec };
  if (contract.version !== 1 || !contract.images || !contract.video) throw new Error("Unsupported media contract version");
  const updates = Object.keys(defaultMediaSpecs).map((key) => {
    const spec = contract.images![key];
    if (!spec || ![spec.width, spec.height, spec.minimumWidth, spec.minimumHeight, spec.maxBytes].every((n) => typeof n === "number" && Number.isFinite(n) && n > 0) || !["cover", "contain"].includes(spec.fit) || typeof spec.ratioRequired !== "boolean") throw new Error("Invalid media specifications");
    return [key as keyof typeof defaultMediaSpecs, spec] as const;
  });
  if (![contract.video.maxBytes, contract.video.maxSeconds, contract.video.outputMaxBytes].every((n) => Number.isFinite(n) && n > 0)) throw new Error("Invalid video specifications");
  for (const [key, spec] of updates) Object.assign(mediaSpecs[key], spec);
  Object.assign(videoSpec, contract.video);
}

export function mediaSpecHint(spec: MediaSpec) {
  return `المقاس المقترح: ${spec.width}×${spec.height}px`;
}

export function validateImageDimensions(
  width: number,
  height: number,
  spec: MediaSpec,
) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return `${spec.label}: أبعاد الصورة غير صالحة.`;
  }
  return null;
}
