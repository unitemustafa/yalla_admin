"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { breadcrumbsFromPathname, navGroups, pageFromPathname } from "./data";
import type { PageKey } from "./types";

export function useDisclosure(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return {
    isOpen,
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => setIsOpen(false), []),
    toggle: useCallback(() => setIsOpen((value) => !value), []),
  };
}

export function useDashboardFrame() {
  const pathname = usePathname();
  const activePage = useMemo(() => pageFromPathname(pathname), [pathname]);
  const sidebar = useDisclosure(false);
  const [collapsed, setCollapsed] = useState(false);

  return {
    activePage,
    breadcrumbs: breadcrumbsFromPathname(pathname, activePage),
    collapsed,
    mobileNavOpen: sidebar.isOpen,
    closeMobileNav: sidebar.close,
    openMobileNav: sidebar.open,
    toggleCollapsed: useCallback(() => setCollapsed((value) => !value), []),
  };
}

function activeGroupLabelForPage(activePage: PageKey) {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.children?.some((child) => child.page === activePage)) {
        return item.label;
      }
    }
  }

  return null;
}

export function useSidebarGroups(activePage: PageKey) {
  const routeOpenGroup = activeGroupLabelForPage(activePage);
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

  const toggleGroup = useCallback((label: string) => {
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
  }, [activePage, routeOpenGroup]);

  const isGroupOpen = useCallback(
    (label: string) => openGroup === label,
    [openGroup],
  );

  return { isGroupOpen, toggleGroup };
}

export function useItemTableState() {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const deleteDialog = useDisclosure(false);

  return {
    openRow,
    deleteOpen: deleteDialog.isOpen,
    closeDelete: deleteDialog.close,
    openDelete: deleteDialog.open,
    toggleRow: useCallback((rowId: string) => {
      setOpenRow((currentRow) => (currentRow === rowId ? null : rowId));
    }, []),
  };
}

export function useMountedOnFrame() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return mounted;
}
