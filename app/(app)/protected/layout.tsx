import { FoundationShell } from "@/components/layout/foundation-shell";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FoundationShell navHref="/protected">{children}</FoundationShell>;
}
