export type MediaSpec = {
  key: string;
  label: string;
  width: number;
  height: number;
  minimumWidth: number;
  minimumHeight: number;
  fit: "contain" | "cover";
  safeWidth?: number;
  safeHeight?: number;
};

export const mediaSpecs = {
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
    safeWidth: 1200,
    safeHeight: 675,
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
} as const satisfies Record<string, MediaSpec>;

const ASPECT_RATIO_TOLERANCE = 0.04;

export function mediaSpecHint(spec: MediaSpec) {
  const safeArea = spec.safeWidth && spec.safeHeight
    ? ` — منطقة الأمان الوسطى ${spec.safeWidth}×${spec.safeHeight}px`
    : "";
  return `${spec.width}×${spec.height}px — نسبة ${spec.width}:${spec.height}${safeArea}`;
}

export function validateImageDimensions(
  width: number,
  height: number,
  spec: MediaSpec,
) {
  if (width < spec.minimumWidth || height < spec.minimumHeight) {
    return `${spec.label}: الحد الأدنى ${spec.minimumWidth}×${spec.minimumHeight}px، والمقاس المرفوع ${width}×${height}px.`;
  }

  const targetRatio = spec.width / spec.height;
  const actualRatio = width / height;
  const ratioDifference = Math.abs(actualRatio - targetRatio) / targetRatio;
  if (ratioDifference > ASPECT_RATIO_TOLERANCE) {
    return `${spec.label}: استخدم نسبة ${spec.width}:${spec.height}. المقاس المعتمد ${spec.width}×${spec.height}px.`;
  }

  return null;
}
