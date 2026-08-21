import { Eye, Loader2, Store } from "lucide-react";

import { AppSelect, Button, Card } from "../primitives";
import {
  formatPartnerDate,
  partnerApplicantRoleLabel,
  partnerBusinessTypeLabel,
  partnerDecisionOptions,
  partnerDecisionValue,
  partnerStatusLabel,
} from "./domain";
import type { PartnerApplication, PartnerStatus } from "./types";

export function PartnerApplicationsTable({
  applications,
  updatingId,
  onStatusChange,
  onSelect,
}: {
  applications: PartnerApplication[];
  updatingId: string | null;
  onStatusChange: (
    application: PartnerApplication,
    status: PartnerStatus,
  ) => void;
  onSelect: (application: PartnerApplication) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b bg-muted/35 text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-4 text-right font-bold">النشاط</th>
              <th className="px-4 py-4 text-right font-bold">المسؤول</th>
              <th className="px-4 py-4 text-right font-bold">النوع</th>
              <th className="px-4 py-4 text-right font-bold">التواصل</th>
              <th className="px-4 py-4 text-right font-bold">التاريخ</th>
              <th className="px-4 py-4 text-right font-bold">الحالة</th>
              <th className="px-5 py-4 text-center font-bold">التفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {applications.map((application) => (
              <tr
                key={application.id}
                className={
                  application.status === "rejected"
                    ? "bg-red-500/5 outline outline-1 -outline-offset-1 outline-red-500/70 transition-colors hover:bg-red-500/10"
                    : "transition-colors hover:bg-muted/25"
                }
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Store className="size-5" />
                    </span>
                    <div>
                      <div className="font-extrabold">
                        {application.businessName}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {application.branchesCount} فرع
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-bold">{application.contactName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {partnerApplicantRoleLabel(application.applicantRole)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>{partnerBusinessTypeLabel(application.businessType)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {application.hasTradeLicense
                      ? "لديه سجل تجاري"
                      : "بدون سجل تجاري"}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div dir="ltr" className="text-right font-medium">
                    {application.mobileNumber}
                  </div>
                  <div className="mt-1 max-w-48 truncate text-xs text-muted-foreground">
                    {application.email}
                  </div>
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground">
                  {formatPartnerDate(application.createdAt)}
                </td>
                <td className="px-4 py-4">
                  {updatingId === application.id ? (
                    <Loader2 className="size-5 animate-spin text-primary" />
                  ) : (
                    <AppSelect
                      value={partnerDecisionValue(application.status)}
                      placeholder={partnerStatusLabel(application.status)}
                      onValueChange={(value) =>
                        onStatusChange(application, value as PartnerStatus)
                      }
                      options={partnerDecisionOptions}
                      ariaLabel={`حالة طلب ${application.businessName}`}
                      className="h-9 w-40"
                    />
                  )}
                </td>
                <td className="px-5 py-4 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`عرض طلب ${application.businessName}`}
                    onClick={() => onSelect(application)}
                  >
                    <Eye className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
