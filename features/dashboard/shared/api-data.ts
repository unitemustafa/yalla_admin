export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function apiListData<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  const response = asRecord(value);
  if (Array.isArray(response?.results)) return response.results as T[];
  if (Array.isArray(response?.data)) return response.data as T[];

  const data = asRecord(response?.data);
  return Array.isArray(data?.results) ? (data.results as T[]) : [];
}

export function firstApiError(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstApiError(item);
      if (message) return message;
    }
    return null;
  }

  const record = asRecord(value);
  if (!record) return null;

  for (const item of Object.values(record)) {
    const message = firstApiError(item);
    if (message) return message;
  }

  return null;
}
