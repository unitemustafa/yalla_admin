import Link from "next/link";

import { formatMoney, translateOrderStatus } from "../../admin-api";
import { Badge, Card, CurrencyText } from "../../primitives";
import { unavailableCustomerValue } from "./domain";
import type { CustomerRecentOrder } from "./types";

export function CustomerOrdersSection({
  orders,
  hasOrderData,
}: {
  orders: CustomerRecentOrder[];
  hasOrderData: boolean;
}) {
  return (
    <div id="user-orders" className="scroll-mt-24">
      <Card className="overflow-hidden shadow">
        <div className="flex flex-col gap-2 border-b p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold">طلبات العميل</h3>
          </div>
          <Badge>
            {hasOrderData
              ? `${orders.length.toLocaleString("en-US")} طلب`
              : "0 طلب"}
          </Badge>
        </div>

        {orders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="h-10 border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-4 text-start font-medium">رقم الطلب</th>
                  <th className="px-4 text-start font-medium">الحالة</th>
                  <th className="px-4 text-start font-medium">الإجمالي</th>
                  <th className="px-4 text-start font-medium">التاريخ</th>
                  <th className="px-4 text-start font-medium">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.number}
                    className="h-14 border-b last:border-0"
                  >
                    <td className="px-4 font-medium">
                      <Link
                        href={`/orders/view/${encodeURIComponent(order.id)}`}
                        className="hover:text-primary"
                      >
                        {order.number}
                      </Link>
                    </td>
                    <td className="px-4">
                      {translateOrderStatus(order.status)}
                    </td>
                    <td className="px-4 font-semibold">
                      <CurrencyText>{formatMoney(order.total)}</CurrencyText>
                    </td>
                    <td className="px-4">
                      <div>
                        {order.created_at
                          ? new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(order.created_at))
                          : unavailableCustomerValue}
                      </div>
                    </td>
                    <td className="px-4">
                      <Link
                        href={`/orders/view/${encodeURIComponent(order.id)}`}
                        className="inline-flex h-8 items-center justify-center rounded-md border bg-background px-3 text-xs font-semibold shadow-sm hover:bg-accent"
                      >
                        عرض الطلب
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            لا توجد طلبات لهذا العميل حتى الآن.
          </div>
        )}
      </Card>
    </div>
  );
}
