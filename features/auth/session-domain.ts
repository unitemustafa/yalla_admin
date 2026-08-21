export const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const TEMPORARY_MAX_AGE_SECONDS = 60 * 60 * 8;

export function parseSessionExpiresAt(value: string | null) {
  const expiresAt = Number(value);
  return Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : null;
}

export function remainingSessionMaxAge(expiresAt: number | null, now: number) {
  return expiresAt && expiresAt > now
    ? Math.max(1, Math.ceil((expiresAt - now) / 1000))
    : 0;
}

export function sessionExpiredNoticeState({
  queryExpired,
  storedExpiry,
  storedNotice,
  now,
}: {
  queryExpired: boolean;
  storedExpiry: string | null;
  storedNotice: string | null;
  now: number;
}) {
  const expiresAt = Number(storedExpiry);

  return {
    shouldShow:
      queryExpired ||
      storedNotice === "true" ||
      (Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt <= now),
    shouldRemoveExpiry: expiresAt <= now,
  };
}
