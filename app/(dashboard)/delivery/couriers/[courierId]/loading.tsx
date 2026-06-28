import { Loader2 } from "lucide-react";

export default function CourierDetailLoading() {
  return (
    <div className="flex min-h-96 items-center justify-center">
      <Loader2 className="size-7 animate-spin text-primary" />
    </div>
  );
}
