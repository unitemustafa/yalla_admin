"use client";

import { DeliveryProofCard } from "./delivery-proof-card";
import { DeliveryPriceCard } from "./delivery-price-card";
import { OrderInformationCard } from "./order-information-card";
import { RepresentativeCard } from "./representative-card";
import { StatusActionsCard } from "./status-actions-card";
import type { useOrderDetail } from "./use-order-detail";

type DetailState = ReturnType<typeof useOrderDetail>;

export function OrderDetailSidebar({ state }: { state: DetailState }) {
  const order = state.order;
  if (!order) return null;
  return (
    <div className="grid gap-4">
      <StatusActionsCard order={order} saving={state.savingStatus} onUpdate={(status) => void state.updateStatus(status)} />
      <DeliveryProofCard order={order} />
      <OrderInformationCard order={order} onCopyLocation={() => void state.copyLocation()} />
      <RepresentativeCard
        order={order}
        representatives={state.representatives}
        options={state.representativeOptions}
        selectedId={state.selectedRepresentativeId}
        loading={state.representativesLoading}
        saving={state.savingAssignment}
        onSelectedIdChange={state.setSelectedRepresentativeId}
        onLoadOptions={() => void state.loadRepresentativeOptions(order)}
        onAssign={() => void state.assignSelectedRepresentative()}
        onUnassign={() => void state.unassignRepresentative()}
      />
      <DeliveryPriceCard order={order} value={state.deliveryPriceDraft} saving={state.savingDeliveryPrice} onChange={state.setDeliveryPriceDraft} onSave={(action) => void state.updateDeliveryPrice(action)} />
    </div>
  );
}
