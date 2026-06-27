import { BackendOrderDetailPage } from "@/features/dashboard/pages/backend-orders";

export default async function OrderDetailRoute({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <BackendOrderDetailPage orderId={orderId} />;
}
