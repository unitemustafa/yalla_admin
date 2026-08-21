const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";

function normalizedHttpUrl(value: string, variableName: string) {
  const normalized = value.trim().replace(/\/+$/, "");

  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new Error(`${variableName} must be an absolute HTTP(S) URL.`);
  }

  return normalized;
}

export function normalizeApiBaseUrl(value: string | undefined) {
  return normalizedHttpUrl(
    value?.trim() || DEFAULT_API_BASE_URL,
    "NEXT_PUBLIC_API_BASE_URL",
  );
}

export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL,
);

export function configuredBackendOrigin() {
  const configuredBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  const backendUrl = configuredBackendUrl
    ? normalizedHttpUrl(configuredBackendUrl, "NEXT_PUBLIC_BACKEND_URL")
    : API_BASE_URL;

  return new URL(backendUrl).origin;
}
