"use client";

import { SafeImage } from "@/components/safe-image";

export type FocalPoint = { x: number; y: number };
export function FocalPreview({ source, focus, onChange, kind }: { source: string; focus: FocalPoint; onChange: (focus: FocalPoint) => void; kind: "store" | "market-login" | "delivery-login" | "offer" }) {
  const height = kind === "store" ? 214 : kind === "delivery-login" ? 250 : kind === "offer" ? 120 : 240;
  return <div className="space-y-3">
    <p className="text-xs">موضع القص: المناطق المظللة تمثل عناصر الواجهة. المعاينة عند كثافة بكسلات منطقية.</p>
    {kind !== "offer" ? <div className="flex gap-4 text-xs">
      {(["x", "y"] as const).map((axis) => <label key={axis}>{axis === "x" ? "أفقي" : "رأسي"} {Math.round(focus[axis] * 100)}%
        <input aria-label={axis === "x" ? "نقطة التركيز الأفقية" : "نقطة التركيز الرأسية"} type="range" min="0" max="1" step="0.01" value={focus[axis]} onChange={(e) => onChange({ ...focus, [axis]: Number(e.target.value) })} />
      </label>)}
    </div> : null}
    <div className="grid gap-3 sm:grid-cols-2">
      {[320, 390, 430, 768].map((width) => <div key={width}>
        <p className="text-xs">{width}px</p>
        <div className="relative overflow-hidden rounded border bg-muted" style={{ aspectRatio: `${width} / ${kind === "offer" ? width * 3 / 8 : height}` }}>
          <SafeImage src={source} alt="معاينة موضع القص" width={width} height={height} className="absolute inset-0 size-full object-cover" style={{ objectPosition: `${focus.x * 100}% ${focus.y * 100}%` }} />
          {kind === "store" ? <><div className="absolute inset-x-[5%] bottom-0 h-[30%] rounded-t-lg bg-black/50 text-center text-xs text-white">بطاقة المحل</div><div className="absolute top-[6%] right-[5%] rounded bg-black/50 px-2 text-white">رجوع</div></> : kind === "offer" ? <div className="absolute bottom-[8%] right-[5%] rounded bg-black/50 px-2 text-xs text-white">زر العرض</div> : <><div className="absolute top-[18%] left-[35%] h-[32%] w-[30%] rounded bg-black/45 text-center text-xs text-white">الشعار</div><div className="absolute inset-x-0 bottom-0 h-[18%] rounded-t-2xl bg-black/50 text-center text-xs text-white">واجهة الدخول</div></>}
        </div>
      </div>)}
    </div>
  </div>;
}
