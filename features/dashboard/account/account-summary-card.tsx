"use client";

import { useRef, type ChangeEvent } from "react";
import { Camera, Mail, ShieldCheck } from "lucide-react";

import { DashboardImage } from "@/features/dashboard/dashboard-image";
import { Button, Card } from "@/features/dashboard/primitives";
import type { AccountProfileController } from "./use-account-profile";

export function AccountSummaryCard({
  profile,
}: {
  profile: AccountProfileController;
}) {
  const avatarInputRef = useRef<HTMLInputElement>(null);

  function changeAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    profile.selectAvatar(file);
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/20 px-5 py-6 text-center">
        <div className="relative mx-auto size-28 overflow-hidden rounded-xl border bg-background shadow-sm">
          <DashboardImage
            alt={profile.name}
            className="size-full"
            height={112}
            imageClassName="object-cover"
            placeholderType="user"
            sizes="112px"
            src={profile.avatarPreviewUrl || profile.avatarUrl}
            width={112}
          />
          <button
            aria-label="تغيير الصورة"
            className="absolute inset-x-0 bottom-0 z-20 flex h-9 items-center justify-center bg-black/55 text-white transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => avatarInputRef.current?.click()}
            title="تغيير الصورة"
            type="button"
          >
            <Camera className="size-4" />
          </button>
        </div>
        <input
          ref={avatarInputRef}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={changeAvatar}
          type="file"
        />
        {profile.canRemoveAvatar ? (
          <Button
            className="mt-3 text-destructive hover:text-destructive"
            disabled={profile.profileSaving}
            onClick={() => void profile.removeAvatar()}
            size="sm"
            type="button"
            variant="outline"
          >
            حذف الصورة
          </Button>
        ) : null}
        <h2 className="mt-4 text-xl font-bold">{profile.name}</h2>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <ShieldCheck className="size-3.5" />
          مدير
        </span>
      </div>
      <div className="grid gap-3 p-5 text-sm">
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <Mail className="size-4 text-primary" />
          <span className="truncate">{profile.email}</span>
        </div>
      </div>
    </Card>
  );
}
