export type ItemScopeFilter = "all" | "general" | "cities";

export type ItemAdvancedFilters = {
  scope: ItemScopeFilter;
  cityIds: string[];
  shopIds: string[];
  status: "all" | "active" | "inactive";
};

export type ItemFilters = ItemAdvancedFilters & {
  search: string;
};

export const defaultAdvancedFilters: ItemAdvancedFilters = {
  scope: "all",
  cityIds: [],
  shopIds: [],
  status: "all",
};

export const defaultFilters: ItemFilters = {
  search: "",
  ...defaultAdvancedFilters,
};

export const itemsPageSize = 10;

export const itemCheckboxClass =
  "peer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border text-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground";
