type PendingOrderRequest = { storageKey: string; key: string };
const pending = new Map<string, string>();

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, canonicalValue(item)]));
  }
  return value;
}

export async function orderRequestKey(adminId: string, payload: unknown): Promise<PendingOrderRequest> {
  if (!adminId) throw new Error("سجّل الدخول قبل إنشاء الطلب.");
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalValue(payload)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const storageKey = `yalla-admin-order:${adminId}:${hash}`;
  let key = pending.get(storageKey);
  try { key ??= sessionStorage.getItem(storageKey) ?? undefined; } catch { /* Use the memory fallback. */ }
  key ??= crypto.randomUUID();
  pending.set(storageKey, key);
  try { sessionStorage.setItem(storageKey, key); } catch { /* Retain across retries in this tab. */ }
  return { storageKey, key };
}

export function completeOrderRequest(request: PendingOrderRequest) {
  pending.delete(request.storageKey);
  try {
    if (sessionStorage.getItem(request.storageKey) === request.key) sessionStorage.removeItem(request.storageKey);
  } catch { /* Successful completion does not depend on storage. */ }
}
