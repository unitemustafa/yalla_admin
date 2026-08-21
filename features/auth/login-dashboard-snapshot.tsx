import {
  BarChart3,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { SafeImage } from "@/components/safe-image";
import type { LoginDashboardSnapshot } from "@/features/dashboard/static-data";

const productImages = [
  "https://bucket.ammenu.com/yalla-market/items/1778576027822-i19a0pn483.webp",
  "https://bucket.ammenu.com/yalla-market/items/1778575947135-br72ie6ml76.webp",
  "https://bucket.ammenu.com/yalla-market/items/1778544634562-e47zuvmo7jt.webp",
  "https://bucket.ammenu.com/yalla-market/items/1778544524971-c0nqlzwbv1m.webp",
];

export function LoginDashboardPreview({
  snapshot,
  brandName,
  brandTagline,
  logoUrl,
}: {
  snapshot: LoginDashboardSnapshot;
  brandName: string;
  brandTagline: string;
  logoUrl: string;
}) {
  const stats = [
    {
      label: "طلبات اليوم",
      value: String(snapshot.todayOrders),
      icon: PackageCheck,
    },
    {
      label: "مدن متاحة",
      value: String(snapshot.availableCities),
      icon: MapPin,
    },
    {
      label: "مناطق توصيل",
      value: String(snapshot.deliveryZones),
      icon: Truck,
    },
  ];

  return (
    <section className="relative hidden overflow-hidden bg-primary px-10 py-8 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:px-14">
      <div className="absolute inset-0 opacity-12 [background-image:linear-gradient(to_left,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:54px_54px]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(to_top,hsl(190_88%_8%/0.28),transparent)]" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SafeImage
            alt={brandName}
            src={logoUrl}
            width={56}
            height={56}
            priority
            className="size-14 rounded-xl border border-white/20 object-cover shadow-lg"
          />
          <div>
            <p className="text-xl font-bold leading-6">{brandName}</p>
            <p className="text-sm text-white/75">{brandTagline}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/80">
          <ShieldCheck className="size-4" />
          آمن وسريع
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-12">
        <div className="mb-8 grid grid-cols-3 gap-3">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-lg border border-white/20 bg-white/10 p-4 shadow-sm backdrop-blur"
              >
                <Icon className="mb-5 size-5 text-amber-200" />
                <p className="text-3xl font-extrabold leading-none">
                  {item.value}
                </p>
                <p className="mt-2 text-xs font-medium text-white/75">
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-white/20 bg-white/10 p-5 shadow-2xl shadow-black/15 backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white/70">نظرة سريعة</p>
              <h1 className="mt-1 text-3xl font-extrabold leading-tight xl:text-4xl">
                إدارة الطلبات والمنتجات والفروع من مكان واحد
              </h1>
            </div>
            <BarChart3 className="size-9 shrink-0 text-amber-200" />
          </div>

          <div>
            <div className="grid grid-cols-4 gap-3">
              {productImages.map((src, index) => (
                <SafeImage
                  key={src}
                  alt={`منتج من يلا ماركت ${index + 1}`}
                  src={src}
                  width={240}
                  height={170}
                  quality={95}
                  sizes="(min-width: 1280px) 180px, 22vw"
                  className="aspect-[4/3] w-full rounded-lg border border-white/20 bg-white object-cover shadow-lg shadow-black/10"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
