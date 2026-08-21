import { cleanText, getMarketSections, getOrderMarketsSummary, isMultiMarket } from "../../order-display";
import { Badge, Card, CurrencyText } from "../../primitives";
import {
  aggregatedOrderOffers,
  orderItemDisplayName,
  orderItemSubtotal,
  orderItemVariantLabel,
  orderOfferBenefitLabel,
  orderOfferBenefitTitle,
  orderOfferTitle,
  sectionMarketDisplayName,
  sectionTotal,
} from "../detail-domain";
import { money } from "../formatters";
import { SummaryPill } from "../summary";
import type { BackendOrder, BackendOrderItem, BackendOrderOffer } from "../types";

export function MarketSectionsCard({ order }: { order: BackendOrder }) {
  const sections = getMarketSections(order);
  const appliedOffers = aggregatedOrderOffers(order);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/25 px-5 py-4">
        <div>
          <div className="font-semibold">محلات الطلب</div>
          <div className="mt-1 text-xs text-muted-foreground">{getOrderMarketsSummary(order)}</div>
        </div>
        <Badge tone={isMultiMarket(order) ? "green" : "secondary"}>{isMultiMarket(order) ? "متعدد المحلات" : "محل واحد"}</Badge>
      </div>
      {appliedOffers.length > 0 ? (
        <div className="border-b bg-primary/5 px-5 py-4">
          <div className="mb-3 font-semibold">العروض المطبقة على الطلب</div>
          <div className="grid gap-2">
            {appliedOffers.map((offer, index) => (
              <div key={`${offer.id ?? offer.offer_id ?? index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm">
                <span className="font-medium">{orderOfferTitle(offer)}</span>
                <span className="text-muted-foreground">{orderOfferBenefitTitle(offer)}: {orderOfferBenefitLabel(offer, order)}</span>
              </div>
            ))}
          </div>
          {isMultiMarket(order) ? <p className="mt-2 text-xs text-muted-foreground">يظهر خصم العرض هنا مجمعًا مرة واحدة؛ رقم الخصم داخل كل محل بالأسفل هو نصيب هذا المحل من نفس الخصم.</p> : null}
        </div>
      ) : null}
      {sections.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">لا توجد منتجات أو محلات في استجابة الطلب.</div>
      ) : (
        <div className="grid gap-4 p-5">
          {sections.map((section, sectionIndex) => {
            const items = (section.items ?? []) as BackendOrderItem[];
            const offers = (section.offers ?? []) as BackendOrderOffer[];
            return (
              <section key={`${section.id ?? section.market_id ?? sectionIndex}`} className="overflow-hidden rounded-lg border bg-card">
                <div className="border-b bg-muted/15 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-bold">{sectionMarketDisplayName(section)}</h3>
                        {cleanText(section.market?.branch) ? <Badge tone="secondary">{cleanText(section.market?.branch)}</Badge> : null}
                      </div>
                    </div>
                    <div className="grid gap-2 text-xs sm:grid-cols-3">
                      <SummaryPill label="إجمالي المنتجات" value={money(section.subtotal_price)} />
                      <SummaryPill label={offers.length > 0 ? "نصيب المحل من الخصم" : "الخصم"} value={money(section.discount)} />
                      <SummaryPill label="الإجمالي النهائي" value={sectionTotal(section)} />
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead><tr className="border-b text-xs text-muted-foreground"><th className="w-16 px-4 py-3 text-start">#</th><th className="px-4 py-3 text-start">المنتج</th><th className="px-4 py-3 text-start">المتغير</th><th className="px-4 py-3 text-start">السعر</th><th className="px-4 py-3 text-start">الكمية</th><th className="px-4 py-3 text-start">الإجمالي</th></tr></thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-5 text-center text-muted-foreground">لا توجد منتجات مباشرة لهذا المحل.</td></tr>
                      ) : items.map((item, index) => (
                        <tr key={`${item.id ?? item.variant_id ?? index}`} className="border-b last:border-0">
                          <td className="px-4 py-4 text-muted-foreground">{index + 1}</td>
                          <td className="px-4 py-4 font-medium">{orderItemDisplayName(item)}</td>
                          <td className="px-4 py-4 text-muted-foreground">{orderItemVariantLabel(item)}</td>
                          <td className="px-4 py-4"><CurrencyText>{money(item.unit_price)}</CurrencyText></td>
                          <td className="px-4 py-4">{cleanText(item.quantity) || "-"}</td>
                          <td className="px-4 py-4"><CurrencyText>{orderItemSubtotal(item)}</CurrencyText></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Card>
  );
}
