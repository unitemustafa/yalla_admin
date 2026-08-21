import { ExpandedNavigationItems } from "./expanded-navigation";
import type { ExpandedNavigationProps } from "./types";

export function MobileNavigation(props: ExpandedNavigationProps) {
  return (
    <nav className="no-scrollbar flex h-[calc(100vh-128px)] flex-col justify-between overflow-y-auto overflow-x-hidden px-2 pb-4 lg:hidden">
      <div>
        <ExpandedNavigationItems {...props} />
      </div>
      <div className="pt-4" />
    </nav>
  );
}
