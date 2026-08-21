import {
  BadgeCheck,
  Building2,
  Clock3,
  Handshake,
  Loader2,
  Mail,
  Phone,
  Store,
  UserRound,
  X,
} from "lucide-react";

import { AppSelect, Badge, Button, Card } from "../primitives";
import {
  formatPartnerDate,
  partnerApplicantRoleLabel,
  partnerBusinessTypeLabel,
  partnerDecisionOptions,
  partnerDecisionValue,
  partnerStatusLabel,
  partnerStatusTone,
} from "./domain";
import type { PartnerApplication, PartnerStatus } from "./types";

export function PartnerDetailsDialog({
  application,
  updating,
  onClose,
  onStatusChange,
}: {
  application: PartnerApplication;
  updating: boolean;
  onClose: () => void;
  onStatusChange: (status: PartnerStatus) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`تفاصيل طلب ${application.businessName}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto shadow-2xl">
        <div className="flex items-start justify-between border-b p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-black">
                {application.businessName}
              </h2>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={partnerStatusTone(application.status)}>
                  {partnerStatusLabel(application.status)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  #{application.id}
                </span>
              </div>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <DetailItem
            icon={UserRound}
            label="المسؤول"
            value={`${application.contactName} — ${partnerApplicantRoleLabel(application.applicantRole)}`}
          />
          <DetailItem
            icon={Store}
            label="نوع النشاط"
            value={`${partnerBusinessTypeLabel(application.businessType)} • ${application.branchesCount} فرع`}
          />
          <DetailItem
            icon={Phone}
            label="رقم الموبايل"
            value={application.mobileNumber}
            ltr
          />
          <DetailItem icon={Mail} label="البريد" value={application.email} />
          <DetailItem
            icon={Phone}
            label="الخط الأرضي"
            value={application.landline || "غير مسجل"}
            ltr
          />
          <DetailItem
            icon={BadgeCheck}
            label="السجل التجاري"
            value={application.hasTradeLicense ? "متوفر" : "غير متوفر"}
          />
          <DetailItem
            icon={Handshake}
            label="تحديثات واتساب"
            value={application.whatsappOptIn ? "موافق" : "غير موافق"}
          />
          <DetailItem
            icon={Clock3}
            label="تاريخ التقديم"
            value={formatPartnerDate(application.createdAt)}
          />
        </div>

        {application.notes ? (
          <div className="mx-5 mb-5 rounded-xl border bg-muted/25 p-4">
            <div className="text-xs font-bold text-muted-foreground">
              ملاحظات مقدم الطلب
            </div>
            <p className="mt-2 text-sm leading-6">{application.notes}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-extrabold">تحديث حالة الطلب</div>
            <div className="mt-1 text-xs text-muted-foreground">
              سيُحفظ التحديث في النظام مباشرة.
            </div>
          </div>
          {updating ? (
            <Loader2 className="size-6 animate-spin text-primary" />
          ) : (
            <AppSelect
              value={partnerDecisionValue(application.status)}
              placeholder={partnerStatusLabel(application.status)}
              onValueChange={(value) => onStatusChange(value as PartnerStatus)}
              options={partnerDecisionOptions}
              ariaLabel="تحديث حالة طلب الشريك"
              className="h-10 sm:w-48"
            />
          )}
        </div>
      </Card>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  ltr = false,
}: {
  icon: typeof Handshake;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-muted/15 p-4">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <div
        dir={ltr ? "ltr" : undefined}
        className={`mt-2 text-sm font-extrabold ${ltr ? "text-right" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
