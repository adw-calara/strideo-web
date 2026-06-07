import Link from "next/link";
import { CircleUser } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { AppSectionNav } from "@/components/navigation/app-section-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/protected" className="text-lg font-semibold">
                Strideo
              </Link>
              <Badge variant="secondary">Dev</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
                <CircleUser aria-hidden="true" className="size-4" />
                <span>{userEmail}</span>
              </div>
              <ThemeSwitcher />
              <LogoutButton />
            </div>
          </div>
          <AppSectionNav />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-col px-5 py-6">
        {children}
      </div>
    </main>
  );
}
