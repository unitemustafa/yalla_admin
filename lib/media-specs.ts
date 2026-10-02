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
    minimumWidth: 800,
    minimumHeight: 800,
    fit: "contain",
  },
  addon: {
    key: "addon",
    label: "صورة الإضافة",
    width: 1200,
    height: 1200,
    minimumWidth: 600,
    minimumHeight: 600,
    fit: "contain",
  },
  storeLogo: {
    key: "store-logo",
    label: "شعار المحل",
    width: 1024,
    height: 1024,
    minimumWidth: 512,
    minimumHeight: 512,
    fit: "contain",
  },
  storeCover: {
    key: "store-cover",
    label: "غلاف المحل",
    width: 1600,
    height: 900,
    minimumWidth: 1200,
    minimumHeight: 675,
    fit: "cover",
    ratioRequired: false,
    displayNote: "الغلاف يملأ مساحة متغيرة ويُقص من الوسط حسب الشاشة، وتغطي بطاقة المحل الجزء السفلي؛ استخدمه كخلفية وضع التفاصيل المهمة أعلى الوسط.",
  },
  classification: {
    key: "classification",
    label: "صورة تصنيف المحل",
    width: 1200,
    height: 1200,
    minimumWidth: 600,
    minimumHeight: 600,
    fit: "contain",
  },
  marketType: {
    key: "market-type",
    label: "صورة الفئة الثانوية",
    width: 1000,
    height: 1000,
    minimumWidth: 512,
    minimumHeight: 512,
    fit: "contain",
  },
  offerBanner: {
    key: "offer-banner",
    label: "بانر العرض",
    width: 1600,
    height: 600,
    minimumWidth: 1200,
    minimumHeight: 450,
    fit: "cover",
    safeWidth: 1200,
    safeHeight: 450,
  },
  campaignTeaser: {
    key: "campaign-teaser",
    label: "صورة شريط الحملة",
    width: 800,
    height: 800,
    minimumWidth: 400,
    minimumHeight: 400,
    fit: "cover",
  },
  campaignMedia: {
    key: "campaign-media",
    label: "صورة أو Poster الحملة",
    width: 1600,
    height: 900,
    minimumWidth: 1200,
    minimumHeight: 675,
    fit: "cover",
    safeWidth: 1200,
    safeHeight: 675,
  },
  avatar: {
    key: "avatar",
    label: "الصورة الشخصية",
    width: 800,
    height: 800,
    minimumWidth: 400,
    minimumHeight: 400,
    fit: "cover",
  },
  shippingLogo: {
    key: "shipping-logo",
    label: "شعار شركة الشحن",
    width: 800,
    height: 800,
    minimumWidth: 400,
    minimumHeight: 400,
    fit: "contain",
  },
  dashboardLogo: {
    key: "dashboard-logo",
    label: "شعار النظام",
    width: 1024,
    height: 1024,
    minimumWidth: 512,
    minimumHeight: 512,
    fit: "contain",
  },
  onboarding: {
    key: "onboarding",
    label: "صورة البداية",
    width: 1200,
    height: 1200,
    minimumWidth: 400,
    minimumHeight: 400,
    fit: "contain",
    displayNote: "الصورة تظهر كاملة داخل مساحة متغيرة؛ قد تظهر فراغات حولها.",
  },
  marketLogin: {
    key: "market-login",
    label: "صورة لوجن المتجر",
    width: 1600,
    height: 1000,
    minimumWidth: 640,
    minimumHeight: 400,
    fit: "cover",
    ratioRequired: false,
    displayNote: "ارتفاع العرض 240px وعرضه يتغير حسب الشاشة؛ قد تُقص الصورة مع محاذاة أعلى الوسط، وتغطي واجهة الدخول جزءًا منها. تجنب النصوص داخل الخلفية.",
  },
  deliveryLogin: {
    key: "delivery-login",
    label: "صورة لوجن الدليفيري",
    width: 1600,
    height: 1000,
    minimumWidth: 640,
    minimumHeight: 400,
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

const ASPECT_RATIO_TOLERANCE = 0.04;

function aspectRatioLabel(spec: MediaSpec) {
  let divisor = spec.width;
  let remainder = spec.height;
  while (remainder) {
    [divisor, remainder] = [remainder, divisor % remainder];
  }
  return `${spec.width / divisor}:${spec.height / divisor}`;
}

export function mediaSpecHint(spec: MediaSpec) {
  const safeArea = spec.safeWidth && spec.safeHeight
    ? ` — منطقة محتوى مقترحة في الوسط ${spec.safeWidth}×${spec.safeHeight}px (قد تغطيها عناصر الواجهة)`
    : "";
  const ratio = isRatioRequired(spec)
    ? "نسبة مطلوبة"
    : "نسبة مقترحة، تُقبل نسب أخرى";
  const display = spec.displayNote ?? (spec.fit === "contain"
    ? "تظهر الصورة كاملة دون قص؛ قد تظهر فراغات حولها."
    : "تملأ المساحة مع قص الأطراف عند اختلاف النسبة؛ ضع العنصر المهم في الوسط.");
  return `المقاس المقترح ${spec.width}×${spec.height}px — الحد الأدنى ${spec.minimumWidth}×${spec.minimumHeight}px — ${ratio} ${aspectRatioLabel(spec)}${safeArea} — ${display}`;
}

function isRatioRequired(spec: MediaSpec) {
  return spec.ratioRequired ?? spec.fit === "cover";
}

export function validateImageDimensions(
  width: number,
  height: number,
  spec: MediaSpec,
) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return `${spec.label}: أبعاد الصورة غير صالحة.`;
  }
  if (width < spec.minimumWidth || height < spec.minimumHeight) {
    return `${spec.label}: الحد الأدنى ${spec.minimumWidth}×${spec.minimumHeight}px، والمقاس المرفوع ${width}×${height}px.`;
  }

  const targetRatio = spec.width / spec.height;
  const actualRatio = width / height;
  const ratioDifference = Math.abs(actualRatio - targetRatio) / targetRatio;
  if (isRatioRequired(spec) && ratioDifference > ASPECT_RATIO_TOLERANCE) {
    return `${spec.label}: استخدم نسبة ${aspectRatioLabel(spec)}. المقاس المقترح ${spec.width}×${spec.height}px.`;
  }

  return null;
}
