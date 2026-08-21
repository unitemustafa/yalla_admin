"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { breadcrumbsFromPathname, pageFromPathname } from "./routes";

function useDisclosure(initialOpen = false) {
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
    breadcrumbs: breadcrumbsFromPathname(pathname),
    collapsed,
    mobileNavOpen: sidebar.isOpen,
    closeMobileNav: sidebar.close,
    openMobileNav: sidebar.open,
    toggleCollapsed: useCallback(() => setCollapsed((value) => !value), []),
  };
}
