import { CourierFormPage } from "@/features/dashboard/pages/couriers";

export default async function EditCourierRoute({
  params,
}: {
  params: Promise<{ courierId: string }>;
}) {
  const { courierId } = await params;
  return <CourierFormPage courierId={courierId} />;
}
