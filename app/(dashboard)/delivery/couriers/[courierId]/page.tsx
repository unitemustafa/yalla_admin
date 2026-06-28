import { CourierDetailPage } from "@/features/dashboard/pages/courier-detail";

export default async function CourierDetailRoute({
  params,
}: {
  params: Promise<{ courierId: string }>;
}) {
  const { courierId } = await params;
  return <CourierDetailPage courierId={courierId} />;
}
