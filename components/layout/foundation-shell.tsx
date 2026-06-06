import { FoundationNav } from "@/components/navigation/foundation-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function FoundationShell({
  children,
  navHref = "/",
}: {
  children: React.ReactNode;
  navHref?: string;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <FoundationNav href={navHref} />
      <div className="flex w-full max-w-5xl flex-1 flex-col px-5 py-12">
        {children}
      </div>
      <footer className="flex w-full items-center justify-center gap-8 border-t py-10 text-center text-xs text-muted-foreground">
        <p>Supabase Auth enabled</p>
        <ThemeSwitcher />
      </footer>
    </main>
  );
}
