import {
  ImportBatchCard,
  ImportStatusEmptyState,
  ImportStatusHeader,
} from "@/components/imports/import-status-display";
import { listImportBatches } from "@/lib/imports/data-access";

export default async function DataImportsPage() {
  const result = await listImportBatches();

  if (result.status === "empty") {
    return (
      <div className="flex flex-col gap-6">
        <ImportStatusHeader summary={result.summary} />
        <ImportStatusEmptyState message={result.message} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ImportStatusHeader summary={result.summary} />
      <div className="flex flex-col gap-4">
        {result.batches.map((batch) => (
          <ImportBatchCard key={batch.id} batch={batch} />
        ))}
      </div>
    </div>
  );
}
