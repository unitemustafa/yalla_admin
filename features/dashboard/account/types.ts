export type PasswordStep = "idle" | "verify";
export type PasswordBusyAction = "request" | "reset" | null;

export type AccountNameParts = {
  first_name: string;
  last_name: string;
};

export type AvatarValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export type ResetCodeResponse = {
  resend_after_seconds?: unknown;
  retry_after_seconds?: unknown;
} | null;
