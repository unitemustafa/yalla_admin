import { NETWORK_ERROR_MESSAGE, isNetworkError } from "@/lib/auth";

import { RateLimitError, retryAfterSeconds } from "./auth-errors";

export async function responseData(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

export function rateLimitError(response: Response, data: unknown) {
  return new RateLimitError(
    retryAfterSeconds(data, response.headers.get("Retry-After")),
  );
}

export async function throwIfRateLimited(
  response: Response,
  data?: unknown,
) {
  if (response.status !== 429) return;
  const payload =
    data === undefined ? await responseData(response.clone()) : data;
  throw rateLimitError(response, payload);
}

export function waitForRateLimit(seconds: number) {
  const safeSeconds = Math.min(60, Math.max(1, seconds));
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, safeSeconds * 1000);
  });
}

export async function fetchWithNetworkError(
  input: string,
  init?: RequestInit,
) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (isNetworkError(error)) throw new Error(NETWORK_ERROR_MESSAGE);
    throw error;
  }
}
