"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  DatabaseZap,
  LayoutDashboard,
  Settings,
  Target,
  Trophy,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/protected",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/protected/races",
    label: "Races",
    icon: Trophy,
  },
  {
    href: "/protected/predictions",
    label: "Predictions",
    icon: Brain,
  },
  {
    href: "/protected/strategies",
    label: "Strategies",
    icon: Target,
  },
  {
    href: "/protected/data-imports",
    label: "Data Imports",
    icon: DatabaseZap,
  },
  {
    href: "/protected/settings",
    label: "Settings",
    icon: Settings,
  },
] as const;

export function AppSectionNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Strideo sections" className="flex gap-2 overflow-x-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/protected" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon aria-hidden="true" className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
