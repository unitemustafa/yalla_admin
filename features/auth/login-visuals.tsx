import { LockKeyhole } from "lucide-react";

import { SafeImage } from "@/components/safe-image";

export function MobileLoginBrand({
  brandName,
  brandTagline,
  logoUrl,
}: {
  brandName: string;
  brandTagline: string;
  logoUrl: string;
}) {
  return (
    <div className="mb-9 flex items-center gap-3 lg:hidden">
      <SafeImage
        alt={brandName}
        src={logoUrl}
        width={52}
        height={52}
        priority
        className="size-12 rounded-xl object-cover shadow"
      />
      <div>
        <p className="text-xl font-bold">{brandName}</p>
        <p className="text-sm text-muted-foreground">{brandTagline}</p>
      </div>
    </div>
  );
}

export function SessionExpiredDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-90 grid place-items-center bg-black/55 px-5 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center text-card-foreground shadow-2xl"
      >
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LockKeyhole className="size-7" />
        </span>
        <h2 aria-hidden="true" className="mt-4 hidden text-2xl font-extrabold">
          انتهت الجلسة
        </h2>
        <h2 id="session-expired-title" className="mt-4 text-2xl font-extrabold">
          انتهت الجلسة
        </h2>
        <p className="mt-3 leading-7 text-muted-foreground">
          انتهت جلستك. سجل الدخول من جديد للمتابعة، ويمكنك تفعيل
          &quot;افتكرني&quot; للاحتفاظ بتسجيل الدخول لمدة أطول.
        </p>
        <p className="hidden">
          سجّل الدخول من جديد للمتابعة. فعّل «افتكرني» للاحتفاظ بتسجيل الدخول
          لمدة 30 يومًا حتى بعد غلق التاب.
        </p>
        <button
          type="button"
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-4 text-base font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          onClick={onClose}
        >
          <span>تسجيل الدخول</span>
          <span className="hidden">تسجيل الدخول</span>
        </button>
      </div>
    </div>
  );
}
