import {
  ImportBatchCard,
  ImportStatusEmptyState,
  ImportStatusHeader,
  ProviderRaceEntryReadinessCard,
} from "@/components/imports/import-status-display";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { canAccessDataImports } from "@/lib/auth/access-control";
import { loadCurrentProfileContext } from "@/lib/auth/profile-context";
import { listImportBatches } from "@/lib/imports/data-access";
import { getProviderRaceEntryReadinessDisplayModel } from "@/lib/imports/provider-race-entry-readiness";

function DataImportsAccessDenied() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Data imports unavailable</CardTitle>
          <CardDescription>
            Import status and provider readiness details are limited to trusted
            operator and admin roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Your authenticated Strideo workspace is still available, but this
          operational surface is hidden until an internal role is assigned.
        </CardContent>
      </Card>
    </div>
  );
}

export default async function DataImportsPage() {
  const profile = await loadCurrentProfileContext();

  if (!canAccessDataImports(profile)) {
    return <DataImportsAccessDenied />;
  }

  const [result, providerRaceEntryReadiness] = await Promise.all([
    listImportBatches(),
    getProviderRaceEntryReadinessDisplayModel(),
  ]);

  if (result.status === "empty") {
    return (
      <div className="flex flex-col gap-6">
        <ImportStatusHeader summary={result.summary} />
        <ProviderRaceEntryReadinessCard model={providerRaceEntryReadiness} />
        <ImportStatusEmptyState message={result.message} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ImportStatusHeader summary={result.summary} />
      <ProviderRaceEntryReadinessCard model={providerRaceEntryReadiness} />
      <div className="flex flex-col gap-4">
        {result.batches.map((batch) => (
          <ImportBatchCard key={batch.id} batch={batch} />
        ))}
      </div>
    </div>
  );
}
