"use client";

import { CustomerDetailContent } from "./customer-detail-content";
import {
  CustomerDetailErrorState,
  CustomerDetailLoadingState,
} from "./detail-states";
import { useCustomerDetail } from "./use-customer-detail";

export function CustomerDetailPage({ userId }: { userId: string }) {
  const {
    activationPending,
    error,
    handleActivationChange,
    loading,
    loadUser,
    orders,
    user,
  } = useCustomerDetail(userId);

  if (loading) return <CustomerDetailLoadingState />;

  if (error || !user) {
    return (
      <CustomerDetailErrorState
        message={error ?? "لم يتم العثور على المستخدم."}
        onRetry={() => void loadUser()}
      />
    );
  }

  return (
    <CustomerDetailContent
      user={user}
      orders={orders}
      activationPending={activationPending}
      onActivationChange={handleActivationChange}
      onRefresh={() => void loadUser()}
    />
  );
}
