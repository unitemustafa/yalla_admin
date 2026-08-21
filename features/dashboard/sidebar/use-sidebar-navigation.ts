"use client";

import { useCallback, useState } from "react";

import { navGroups } from "../routes";
import type { PageKey } from "../types";
import { activeGroupLabelForPage } from "./navigation-logic";

export function useSidebarNavigation(activePage: PageKey) {
  const routeOpenGroup = activeGroupLabelForPage(navGroups, activePage);
  const [groupState, setGroupState] = useState<{
    activePage: PageKey;
    openGroup?: string | null;
  }>(() => ({ activePage }));
  const openGroup =
    groupState.activePage === activePage
      ? groupState.openGroup === undefined
        ? routeOpenGroup
        : groupState.openGroup
      : routeOpenGroup;

  const toggleGroup = useCallback(
    (label: string) => {
      setGroupState((currentState) => {
        const currentOpenGroup =
          currentState.activePage === activePage
            ? currentState.openGroup === undefined
              ? routeOpenGroup
              : currentState.openGroup
            : routeOpenGroup;

        return {
          activePage,
          openGroup: currentOpenGroup === label ? null : label,
        };
      });
    },
    [activePage, routeOpenGroup],
  );

  const isGroupOpen = useCallback(
    (label: string) => openGroup === label,
    [openGroup],
  );

  return { isGroupOpen, toggleGroup };
}
