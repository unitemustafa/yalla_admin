export type CustomerPageState = "loading" | "error" | "ready";

export type CustomerDraft = {
  name: string;
  username: string;
  phone: string;
  email: string;
  password: string;
};

export type CustomerFieldErrors = Partial<
  Record<keyof CustomerDraft, string>
>;

export class CustomerCreateError extends Error {
  fieldErrors: CustomerFieldErrors;

  constructor(message: string, fieldErrors: CustomerFieldErrors = {}) {
    super(message);
    this.name = "CustomerCreateError";
    this.fieldErrors = fieldErrors;
  }
}
