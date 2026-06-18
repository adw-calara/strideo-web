"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  DatabaseZap,
  LayoutDashboard,
  ListChecks,
  Menu,
  Signal,
  Settings,
  Target,
  Trophy,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/protected",
    label: "Dashboard",
    icon: LayoutDashboard,
    mobileRole: "secondary",
  },
  {
    href: "/protected/races",
    label: "Races",
    icon: Trophy,
    mobileRole: "primary",
  },
  {
    href: "/protected/opportunities",
    label: "Opportunities",
    icon: Signal,
    mobileRole: "primary",
  },
  {
    href: "/protected/predictions",
    label: "Predictions",
    icon: Brain,
    mobileRole: "secondary",
  },
  {
    href: "/protected/strategies",
    label: "Strategies",
    icon: Target,
    mobileRole: "secondary",
  },
  {
    href: "/protected/progress",
    label: "Progress",
    icon: ListChecks,
    mobileRole: "secondary",
  },
  {
    href: "/protected/data-imports",
    label: "Data Imports",
    icon: DatabaseZap,
    mobileRole: "internal",
  },
  {
    href: "/protected/settings",
    label: "Settings",
    icon: Settings,
    mobileRole: "secondary",
  },
] as const;

type NavItem = (typeof navItems)[number];

function isActivePath(pathname: string, href: NavItem["href"]) {
  return pathname === href || (href !== "/protected" && pathname.startsWith(href));
}

function NavLink({
  item,
  isActive,
  className,
  showLabel = true,
}: {
  item: NavItem;
  isActive: boolean;
  className?: string;
  showLabel?: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-md border text-sm font-medium transition-colors",
        isActive
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className,
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon aria-hidden="true" className="size-4" />
      {showLabel ? item.label : null}
    </Link>
  );
}

export function AppSectionNav({
  showDataImports = false,
}: {
  showDataImports?: boolean;
}) {
  const pathname = usePathname();
  const visibleNavItems = navItems.filter(
    (item) => showDataImports || item.href !== "/protected/data-imports",
  );
  const primaryMobileItems = visibleNavItems.filter(
    (item) => item.mobileRole === "primary",
  );
  const secondaryMobileItems = visibleNavItems.filter(
    (item) => item.mobileRole !== "primary",
  );

  return (
    <>
      <nav
        aria-label="Strideo sections"
        className="hidden gap-2 overflow-x-auto md:flex"
      >
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isActivePath(pathname, item.href)}
            className="h-9 px-3"
          />
        ))}
      </nav>

      <div className="flex items-center justify-between gap-3 md:hidden">
        <NavLink
          item={navItems[0]}
          isActive={isActivePath(pathname, navItems[0].href)}
          className="h-11 px-3"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-11 px-3">
              <Menu aria-hidden="true" className="size-4" />
              More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {secondaryMobileItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(pathname, item.href);

              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex min-h-11 items-center gap-2",
                      isActive && "font-medium",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav
        aria-label="Primary Strideo sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur md:hidden"
      >
        <div className="mx-auto flex min-h-16 max-w-md px-3">
          {primaryMobileItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon aria-hidden="true" className="size-5" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
