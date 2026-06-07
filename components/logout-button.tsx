"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const logout = async () => {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  };

  return (
    <Button onClick={logout} disabled={isLoading} size="sm" variant="outline">
      <LogOut aria-hidden="true" className="mr-2 size-4" />
      {isLoading ? "Signing out..." : "Sign out"}
    </Button>
  );
}
