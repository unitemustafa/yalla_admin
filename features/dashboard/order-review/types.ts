export type BlockerPhase =
  | "idle"
  | "checking"
  | "blocked"
  | "approving"
  | "selecting_representative"
  | "assigning"
  | "rejecting"
  | "error";

export type ApiRecord = Record<string, unknown>;

export type RepresentativeListResult = {
  present: boolean;
  representatives: ApiRecord[];
};
