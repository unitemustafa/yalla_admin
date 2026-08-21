import { CustomerDetailPage } from "@/features/dashboard/customers/detail/page";

export default async function CustomerDetailRoute({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return <CustomerDetailPage userId={userId} />;
}
