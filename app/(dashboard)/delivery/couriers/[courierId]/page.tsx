import { CourierDetailPage } from "@/features/dashboard/couriers/detail-page";

export default async function CourierDetailRoute({
  params,
}: {
  params: Promise<{ courierId: string }>;
}) {
  const { courierId } = await params;
  return <CourierDetailPage courierId={courierId} />;
}
