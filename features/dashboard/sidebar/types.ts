import type { FocusEvent, MouseEvent, RefObject } from "react";

import type { PageKey } from "../types";

export type SidebarDirection = "ltr" | "rtl";

export type FloatingNavState = {
  label: string;
  top: number;
};

type NavigationLabels = {
  t: (key: string) => string;
  pageTitle: (page: PageKey) => string;
};

export type ExpandedNavigationProps = NavigationLabels & {
  activePage: PageKey;
  direction: SidebarDirection;
  isGroupOpen: (label: string) => boolean;
  toggleGroup: (label: string) => void;
  onNavigate: () => void;
};

export type IconTooltipHandlers = {
  showIconTooltip: (
    event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>,
    label: string,
  ) => void;
  hideIconTooltip: (label?: string) => void;
};

export type CollapsedNavigationProps = NavigationLabels &
  IconTooltipHandlers & {
    activePage: PageKey;
    direction: SidebarDirection;
    collapsedGroupOpen: FloatingNavState | null;
    collapsedNavMenuRef: RefObject<HTMLDivElement | null>;
    onNavigate: () => void;
    onToggleCollapsedGroup: (
      event: MouseEvent<HTMLElement>,
      label: string,
    ) => void;
  };
