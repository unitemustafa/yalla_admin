import { UserDetailApiPage } from "@/features/dashboard/pages/user-detail";

export default async function CustomerDetailRoute({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return <UserDetailApiPage userId={userId} />;
}
