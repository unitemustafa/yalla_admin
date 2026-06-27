import { Suspense } from "react";

import { CouriersPage } from "@/features/dashboard/pages/couriers";

export default function CouriersRoute() {
  return (
    <Suspense fallback={<div className="px-6 py-8" />}>
      <CouriersPage />
    </Suspense>
  );
}
