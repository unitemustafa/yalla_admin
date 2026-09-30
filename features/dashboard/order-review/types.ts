export type BlockerPhase =
  | "idle"
  | "checking"
  | "blocked"
  | "approving"
  | "rejecting"
  | "error";

export type ApiRecord = Record<string, unknown>;
