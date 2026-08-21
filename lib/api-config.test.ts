import { afterEach, describe, expect, it, vi } from "vitest";

import {
  configuredBackendOrigin,
  normalizeApiBaseUrl,
} from "./api-config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("API configuration", () => {
  it("normalizes the configured base URL", () => {
    expect(normalizeApiBaseUrl(" https://api.example.com/api/v1/// ")).toBe(
      "https://api.example.com/api/v1",
    );
  });

  it("uses the documented local fallback", () => {
    expect(normalizeApiBaseUrl(undefined)).toBe(
      "http://127.0.0.1:8000/api/v1",
    );
  });

  it.each(["ftp://api.example.com", "not a URL"])(
    "rejects invalid public API URL %s",
    (value) => {
      expect(() => normalizeApiBaseUrl(value)).toThrow(
        "NEXT_PUBLIC_API_BASE_URL must be an absolute HTTP(S) URL.",
      );
    },
  );

  it("prefers the dedicated backend origin for media", () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "https://media.example.com/root/");
    expect(configuredBackendOrigin()).toBe("https://media.example.com");
  });
});
