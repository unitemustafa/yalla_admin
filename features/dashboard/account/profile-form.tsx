"use client";

import { Loader2, Save } from "lucide-react";

import { Button, Card, Input } from "@/features/dashboard/primitives";
import type { AccountProfileController } from "./use-account-profile";

export function AccountProfileForm({
  profile,
}: {
  profile: AccountProfileController;
}) {
  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold">بيانات البروفايل</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        إدارة بيانات حساب المدير الحالي
      </p>
      <form
        className="mt-5 grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void profile.saveProfile();
        }}
      >
        <label className="grid gap-2 text-sm font-medium">
          الاسم
          <Input
            data-testid="account-name-input"
            onChange={(event) => profile.setProfileName(event.target.value)}
            required
            value={profile.profileName}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          البريد الإلكتروني
          <Input
            className="text-right"
            data-testid="account-email-input"
            dir="ltr"
            readOnly
            value={profile.profileEmail}
          />
        </label>
        <div className="flex items-end gap-2 md:col-span-2">
          <Button
            className="w-full"
            disabled={profile.profileSaving}
            type="submit"
          >
            {profile.profileSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {profile.profileSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        </div>
        {profile.profileError ? (
          <p
            className="text-sm font-medium text-destructive md:col-span-2"
            role="alert"
          >
            {profile.profileError}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
