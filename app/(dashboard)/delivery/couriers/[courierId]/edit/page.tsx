import { CourierFormPage } from "@/features/dashboard/couriers/form-page";

export default async function EditCourierRoute({
  params,
}: {
  params: Promise<{ courierId: string }>;
}) {
  const { courierId } = await params;
  return <CourierFormPage courierId={courierId} />;
}
