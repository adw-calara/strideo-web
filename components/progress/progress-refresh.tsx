"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

const REFRESH_INTERVAL_SECONDS = 30;

export function ProgressRefresh({ generatedAt }: { generatedAt: string }) {
  const router = useRouter();
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(
    REFRESH_INTERVAL_SECONDS,
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsUntilRefresh((current) => {
        if (current <= 1) {
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (secondsUntilRefresh !== 0) {
      return;
    }

    router.refresh();
    setSecondsUntilRefresh(REFRESH_INTERVAL_SECONDS);
  }, [router, secondsUntilRefresh]);

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
      <span>
        Last updated{" "}
        {new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        }).format(new Date(generatedAt))}
      </span>
      <span>Refresh in {secondsUntilRefresh}s</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setSecondsUntilRefresh(REFRESH_INTERVAL_SECONDS);
          router.refresh();
        }}
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        Refresh
      </Button>
    </div>
  );
}
