"use client";

import { PageTitle } from "@/features/dashboard/primitives";
import { AccountProfileForm } from "./profile-form";
import { AccountSecurityCard } from "./security-card";
import { AccountSummaryCard } from "./account-summary-card";
import { useAccountProfile } from "./use-account-profile";
import { usePasswordReset } from "./use-password-reset";

export function AccountPage() {
  const profile = useAccountProfile();
  const passwordReset = usePasswordReset(profile.email);

  return (
    <div className="px-6 py-6">
      <PageTitle
        description="بيانات حساب المدير الحالي وإعدادات الملف الشخصي."
        title="الحساب"
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[360px_1fr]">
        <AccountSummaryCard profile={profile} />
        <div className="grid gap-4">
          <AccountProfileForm profile={profile} />
          <AccountSecurityCard passwordReset={passwordReset} />
        </div>
      </div>
    </div>
  );
}
