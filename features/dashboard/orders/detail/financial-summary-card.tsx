import { numberValue } from "../../order-display";
import { Card } from "../../primitives";
import { deliveryFeeLabel, money } from "../formatters";
import { SummaryRow } from "../summary";
import type { BackendOrder } from "../types";

export function FinancialSummaryCard({ order }: { order: BackendOrder }) {
  const discount = numberValue(order.discount) ?? 0;
  return (
    <Card className="p-5 text-sm">
      <div className="mb-3 font-semibold">ملخص مالي</div>
      <SummaryRow label="المنتجات" value={money(order.subtotal_price)} />
      <SummaryRow label="التوصيل" value={deliveryFeeLabel(order)} />
      {discount > 0 ? <SummaryRow label="الخصم" value={money(order.discount)} /> : null}
      <div className="mt-3 border-t pt-3"><SummaryRow label="الإجمالي" value={money(order.total_price)} strong /></div>
    </Card>
  );
}
