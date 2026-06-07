import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type SectionStatus = "Ready" | "Scaffolded" | "Deferred";

export function SectionPage({
  title,
  eyebrow,
  description,
  status,
  items,
}: {
  title: string;
  eyebrow: string;
  description: string;
  status: SectionStatus;
  items: Array<{
    title: string;
    description: string;
  }>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
            {eyebrow}
          </p>
          <Badge>{status}</Badge>
        </div>
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{item.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
